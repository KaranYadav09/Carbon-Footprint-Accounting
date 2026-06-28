import os
import re
import platform
import shutil
import glob
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter
from pdf2image import convert_from_path
import cv2
import numpy as np
import pdfplumber
from paddleocr import PaddleOCR
import io
from datetime import datetime

# Initialize PaddleOCR (v5/PaddleX)
try:
    ocr = PaddleOCR(lang='en')
    print("[OK] PaddleOCR v5 initialized successfully")
except Exception as e:
    print(f"[ERROR] PaddleOCR initialization failed: {e}")
    ocr = None

# Initialize Table Engine (PPStructure)
try:
    from paddleocr import PPStructure
    table_engine = PPStructure(show_log=False)
    print("[OK] PPStructure initialized successfully")
except Exception as e:
    print(f"[WARN] Warning: PPStructure initialization failed: {e}")
    table_engine = None
# -------------------------------------------------
# CONFIG: Auto-detect Poppler paths
# -------------------------------------------------

def _find_poppler_path():
    """Find Poppler bin directory"""
    system = platform.system()
    
    if system == "Windows":
        # Common Windows installation paths for Poppler
        possible_paths = [
            r"C:\Users\ayush\Downloads\poppler-25.12.0\Library\bin",
            r"C:\Program Files (x86)\poppler\bin",
            r"C:\poppler\bin",
            r"C:\poppler-*\bin",  # For versioned installations
            r"D:\Program Files\poppler\bin",
            r"D:\Program Files (x86)\poppler\bin",
            r"D:\poppler\bin",
            # Check user's local installations
            os.path.join(os.path.expanduser("~"), "poppler", "bin"),
            os.path.join(os.path.expanduser("~"), ".poppler", "bin"),
        ]
        
        # Also check for versioned poppler directories
        for program_dir in [r"C:\Program Files", r"C:\Program Files (x86)"]:
            if os.path.exists(program_dir):
                for item in os.listdir(program_dir):
                    if "poppler" in item.lower():
                        poppler_path = os.path.join(program_dir, item, "bin")
                        if os.path.exists(poppler_path):
                            possible_paths.insert(0, poppler_path)
        
        # Check each path
        for path in possible_paths:
            # Handle wildcards
            if "*" in path:
                matches = glob.glob(path)
                for match in matches:
                    if os.path.exists(match) and os.path.exists(os.path.join(match, "pdftoppm.exe")):
                        return match
            else:
                if os.path.exists(path) and os.path.exists(os.path.join(path, "pdftoppm.exe")):
                    return path
        
        # Check if pdftoppm is in PATH
        pdftoppm_in_path = shutil.which("pdftoppm")
        if pdftoppm_in_path:
            return os.path.dirname(pdftoppm_in_path)
    else:
        # Linux/Mac - check common locations
        possible_paths = [
            "/usr/bin",
            "/usr/local/bin",
            "/opt/homebrew/bin",
            "/usr/lib/poppler/bin",
        ]
        
        for path in possible_paths:
            if os.path.exists(os.path.join(path, "pdftoppm")):
                return path
        
        # Check PATH
        pdftoppm_in_path = shutil.which("pdftoppm")
        if pdftoppm_in_path:
            return os.path.dirname(pdftoppm_in_path)
    
    return None

# 2) Find and set Poppler path
POPPLER_PATH = _find_poppler_path()
if POPPLER_PATH:
    print(f"[OK] Poppler found at: {POPPLER_PATH}")
else:
    print("[WARN] Warning: Poppler not found. PDF processing will not work.")
    if platform.system() == "Windows":
        print("   Download from: https://github.com/oschwartz10612/poppler-windows/releases")
        print("   Or install via: choco install poppler")
        print("   Extract and add the 'bin' folder to PATH or update POPPLER_PATH in services.py")
    else:
        print("   Ubuntu/Debian: sudo apt-get install poppler-utils")
        print("   macOS: brew install poppler")
    POPPLER_PATH = ""  # Will cause PDF processing to fail gracefully

