import os
import re
import cv2
import json
import logging
import tempfile
import numpy as np
import platform
import shutil
import glob
from PIL import Image
import pdfplumber
import subprocess
from pdf2image import convert_from_path
try:
    from paddleocr import PaddleOCR
except ImportError:
    PaddleOCR = None

try:
    from paddleocr import PPStructure
except ImportError:
    PPStructure = None
from bs4 import BeautifulSoup
import pandas as pd
import requests

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class AdvancedBillPipeline:
    def __init__(self, poppler_path=None, emission_factors=None):
        """
        Initialize the advanced unified pipeline.
        """
        self.poppler_path = poppler_path
        self.emission_factors = emission_factors or {
            "electricity": 0.82,
            "fuel": 2.31,
            "png_gas": 2.1,
            "lpg": 42.6,
            "water": 0.5
        }
        
        logging.info("Initializing PaddleOCR...")
        try:
            self.ocr = PaddleOCR(lang='en', show_log=False) if PaddleOCR else None
            self.table_engine = PPStructure(show_log=False) if PPStructure else None
            logging.info("PaddleOCR and PPStructure initialization attempted.")
        except Exception as e:
            logging.error(f"Failed to initialize PaddleOCR: {e}")
            self.ocr = None
            self.table_engine = None

    def _convert_to_image(self, file_path):
        """Convert PDF or Image to an OpenCV image."""
        ext = file_path.lower().split('.')[-1]
        if ext in ['pdf']:
            images = convert_from_path(file_path, dpi=300, poppler_path=self.poppler_path)
            if not images:
                raise ValueError("No images extracted from PDF.")
            # Convert first page to OpenCV format
            open_cv_image = np.array(images[0])
            if len(open_cv_image.shape) == 3:
                return cv2.cvtColor(open_cv_image, cv2.COLOR_RGB2BGR)
            return open_cv_image
        else:
            img = cv2.imread(file_path)
            if img is None:
                raise ValueError("Failed to read image.")
            return img

    def preprocess_image(self, image):
        """Advanced image preprocessing using OpenCV."""
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
            
        denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
        binary = cv2.adaptiveThreshold(denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                       cv2.THRESH_BINARY, 11, 2)
        return binary

    def run_paddle_ocr(self, image):
        """Extract text using PaddleOCR v2.7+."""
        if not self.ocr:
            return ""
        
        try:
            results = self.ocr.ocr(image, cls=True)
            if not results or not results[0]:
                return ""
            
            lines = []
            for page in results:
                if not page: continue
                for line in page:
                    lines.append(line[1][0])
            return "\n".join(lines)
        except Exception as e:
            logging.error(f"PaddleOCR extraction failed: {e}")
            return ""

    def run_paddle_layout(self, image):
        """Extract table data using PP-Structure."""
        if not self.table_engine:
            return []
        
        try:
            result = self.table_engine(image)
            table_data = []
            for region in result:
                if region['type'] == 'table':
                    res = region['res']
                    if 'html' in res:
                        table_data.append(res['html'])
            return table_data
        except Exception as e:
            logging.error(f"Layout detection failed: {e}")
            return []

    def classify_bill(self, text):
        """Classify bill type based on keywords."""
        t = text.lower()
        
        keywords = {
            "electricity": [
                "electricity", "power", "kwh", "meter", "energy", "unit", "voltage", 
                "msedcl", "adani", "tata power", "besl", "sbpdcl", "nbpdcl", "cesc",
                "uppcl", "dhbvn", "uhbvn", "tneb", "kseb", "mseb", "billed units",
                "consumer", "single phase", "three phase", "domestic service", "connected load"
            ],
            "fuel": ["fuel", "petrol", "diesel", "gas station", "liters", "ltr", "dispenser", "hpcl", "bpcl", "iocl", "reliance petroleum", "quantity"],
            "png_gas": ["png", "gas bill", "scm", "gas consumption", "natural gas", "igary", "mahanagar gas", "mgl", "adlani gas", "units consumed"],
            "lpg": ["lpg", "cylinder", "cooking gas", "gas connection", "refill", "indane", "bharat gas", "hp gas", "cash memo"],
            "water": ["water bill", "water usage", "kl", "kiloliter", "water meter", "bmc", "djb", "hmwssb", "bwssb", "pune municipal", "usage kl"]
        }
        
        scores = {k: sum(2 if kw in t else 0 for kw in v) for k, v in keywords.items()}
        
        # Add weights for specific strong keywords
        if "kwh" in t: scores["electricity"] += 5
        if "scm" in t: scores["png_gas"] += 5
        if "kl" in t: scores["water"] += 5
        if "cylinder" in t or "lpg" in t: scores["lpg"] += 5
        if "liters" in t or "ltr" in t: scores["fuel"] += 5
        if "(ok)" in t: scores["electricity"] += 3 
        if "single phase" in t or "urban" in t: scores["electricity"] += 2

        best_type = max(scores, key=scores.get)
        
        if scores[best_type] == 0:
            return "unknown"
            
        return best_type

    def _extract_sequence_match(self, text):
        """
        Strategy 1: Windowed Sequence Matching (A - B = C).
        Strip years and dates first.
        """
        # Strip years and dates
        clean = re.sub(r"\d{2}[/\-]\d{2}[/\-]\d{2,4}", " ", text)
        clean = re.sub(r"201[89]|202[0-6]", " ", clean)
        
        numbers = re.findall(r"(\d+(?:\.\d+)?)", clean)
        if len(numbers) < 3: return None
        
        vals = [float(n) for n in numbers]
        candidates = []
        window_size = 15 # Larger window for complex layouts
        for i in range(len(vals)):
            for j in range(i + 1, min(i + window_size, len(vals))):
                for k in range(j + 1, min(i + window_size, len(vals))):
                    v1, v2, v3 = vals[i], vals[j], vals[k]
                    # Check if any combination works: v1-v2=v3, v1-v3=v2, v2-v3=v1
                    # The Units (Consumption) is always the result of the subtraction.
                    if v1 > 1 and v2 > 1 and v3 > 1:
                        res = None
                        if abs(v1 - v2 - v3) < 0.1: res = v3
                        elif abs(v1 - v3 - v2) < 0.1: res = v2
                        elif abs(v2 - v3 - v1) < 0.1: res = v1
                        
                        if res and 5 < res < 50000 and not (2018 <= res <= 2026):
                            # Score based on how 'reading-like' (large) the input numbers are
                            score = max(v1, v2)
                            candidates.append((res, score))
        
        if not candidates: return None
        # Return the candidate associated with the highest reading values
        candidates.sort(key=lambda x: x[1], reverse=True)
        return candidates[0][0]

    def _extract_from_tables(self, tables, bill_type):
        """Strategy 0: Extract from structured tables (highest accuracy)."""
        keywords = {
            "electricity": ["units", "kwh", "consumption", "units consumed", "billed units", "energy consumed"],
            "fuel": ["liters", "volume", "quantity", "qty", "amount(l)"],
            "water": ["kl", "kiloliters", "consumption", "usage"],
            "png_gas": ["scm", "usage", "consumption"],
            "lpg": ["cylinder", "refill", "quantity"]
        }
        target_kws = keywords.get(bill_type, [])
        
        for html in tables:
            try:
                soup = BeautifulSoup(html, 'html.parser')
                table = soup.find('table')
                if not table: continue
                
                # Convert HTML table to list of lists for easier processing
                data = []
                for row in table.find_all('tr'):
                    data.append([cell.get_text().strip().lower() for cell in row.find_all(['td', 'th'])])
                
                if not data: continue
                
                # Try to find header column index
                header_idx = -1
                for i, cell_text in enumerate(data[0]):
                    if any(kw in cell_text for kw in target_kws):
                        header_idx = i
                        break
                
                if header_idx != -1:
                    # Look in the first 3 rows (usually current entry is top)
                    for row_idx in range(1, min(4, len(data))):
                        row = data[row_idx]
                        if len(row) > header_idx:
                            val_str = row[header_idx]
                            m = re.search(r"(\d+(?:\.\d+)?)", val_str)
                            if m:
                                val = float(m.group(1))
                                if 5 < val < 50000: return val
            except Exception as e:
                logging.warning(f"Failed to parse table HTML: {e}")
        return None

    def extract_data(self, image, text, bill_type):
        """
        Robust Local Extraction using prioritized strategies.
        """
        clean_text = text.replace(',', '')
        lines = clean_text.split('\n')
        
        # Strategy 0: Table Structural Extraction
        tables = self.run_paddle_layout(image)
        table_val = self._extract_from_tables(tables, bill_type)
        if table_val:
            logging.info(f"✓ Extracted via Table Engine: {table_val}")
            return table_val

        candidates = []

        # Strategy 1: ' (OK)' Marker (Highest confidence for Indian bill history)
        # Often looks like "134 (OK)" or "197 (PA)"
        ok_matches = re.findall(r"(\d+(?:\.\d+)?)\s*\((?:ok|0k|pa|oa|ck)\)", clean_text.lower())
        if ok_matches:
            # Pick first non-year value
            for val_str in ok_matches:
                val = float(val_str)
                if 10 < val < 50000 and not (2018 <= val <= 2026):
                    logging.info(f"✓ Extracted via OK marker: {val}")
                    return val

        # Strategy 2: Contextual Keyword Proximity (High Confidence)
        # Look for "Total", "Current", "Consumption" followed by a number
        context_kws = {
            "electricity": ["total", "current", "billed", "consumption", "usage", "net units", "units"],
            "fuel": ["liters", "volume", "quantity", "qty", "amount", "total"],
            "water": ["kl", "kiloliters", "consumption", "usage", "total", "units"],
            "png_gas": ["scm", "usage", "consumption", "total", "units"],
            "lpg": ["cylinder", "cyl", "refill", "quantity", "qty", "total"]
        }
        
        target_ckws = context_kws.get(bill_type, ["total", "usage", "units"])
        for i, line in enumerate(lines):
            line_lower = line.lower()
            if any(ckw in line_lower for ckw in target_ckws):
                # Search for number in this line or next 6 lines
                for j in range(7):
                    if i + j < len(lines):
                        all_nums = re.findall(r"(\d+(?:\.\d+)?)", lines[i+j])
                        for val_str in all_nums:
                            val = float(val_str)
                            
                            # Validation based on type
                            is_valid = False
                            if bill_type == "lpg":
                                if 1 <= val <= 10: is_valid = True # Usually 1 or 2 cylinders
                            elif bill_type == "fuel":
                                if 1 <= val <= 200: is_valid = True
                            elif bill_type == "water":
                                if 1 <= val <= 1000: is_valid = True
                            else: # Electricity, PNG
                                if 10 <= val <= 50000 and not (2018 <= val <= 2026): is_valid = True
                            
                            if is_valid:
                                # Boost score if it's near the top of the page
                                pos_boost = max(0, 15 - (i / 10))
                                candidates.append((val, 110 + pos_boost))
                                break
                        else: continue
                        break

        # Strategy 2: Sequence Matching
        seq_val = self._extract_sequence_match(clean_text)
        if seq_val: candidates.append((seq_val, 105))

        # Strategy 3: Tabular Multi-line Row Matching
        if bill_type == "electricity":
            months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
            for i, line in enumerate(lines):
                line_lower = line.lower()
                if any(m in line_lower for m in months):
                    # Look for number in current or next 2 lines
                    target_num = None
                    for j in range(3):
                        if i + j < len(lines):
                            next_nums = re.findall(r"(\d+(?:\.\d+)?)", lines[i+j])
                            for val_str in next_nums:
                                val = float(val_str)
                                if 10 < val < 55000 and not (2018 <= val <= 2026):
                                    target_num = val
                                    break
                            if target_num: break
                    
                    if target_num:
                        # Prefer earlier months found in text (usually current bill is top)
                        candidates.append((target_num, 100 - (i / 20)))
                        break 

        # Strategy 4: Strict Regex Patterns
        regex_patterns = {
            "electricity": [
                r"(?i)(?:units|consumption|billed\s*units|kwh|energy\s*consumed)[\s\:\-\.\n]*(\d+(?:\.\d+)?)",
                r"(\d+(?:\.\d+)?)\s*(?:kwh|units|unit\b)"
            ],
            "fuel": [
                r"(?i)(?:liters|ltr|lts|volume|quantity|qty|amount\(l\))[\s\:\-\.\n]*(\d+(?:\.\d+)?)",
                r"(\d+(?:\.\d+)?)\s*(?:liters|ltr|lts|l\b)"
            ],
            "water": [
                r"(?i)(?:kl|kiloliters|consumption|usage|total)[\s\:\-\.\n]*(\d+(?:\.\d+)?)", 
                r"(\d+(?:\.\d+)?)\s*(?:kl|kiloliters|units)"
            ],
            "png_gas": [
                r"(?i)(?:scm|consumption|usage|total)[\s\:\-\.\n]*(\d+(?:\.\d+)?)", 
                r"(\d+(?:\.\d+)?)\s*(?:scm|units)"
            ],
            "lpg": [
                r"(?i)(?:cylinder|cyl|refill|quantity|qty)[\s\:\-\.\n]*(\d+(?:\.\d+)?)", 
                r"(\d+(?:\.\d+)?)\s*(?:cylinder|cyl|nos)"
            ]
        }
        for pattern in regex_patterns.get(bill_type, []):
            for match in re.finditer(pattern, clean_text):
                val = float(match.group(1))
                if 5 < val < 50000 and not (2018 <= val <= 2026):
                    candidates.append((val, 90))

        if not candidates: return None

        # Sort by confidence
        candidates.sort(key=lambda x: x[1], reverse=True)
        best_val = candidates[0][0]
        logging.info(f"✓ Final Decision: {best_val} derived from best of {len(candidates)} candidates.")
        return best_val

    def validate_with_gemini(self, text, paddle_usage, paddle_bill_type, file_path=None):
        """
        Secondary validation using Gemini via OpenRouter API or Google API.
        Extracts only amount, units, year to preserve privacy.
        """
        import base64
        import requests
        import json
        
        encoded_string = ""
        mime_type = "image/jpeg"
        if file_path:
            try:
                with open(file_path, "rb") as image_file:
                    encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
                if file_path.lower().endswith(".png"): mime_type = "image/png"
                elif file_path.lower().endswith(".pdf"): mime_type = "application/pdf"
            except Exception as read_err:
                logging.error(f"Failed to read image for vision API: {read_err}")

        prompt = f"""Extract the following details from the OCR text or image below:
- bill_type (e.g., Electricity, Gas, Water, Fuel, LPG)
- usage_amount (numeric float only, no units. Use 0.0 if not found)
- usage_units (e.g., kWh, SCM, Liters, KL)
- billing_year (YYYY format)
- monthly_history: History of consumption (if available on the bill, e.g., past months' usage). Return as an array of objects: [{{"month": "Jan", "year": "2024", "usage_amount": 100.5}}]. If none, return [].

CRITICAL PRIVACY REQUIREMENT: DO NOT output, store, or analyze any Personally Identifiable Information (PII) like names, addresses, or account numbers.

Respond ONLY with a valid JSON object in this format:
{{"bill_type": "...", "usage_amount": 0.0, "usage_units": "...", "billing_year": "...", "monthly_history": []}}

OCR TEXT (if available):
{text[:1500] if text else "None"}
"""
        
        gemini_key = os.getenv("GEMINI_API_KEY")
        openrouter_key = os.getenv("OPENROUTER_API_KEY")
        
        if not openrouter_key and not gemini_key:
            logging.warning("No API keys found. Skipping Gemini validation.")
            return paddle_usage, paddle_bill_type, []
            
        try:
            if gemini_key:
                logging.info("Calling Direct Gemini Vision API...")
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}"
                parts = [{"text": prompt}]
                if encoded_string:
                    parts.append({"inline_data": {"mime_type": mime_type, "data": encoded_string}})
                
                payload = {"contents": [{"parts": parts}]}
                headers = {"Content-Type": "application/json"}
                
                response = requests.post(url, json=payload, headers=headers, timeout=25)
                if response.status_code == 200:
                    data = response.json()
                    content = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    content = content.replace("```json", "").replace("```", "").strip()
                    try:
                        res = json.loads(content)
                        gemini_usage = float(res.get("usage_amount", 0))
                        gemini_type = res.get("bill_type", "unknown").lower()
                        monthly_history = res.get("monthly_history", [])
                        
                        matched_type = paddle_bill_type if paddle_bill_type != "unknown" else "unknown"
                        if "electricity" in gemini_type: matched_type = "electricity"
                        elif "fuel" in gemini_type: matched_type = "fuel"
                        elif "water" in gemini_type: matched_type = "water"
                        elif "lpg" in gemini_type: matched_type = "lpg"
                        elif "gas" in gemini_type or "png" in gemini_type: matched_type = "png_gas"
                        
                        if gemini_usage > 0 and abs(gemini_usage - (paddle_usage or 0)) > 0.1:
                            return gemini_usage, matched_type, monthly_history
                        return paddle_usage or gemini_usage, matched_type, monthly_history
                    except json.JSONDecodeError:
                        logging.error(f"Failed to parse Direct Gemini JSON: {content}")
                else:
                    logging.warning(f"Direct Gemini API error: {response.text}")

            if openrouter_key:
                url = "https://openrouter.ai/api/v1/chat/completions"
                user_content = [{"type": "text", "text": prompt}]
                if encoded_string:
                    user_content.append({"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{encoded_string}"}})
                    
                payload = {
                    "messages": [
                        {"role": "system", "content": "You are a precise data extraction assistant."},
                        {"role": "user", "content": user_content}
                    ],
                    "temperature": 0.1
                }
                
                models_to_try = ["google/gemini-2.0-flash-exp:free", "google/gemini-2.5-flash", "google/gemini-2.0-flash-001"]
                for model in models_to_try:
                    payload["model"] = model
                    headers = {"Authorization": f"Bearer {openrouter_key}", "Content-Type": "application/json"}
                    logging.info(f"Calling OpenRouter ({model})...")
                    
                    response = requests.post(url, json=payload, headers=headers, timeout=20)
                    if response.status_code == 200:
                        data = response.json()
                        if "choices" in data and len(data["choices"]) > 0:
                            content = data["choices"][0].get("message", {}).get("content", "").strip()
                            content = content.replace("```json", "").replace("```", "").strip()
                            try:
                                res = json.loads(content)
                                gemini_usage = float(res.get("usage_amount", 0))
                                gemini_type = res.get("bill_type", "unknown").lower()
                                monthly_history = res.get("monthly_history", [])
                                
                                matched_type = paddle_bill_type if paddle_bill_type != "unknown" else "unknown"
                                if "electricity" in gemini_type: matched_type = "electricity"
                                elif "fuel" in gemini_type: matched_type = "fuel"
                                elif "water" in gemini_type: matched_type = "water"
                                elif "lpg" in gemini_type: matched_type = "lpg"
                                elif "gas" in gemini_type or "png" in gemini_type: matched_type = "png_gas"
                                
                                if gemini_usage > 0 and abs(gemini_usage - (paddle_usage or 0)) > 0.1:
                                    return gemini_usage, matched_type, monthly_history
                                return paddle_usage or gemini_usage, matched_type, monthly_history
                            except json.JSONDecodeError:
                                logging.error(f"Failed to parse OpenRouter JSON: {content}")
                                continue
                        break
                    else:
                        logging.warning(f"OpenRouter API error: {response.text[:100]}")
                        continue
        
        except Exception as e:
            logging.error(f"Gemini validation failed: {e}")
            
        return paddle_usage or 0.0, paddle_bill_type or "unknown", []

    def get_scope(self, bill_type):
        """Standardized scoping logic."""
        scopes = {
            "fuel": "Scope 1",
            "png_gas": "Scope 1",
            "lpg": "Scope 1",
            "electricity": "Scope 2",
            "water": "Scope 3",
            "unknown": "Scope 3"
        }
        return scopes.get(bill_type, "Scope 3")

    def process(self, file_path):
        """Main pipeline orchestration."""
        try:
            # 1. Load and Preprocess
            image = self._convert_to_image(file_path)
            processed = self.preprocess_image(image)
            
            # 2. OCR
            text = self.run_paddle_ocr(image) # Use original for OCR
            if not text:
                logging.warning("PaddleOCR failed to extract text locally. Proceeding to AI extraction.")
                text = ""
            
            # 3. Classify
            bill_type = self.classify_bill(text) if text else "unknown"
            
            # 4. Extract Usage (Local PaddleOCR)
            paddle_usage = self.extract_data(image, text, bill_type) if text else 0.0
            if paddle_usage is None:
                paddle_usage = 0.0 # Proceed to Gemini as fallback if local extraction failing
                logging.warning(f"Local usage extraction failed for {bill_type}. Attempting Gemini validation fallback.")
            
            # 5. Validate with Gemini
            final_usage, final_bill_type, monthly_history = self.validate_with_gemini(text, paddle_usage, bill_type, file_path)
            
            if final_usage <= 0:
                pass # Still continue if history is there
                
            # Compute CO2e for history
            factor = self.emission_factors.get(final_bill_type, 0.82)
            
            if isinstance(monthly_history, list):
                for hist in monthly_history:
                    amt = float(hist.get("usage_amount", 0))
                    hist["co2e_kg"] = round(amt * factor, 2)
            
            # 6. Scoping & Emissions
            scope = self.get_scope(final_bill_type)
            factor = self.emission_factors.get(final_bill_type, 0.82)
            emissions = round(final_usage * factor, 2)
            
            return {
                "status": "success",
                "bill_type": final_bill_type,
                "scope": scope,
                "usage_value": final_usage,
                "unit": self._get_unit(final_bill_type),
                "carbon_emissions_kgCO2": emissions,
                "metadata": {
                    "source": "AdvancedBillPipeline", 
                    "monthly_history": monthly_history
                }
            }
            
        except Exception as e:
            logging.error(f"Pipeline process failed: {e}")
            return {"status": "error", "message": str(e)}

    def _get_unit(self, bill_type):
        units = {"electricity": "kWh", "fuel": "Liters", "water": "KL", "png_gas": "SCM", "lpg": "Cylinders"}
        return units.get(bill_type, "units")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        pipeline = AdvancedBillPipeline()
        print(json.dumps(pipeline.process(sys.argv[1]), indent=4))