# Initialize Advanced OCR Pipeline globally
try:
    from advanced_bill_pipeline import AdvancedBillPipeline
    advanced_pipeline = AdvancedBillPipeline(poppler_path=POPPLER_PATH)
    print("AdvancedBillPipeline initialized successfully")
except Exception as e:
    print(f"Warning: AdvancedBillPipeline initialization failed: {e}")
    advanced_pipeline = None

# -------------------------------------------------
# Emission factors
# -------------------------------------------------
EMISSION_FACTOR_ELECTRICITY_KWH = 0.82    # kg CO2 per kWh
EMISSION_FACTOR_FUEL_LITER = 2.31         # kg CO2 per liter petrol
EMISSION_FACTOR_PNG_SCM = 2.1             # kg CO2 per SCM (PNG gas)
EMISSION_FACTOR_LPG_CYLINDER = 42.6       # kg CO2 per 14.2kg cylinder
EMISSION_FACTOR_WATER_KL = 0.5            # kg CO2 per KL water

# --- Scope 3 Management (Equipment & Furniture) ---
# Typical values chosen from provided ranges
EMISSION_FACTOR_SCOPE3_DESKTOP = 300.0
EMISSION_FACTOR_SCOPE3_MONITOR = 215.0
EMISSION_FACTOR_SCOPE3_DESKTOP_COMBINED = 525.0
EMISSION_FACTOR_SCOPE3_KEYBOARD = 6.5
EMISSION_FACTOR_SCOPE3_MOUSE = 3.0
EMISSION_FACTOR_SCOPE3_ROUTER = 22.5
EMISSION_FACTOR_SCOPE3_NETWORK_SWITCH = 42.5
EMISSION_FACTOR_SCOPE3_TABLE = 45.0
EMISSION_FACTOR_SCOPE3_CHAIR = 35.0
EMISSION_FACTOR_SCOPE3_PRINTER = 80.0
EMISSION_FACTOR_SCOPE3_SCANNER = 60.0
EMISSION_FACTOR_SCOPE3_UPS = 85.0

# Centralized Activity Mapping for calculations
ACTIVITY_EMISSION_FACTORS = {
    "electricity usage": EMISSION_FACTOR_ELECTRICITY_KWH,
    "water usage": EMISSION_FACTOR_WATER_KL,
    "fuel usage (petrol/diesel)": EMISSION_FACTOR_FUEL_LITER,
    "png gas consumption": EMISSION_FACTOR_PNG_SCM,
    "lpg cylinder consumption": EMISSION_FACTOR_LPG_CYLINDER,
    
    # Scope 3
    "desktop computer": EMISSION_FACTOR_SCOPE3_DESKTOP,
    "monitor": EMISSION_FACTOR_SCOPE3_MONITOR,
    "desktop combined": EMISSION_FACTOR_SCOPE3_DESKTOP_COMBINED,
    "keyboard": EMISSION_FACTOR_SCOPE3_KEYBOARD,
    "mouse": EMISSION_FACTOR_SCOPE3_MOUSE,
    "router": EMISSION_FACTOR_SCOPE3_ROUTER,
    "network switch": EMISSION_FACTOR_SCOPE3_NETWORK_SWITCH,
    "office table": EMISSION_FACTOR_SCOPE3_TABLE,
    "office chair": EMISSION_FACTOR_SCOPE3_CHAIR,
    "laser printer": EMISSION_FACTOR_SCOPE3_PRINTER,
    "scanner": EMISSION_FACTOR_SCOPE3_SCANNER,
    "ups (1-2 kva)": EMISSION_FACTOR_SCOPE3_UPS
}

# Scope categorization
ACTIVITY_SCOPES = {
    "electricity usage": "Scope 2",
    "water usage": "Scope 3",
    "fuel usage (petrol/diesel)": "Scope 1",
    "png gas consumption": "Scope 1",
    "lpg cylinder consumption": "Scope 1",
    
    # Scope 3 (Equipment)
    "desktop computer": "Scope 3",
    "monitor": "Scope 3",
    "desktop combined": "Scope 3",
    "keyboard": "Scope 3",
    "mouse": "Scope 3",
    "router": "Scope 3",
    "network switch": "Scope 3",
    "office table": "Scope 3",
    "office chair": "Scope 3",
    "laser printer": "Scope 3",
    "scanner": "Scope 3",
    "ups (1-2 kva)": "Scope 3"
}

def normalize_activity_type(activity_type: str) -> str:
    """Normalize activity name for consistent mapping."""
    if not activity_type: return ""
    
    # Normalize: lowercase, strip, remove underscores, remove multiple spaces
    norm = activity_type.lower().strip()
    norm = norm.replace("_", " ")
    norm = re.sub(r'\s+', ' ', norm)
    
    # Common synonyms mapping
    synonyms = {
        "png usage": "png gas consumption",
        "png gasusage": "png gas consumption",
        "png gas usage": "png gas consumption",
        "png gasconsumption": "png gas consumption",
        "electricity": "electricity usage",
        "fuel": "fuel usage (petrol/diesel)",
        "lpg": "lpg cylinder consumption",
        "water": "water usage"
    }
    
    # Direct replacement or search for keywords
    if norm in synonyms:
        return synonyms[norm]
        
    # Pattern matching for fuzzy synonyms
    if "png" in norm and ("usage" in norm or "consumption" in norm):
        return "png gas consumption"
    if "fuel" in norm:
        return "fuel usage (petrol/diesel)"
    if "electricity" in norm:
        return "electricity usage"
    if "lpg" in norm:
        return "lpg cylinder consumption"
    if "water" in norm:
        return "water usage"
        
    return norm

def get_scope_for_activity(activity_type: str) -> str:
    """Helper to get scope for any activity type."""
    norm_type = normalize_activity_type(activity_type)
    return ACTIVITY_SCOPES.get(norm_type, "Scope 3")



# -------------------------------------------------
# Helper: Image preprocessing for better OCR
# -------------------------------------------------
def _preprocess_image_for_ocr(img: Image.Image) -> Image.Image:
    try:
        # Try OpenCV-based preprocessing first (better results)
        try:
            # Convert PIL to OpenCV format
            img_array = np.array(img)
            
            # Convert RGB to BGR if needed
            if len(img_array.shape) == 3 and img_array.shape[2] == 3:
                img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
            
            # Convert to grayscale
            if len(img_array.shape) == 3:
                gray = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
            else:
                gray = img_array
            
            # Apply denoising
            denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
            
            # Apply adaptive thresholding for better text contrast
            thresh = cv2.adaptiveThreshold(
                denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                cv2.THRESH_BINARY, 11, 2
            )
            
            # Convert back to PIL Image
            processed_img = Image.fromarray(thresh)
        except Exception as cv_error:
            # Fallback to PIL-only processing if OpenCV fails
            print(f"OpenCV preprocessing failed: {cv_error}, using PIL-only processing")
            processed_img = img
        
        # Additional PIL enhancements (works with both OpenCV and PIL-only paths)
        try:
            enhancer = ImageEnhance.Contrast(processed_img)
            processed_img = enhancer.enhance(1.5)
            
            enhancer = ImageEnhance.Sharpness(processed_img)
            processed_img = enhancer.enhance(2.0)
        except Exception as pil_error:
            print(f"PIL enhancement error: {pil_error}")
        
        return processed_img
    except Exception as e:
        print(f"Image preprocessing error: {e}, using original image")
        return img


# -------------------------------------------------
# Helper: Clean and normalize OCR text
# -------------------------------------------------
def _clean_ocr_text(text: str) -> str:
    """
    Clean and normalize OCR output for better pattern matching.
    """
    if not text:
        return ""
    
    # Normalize excessive whitespace but preserve newlines
    # 1. Replace horizontal whitespace (tabs, spaces) with single space
    text = re.sub(r'[ \t\f\v]+', ' ', text)
    # 2. Reduce multiple newlines to single newline
    text = re.sub(r'\n\s*\n', '\n', text)
    
    # Fix common OCR errors
    replacements = {
        '0': 'O',  # Only in specific contexts
        '1': 'I',  # Only in specific contexts
        '|': 'I',
        'l': 'I',
    }
    
    # Normalize common separators
    text = re.sub(r'[:=\-–—]+', ':', text)
    
    # Remove special characters that might interfere
    # Keep : . , ; ( ) - and newlines
    text = re.sub(r'[^\w\s:.,;()\-]', ' ', text)
    
    return text.strip()


# -------------------------------------------------
# Helper: OCR for PDF
# -------------------------------------------------
def _extract_text_from_pdf(filepath: str) -> str:
    """
    Extract text from PDF using pdfplumber (direct text) 
    with a fallback to EasyOCR for scanned pages.
    """
    text_chunks = []
    
    try:
        print(f"Attempting direct text extraction with pdfplumber: {filepath}")
        with pdfplumber.open(filepath) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text and page_text.strip():
                    text_chunks.append(_clean_ocr_text(page_text))
                else:
                    # Fallback to OCR if no text found on page (likely an image)
                    print(f"No direct text found on PDF page {page.page_number}, falling back to OCR...")
                    # Convert PDF page to image for EasyOCR
                    if not POPPLER_PATH:
                         print("Warning: Poppler not found, cannot fall back to OCR for scanned PDF page.")
                         continue
                    
                    from pdf2image import convert_from_path
                    pages = convert_from_path(filepath, first_page=page.page_number, last_page=page.page_number, poppler_path=POPPLER_PATH)
                    if pages:
                        page_arr = np.array(pages[0])
                        paddle_res = _extract_text_with_paddleocr(page_arr)
                        text_chunks.append(_clean_ocr_text(paddle_res))
        
        full_text = "\n".join(text_chunks)
        if full_text.strip():
            return full_text
            
    except Exception as e:
        print(f"pdfplumber extraction failed: {e}. Falling back to standard OCR pipeline.")

    # Total Fallback: Standard pdf2image + EasyOCR loop for the whole document
    if not POPPLER_PATH:
        raise Exception("Poppler not found and direct extraction failed. Cannot process PDF.")
    
    from pdf2image import convert_from_path
    pages = convert_from_path(filepath, dpi=300, poppler_path=POPPLER_PATH)
    text_chunks = []
    for page_img in pages:
        print("Running PaddleOCR on PDF page (Fallback)...")
        page_arr = np.array(page_img)
        paddle_res = _extract_text_with_paddleocr(page_arr)
        text_chunks.append(_clean_ocr_text(paddle_res))

    return "\n".join(text_chunks)


# -------------------------------------------------
# Helper: OCR for image with PaddleOCR
# -------------------------------------------------
def _extract_text_with_paddleocr(image_input) -> str:
    """
    Extract text using PaddleOCR v2.7+.
    Uses ocr() method and parses the results list.
    """
    if ocr is None:
        print("PaddleOCR not initialized.")
        return ""
    
    try:
        # PaddleOCR v2.7+ uses ocr()
        results = ocr.ocr(image_input, cls=True)
        
        if not results:
            print("PaddleOCR returned no results.")
            return ""
            
        full_text_lines = []
        low_confidence_threshold = 0.7
        
        # results is a list of pages, each page is a list of lines
        # each line is [[p1, p2, p3, p4], (text, confidence)]
        for page in results:
            if not page:
                continue
            for line in page:
                try:
                    box, (text_val, conf) = line
                    text_val = str(text_val).strip()
                    if not text_val:
                        continue
                        
                    if float(conf) < low_confidence_threshold:
                        pass # Can add uncertain tags if needed
                    full_text_lines.append(text_val)
                except Exception as e:
                    print(f"DEBUG: Error parsing OCR line: {e}")
                    continue
        
        combined_text = "\n".join(full_text_lines).strip()
        return combined_text
    except Exception as e:
        print(f"PaddleOCR failed: {e}")
        return ""

# -------------------------------------------------
# Helper: OCR for image
# -------------------------------------------------
def _extract_text_from_image(filepath: str) -> str:
    """
    Extract text from image using PaddleOCR.
    """
    print("Running PaddleOCR...")
    paddle_text = _extract_text_with_paddleocr(filepath)
    full_text = _clean_ocr_text(paddle_text)
    
    return full_text


# -------------------------------------------------
# Bill type classifier
# -------------------------------------------------
def _classify_bill_type(text: str) -> str:
    t = text.lower()
    
    # Define generic keywords for each bill type (not company-specific)
    electricity_keywords = [
        "electricity", "power", "kwh", "unit", "energy", "bill", "meter", 
        "consumption", "demand", "fixed charge", "usage", "electric",
        "kilowatt", "kw", "electrical", "utility", "supply", "tariff", "electric"
    ]
    
    fuel_keywords = [
        "fuel", "petrol", "diesel", "gas station", "pump", "volume", "liters", "ltr", 
        "lts", "dispenser", "nozzle", "gasoline", "petrol bunk", "refuel",
        "fuel", "gas", "fuel bill", "fuel usage", "fuel consumption"
    ]
    
    gas_keywords = [
        "gas", "png", "cng", "lpg", "scm", "gas consumption", "gas bill",
        "gas usage", "gas meter", "gas connection", "gas agency", "natural gas",
        "propane", "butane", "gas cylinder", "gas supply", "gas utility"
    ]
    
    water_keywords = [
        "water", "water bill", "water usage", "water consumption", "kl", "liters", "cubic meter", 
        "water supply", "water charges", "water meter", "water utility", "supply",
        "consumption", "usage", "water board", "water department"
    ]
    
    # Count keyword matches for each category
    electricity_matches = sum(1 for keyword in electricity_keywords if keyword in t)
    fuel_matches = sum(1 for keyword in fuel_keywords if keyword in t)
    gas_matches = sum(1 for keyword in gas_keywords if keyword in t)
    water_matches = sum(1 for keyword in water_keywords if keyword in t)
    
    # Determine the most likely bill type based on keyword matches
    max_matches = max(electricity_matches, fuel_matches, gas_matches, water_matches)
    
    if max_matches == 0:
        # If no specific keywords found, try more general classification
        if any(word in t for word in ["kwh", "units", "consumption"]):
            return "electricity"
        elif any(word in t for word in ["liters", "lts", "volume"]):
            return "fuel"
        elif any(word in t for word in ["scm", "gas", "cylinder"]):
            return "png_gas"
        elif any(word in t for word in ["kl", "water"]):
            return "water"
        else:
            return "unknown"
    
    # Return the type with most matches
    if electricity_matches == max_matches:
        return "electricity"
    elif fuel_matches == max_matches:
        return "fuel"
    elif gas_matches == max_matches:
        if "lpg" in t or "cylinder" in t:
            return "lpg"
        else:
            return "png_gas"
    else:  # water_matches == max_matches
        return "water"

# -------------------------------------------------
# Helper: Billing History Sequencing
# -------------------------------------------------

def _parse_month_to_int(month_str: str) -> int:
    """Converts month string (jan, feb...) to 1-12."""
    months = {
        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
        'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
    }
    m = month_str.lower()[:3]
    return months.get(m, 0)

def _clean_units(val_str: str) -> str:
    """
    Cleans OCR noise and merges split digits.
    Rule 3: Remove non-numeric (except .) and merge split digits (9 9 7 5 -> 9975).
    """
    if not val_str: return ""
    
    # Remove all except digits, dots and spaces
    cleaned = re.sub(r"[^\d.\s]", "", val_str)
    
    # Merge split digits: "9 9 7 5" -> "9975"
    # Logic: if we have digits separated by single spaces, merge them.
    # We find sequences of digit-space-digit and remove the space
    while True:
        new_cleaned = re.sub(r"(\d)\s+(\d)", r"\1\2", cleaned)
        if new_cleaned == cleaned: break
        cleaned = new_cleaned
        
    return cleaned.strip()

def _validate_unit_sequence(sequenced: list) -> list:
    """
    Validates units using logical constraints and neighboring rows.
    Rule 2, 4, 5: 
    - units > 0
    - units must not deviate abnormally (outlier detection)
    - stabilization via neighbors
    """
    if not sequenced: return []
    
    vals = []
    for dt, val in sequenced:
        try:
            s_val = str(val).strip()
            if s_val: vals.append(float(s_val))
        except: continue
        
    if not vals: return sequenced
    
    median_val = np.median(vals)
    # Reasonable deviation: allow up to 5x median or 0.1x median for "spikes"
    # But for small values (like 25 vs 75), medians are small, so we use a threshold
    
    new_sequenced = []
    for i, (dt, val) in enumerate(sequenced):
        is_uncertain = False
        try:
            s_val = str(val).replace("[uncertain]", "").strip()
            f_val = float(s_val)
            
            # Rule 4: Basic range validation
            if f_val <= 0: is_uncertain = True
            
            # Rule 4/5: Outlier & Neighbor detection
            # If value is > 10x median or < 0.1x median (if median > 10)
            if median_val > 10:
                if f_val > median_val * 10 or f_val < median_val * 0.1:
                    is_uncertain = True
            elif f_val > 50000: # Global upper bound if median is weird
                is_uncertain = True
                
            # Stabilization: check neighbors if current value is suspicious
            if not is_uncertain and len(vals) >= 3:
                # Compare with prev and next if they exist
                neighbors = []
                if i > 0: 
                    p_val = str(sequenced[i-1][1]).strip()
                    if p_val: neighbors.append(float(p_val))
                if i < len(sequenced) - 1:
                    n_val = str(sequenced[i+1][1]).strip()
                    if n_val: neighbors.append(float(n_val))
                
                if neighbors:
                    avg_neighbor = sum(neighbors) / len(neighbors)
                    if avg_neighbor > 0:
                        ratio = f_val / avg_neighbor
                        # If value is 10x or 0.1x of neighbors, mark uncertain
                        if ratio > 10 or ratio < 0.1:
                            is_uncertain = True

        except:
            is_uncertain = True
            
        final_val = val
        new_sequenced.append((dt, final_val))
        
    return new_sequenced

def _sequence_billing_history(history_rows: list, base_year: int = None) -> list:
    """
    history_rows: list of (month_str, val)
    Returns: list of (datetime_obj, val, is_uncertain)
    
    Rules:
    1. Determine direction (ASC/DESC) based on first two valid months.
    2. Sequences years based on Month rollovers (Dec <-> Jan).
    3. If sequence is broken, mark as uncertain.
    """
    if len(history_rows) < 1:
        return []
        
    parsed_rows = []
    for m_str, val in history_rows:
        m_int = _parse_month_to_int(m_str)
        if m_int > 0:
            parsed_rows.append({'m_int': m_int, 'val': val, 'orig_m': m_str})
            
    if not parsed_rows:
        return []
        
    # 1. Determine direction
    direction = "DESC" # Default: newer -> older (common in bills)
    if len(parsed_rows) >= 2:
        m1 = parsed_rows[0]['m_int']
        m2 = parsed_rows[1]['m_int']
        if m1 != m2:
            # If 12 -> 1, it's DESC (newer to older)
            # If 1 -> 12, it's ASC (older to newer)
            if m1 > m2:
                # Normal descending: Feb (2) -> Jan (1)
                # OR Rollover descending: Jan (1) -> Dec (12)
                if m1 == 12 and m2 == 1: direction = "ASC"
                else: direction = "DESC"
            else:
                # Normal ascending: Jan (1) -> Feb (2)
                # OR Rollover ascending: Dec (12) -> Jan (1)
                if m1 == 1 and m2 == 12: direction = "DESC"
                else: direction = "ASC"
    
    # 2. Sequence Years
    # Use provided base_year or fallback to current
    current_year = base_year if base_year else datetime.now().year
    
    sequenced = []
    last_m = -1
    last_year = current_year
    
    for i, row in enumerate(parsed_rows):
        m = row['m_int']
        is_uncertain = False
        
        if i == 0:
            last_m = m
            # We assume the first row's year is the anchor (current_year)
        else:
            # Check for rollover
            if direction == "ASC":
                # Jan -> Feb (m > last_m) -> SAME year
                # Dec -> Jan (m < last_m) -> NEXT year
                if m < last_m:
                    last_year += 1
                elif m == last_m: # Duplicate month?
                    is_uncertain = True
                elif m > last_m + 1: # Gap?
                    pass
            else: # DESC
                # Feb -> Jan (m < last_m) -> SAME year
                # Jan -> Dec (m > last_m) -> PREV year
                if m > last_m:
                    last_year -= 1
                elif m == last_m:
                    is_uncertain = True
            
            # Simple sequence check
            if direction == "ASC" and m <= last_m and last_m != 12: 
                is_uncertain = True
            elif direction == "DESC" and m >= last_m and last_m != 1: 
                is_uncertain = True
                
            last_m = m
            
        try:
            dt = datetime(last_year, m, 1)
            row_val = row['val']
            sequenced.append((dt, row_val))
        except:
            continue
            
    if not sequenced:
        return []
        
    return _validate_unit_sequence(sequenced)

# -------------------------------------------------
# Helper: AI Validation for Units
# -------------------------------------------------
def _extract_units_with_ai(text: str, bill_type: str):
    """Fallback to Gemini API if regex fails to extract units."""
    try:
        from ai_recommendations import GEMINI_API_KEY
        import requests, re
        
        if not GEMINI_API_KEY or not GEMINI_API_KEY.startswith("AIza"):
            return None
            
        prompt = f'''You are an OCR extraction assistant. Extract the TOTAL CONSUMPTION UNITS from the following OCR text of an Indian {bill_type} bill.
Return ONLY a valid float number representing the consumption/units (e.g., 107.0 or 130). If you cannot find any reasonable consumption value, return the number 0. Do not return any other text.
OCR TEXT:
{text[:3000]}'''

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        resp = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if "candidates" in data and len(data["candidates"]) > 0:
                res_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                match = re.search(r"(\d+(?:\.\d+)?)", res_text)
                if match:
                    val = float(match.group(1))
                    if val > 0:
                        print(f"✓ Extracted via AI Fallback: {val} units")
                        return val
    except Exception as e:
        print(f"AI Extraction Fallback failed: {e}")
    return None

# -------------------------------------------------
# Extractors for each bill type
# -------------------------------------------------

def _extract_electricity_units(text: str, image_input=None):
    """
    Extract electricity units (kWh) strictly matching numbers near 'kwh' or 'unit(s)'.
    """
    text_lower = text.lower()
    patterns = [
        r"(\d{1,8}(?:[.,]\d{1,4})?)\s*(?:kwh|kw\s*h|units|unit)\b",
        r"\b(?:kwh|kw\s*h|units|unit)\s*[:=\-–—\s]+\s*(\d{1,8}(?:[.,]\d{1,4})?)"
    ]
    for pat in patterns:
        for m in re.finditer(pat, text_lower):
            try:
                val = float(m.group(1).replace(',', '.'))
                if 2000 <= val <= 2030 and val.is_integer(): continue
                if 1 <= val <= 50000:
                    return val
            except ValueError:
                continue
                
    # Fallback to AI if regex fails
    ai_val = _extract_units_with_ai(text, "electricity")
    if ai_val is not None:
        return ai_val
        
    return None

def _extract_water_kl(text: str):
    """
    Extract water consumption strictly matching numbers near 'kl' or 'kiloliter(s)' or 'cubic meter(s)'.
    """
    text_lower = text.lower()
    patterns = [
        r"(\d{1,8}(?:[.,]\d{1,4})?)\s*(?:kl|k\s*l|kiloliters?|cubic\s+meters?|cu\s+m|m3)\b",
        r"\b(?:kl|k\s*l|kiloliters?|cubic\s+meters?|cu\s+m|m3)\s*[:=\-–—\s]+\s*(\d{1,8}(?:[.,]\d{1,4})?)"
    ]
    for pat in patterns:
        for m in re.finditer(pat, text_lower):
            try:
                val = float(m.group(1).replace(',', '.'))
                if 2000 <= val <= 2030 and val.is_integer(): continue
                if 0.1 <= val <= 100000:
                    return val
            except ValueError:
                continue
    return None

def _extract_png_scm(text: str):
    """
    Extract PNG gas strictly matching numbers near 'scm' or 'cubic meter(s)'.
    """
    text_lower = text.lower()
    patterns = [
        r"(\d{1,8}(?:[.,]\d{1,4})?)\s*(?:scm|standard\s+cubic\s+meters?|cubic\s+meters?|cu\s+m|m3)\b",
        r"\b(?:scm|standard\s+cubic\s+meters?|cubic\s+meters?|cu\s+m|m3)\s*[:=\-–—\s]+\s*(\d{1,8}(?:[.,]\d{1,4})?)"
    ]
    for pat in patterns:
        for m in re.finditer(pat, text_lower):
            try:
                val = float(m.group(1).replace(',', '.'))
                if 2000 <= val <= 2030 and val.is_integer(): continue
                if 0.1 <= val <= 100000:
                    return val
            except ValueError:
                continue
    return None

def _extract_fuel_liters(text: str):
    """
    Extract fuel volume strictly matching numbers near 'liter(s)', 'ltr', 'lt', 'vol(ume)'.
    """
    text_lower = text.lower()
    patterns = [
        r"(\d{1,8}(?:[.,]\d{1,4})?)\s*(?:liters?|litres?|ltr|lt|l)\b",
        r"\b(?:liters?|litres?|ltr|lt|volume|vol|qty)\s*[:=\-–—\s]+\s*(\d{1,8}(?:[.,]\d{1,4})?)"
    ]
    for pat in patterns:
        for m in re.finditer(pat, text_lower):
            start = m.start()
            pre_text = text_lower[max(0, start-20):start]
            if any(x in pre_text for x in ['rate', 'price', '@', '/', 'per']): continue
            try:
                val = float(m.group(1).replace(',', '.'))
                if 2000 <= val <= 2030 and val.is_integer(): continue
                if 0.1 <= val <= 5000:
                    return val
            except ValueError:
                continue
    return None

def _extract_lpg_cylinders(text: str):
    """
    Extract number of LPG cylinders matching numbers near 'cylinder(s)'.
    """
    text_lower = text.lower()
    patterns = [
        r"(\d{1,3}(?:\.\d{1,2})?)\s*(?:cylinders?|cyl\b)",
        r"\b(?:cylinders?|cyl\b)\s*[:=\-–—\s]+\s*(\d{1,3}(?:\.\d{1,2})?)"
    ]
    for pat in patterns:
        for m in re.finditer(pat, text_lower):
            try:
                val = float(m.group(1).replace(',', '.'))
                if 2000 <= val <= 2030 and val.is_integer(): continue
                if 0.1 <= val <= 50:
                    return val
            except ValueError:
                continue
    return 1.0

# -------------------------------------------------
# Main entry: process_bill_image
# -------------------------------------------------
# -------------------------------------------------
# Main entry: process_bill_image
# -------------------------------------------------
def process_bill_image(filepath: str):
    """
    Processes an uploaded bill using the unified AdvancedBillPipeline.
    """
    if not advanced_pipeline:
        return {"error": "Advanced OCR Pipeline not initialized."}
        
    try:
        print(f"process_bill_image: context processing {os.path.basename(filepath)}")
        result = advanced_pipeline.process(filepath)
        
        if result.get("status") == "success":
            return {
                "extracted_data": {
                    "activity_type": result["bill_type"].capitalize() + " Usage" if "Usage" not in result["bill_type"] else result["bill_type"],
                    "usage_value": result["usage_value"],
                    "unit": result["unit"],
                    "scope": result["scope"]
                },
                "emissions_calculation": {
                    "calculated_co2e_kg": result["carbon_emissions_kgCO2"]
                },
                "metadata": result.get("metadata", {})
            }
        else:
            return {"error": result.get("message", "Extraction failed")}
            
    except Exception as e:
        print(f"Error in process_bill_image: {e}")
        return {"error": str(e)}

