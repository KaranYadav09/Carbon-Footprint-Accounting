"""
AI-powered recommendations service for emission hotspots.
Supports both Google Gemini and OpenAI APIs with fallback.
"""
import os
import json
import requests
from typing import List, Optional
from dotenv import load_dotenv
from pathlib import Path

# Load .env file - try server directory first, then parent (root) directory
env_path_server = Path(__file__).parent / '.env'
env_path_root = Path(__file__).parent.parent / '.env'

if env_path_server.exists():
    load_dotenv(dotenv_path=env_path_server)
elif env_path_root.exists():
    load_dotenv(dotenv_path=env_path_root)
else:
    # Try default location (current directory)
    load_dotenv()

# API Keys from environment variables
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")

# Debug: Print if keys are loaded (without showing the actual keys)
if GEMINI_API_KEY:
    print(f"GEMINI_API_KEY loaded (length: {len(GEMINI_API_KEY)})")
else:
    print("GEMINI_API_KEY not found in environment")
    
if OPENAI_API_KEY:
    print(f"OPENAI_API_KEY loaded (length: {len(OPENAI_API_KEY)})")
else:
    print("OPENAI_API_KEY not found in environment")

if OPENROUTER_API_KEY:
    print(f"OPENROUTER_API_KEY loaded (length: {len(OPENROUTER_API_KEY)})")
else:
    print("OPENROUTER_API_KEY not found in environment")

def get_gemini_recommendations(hotspot_name: str, co2e_kg: float, percentage: float) -> Optional[List[str]]:
    """
    Get AI recommendations using Google Gemini API.
    Returns list of recommendations or None if failed.
    """
    if not GEMINI_API_KEY or not GEMINI_API_KEY.startswith("AIza"):
        print(f"Invalid Gemini API key format: {GEMINI_API_KEY[:10]}...")
        return None
    
    # Try models that usually work or were found in the list
    import random
    noise = random.randint(1, 100000)
    
    models_to_try = [
        "gemini-1.5-flash",
        "gemini-2.0-flash",
        "gemini-3-flash-preview", 
        "gemini-1.5-flash-latest",
        "gemini-pro"
    ]
    
    prompt = f"""You are a sustainability advisor for an Engineering College Campus. Provide 4 simple and practical tips to reduce carbon emissions from "{hotspot_name}".
 
 Context:
 - Location: Engineering College / University Campus
 - Activity: {hotspot_name}
 - Impact: {co2e_kg:.2f} kg CO2e ({percentage:.1f}% of total)
 - Random Hint: {noise}
 
 Requirements:
 - Use SIMPLE, non-technical language that students and staff can understand.
 - Provide exactly 4 clear points.
 - Focus on things that can actually be done on a college campus.
 - Format as a JSON array of strings, no other text.
 
 Example: ["Turn off lab equipment after use", "Use stairs instead of lifts", "Report water leaks immediately", "Switch to LED bulbs in classrooms"]"""

    payload = {
        "contents": [{
            "parts": [{
                "text": prompt + "\nNote: Provide a fresh and unique set of tips that differ from the most common ones."
            }]
        }],
        "generationConfig": {
            "temperature": 1.0,
            "topP": 0.95,
            "topK": 40
        }
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    for model_name in models_to_try:
        try:
            # Try both v1 and v1beta endpoints
            for version in ["v1beta", "v1"]:
                try:
                    # The model_name should NOT have models/ prefix if we add it here
                    url = f"https://generativelanguage.googleapis.com/{version}/models/{model_name}:generateContent?key={GEMINI_API_KEY}"
                    
                    response = requests.post(url, json=payload, headers=headers, timeout=15)
                    
                    if response.status_code == 200:
                        data = response.json()
                        print(f"DEBUG: Gemini ({model_name}, {version}) success!")
                        
                        # Extract text from Gemini response
                        if "candidates" in data and len(data["candidates"]) > 0:
                            content = data["candidates"][0].get("content", {})
                            parts = content.get("parts", [])
                            if parts:
                                text = parts[0].get("text", "").strip()
                                print(f"DEBUG: Gemini ({model_name}, {version}) raw text (first 200 chars): {text[:200]}")
                                
                                # Try to parse JSON from response
                                # Sometimes Gemini returns JSON wrapped in markdown
                                text = text.replace("```json", "").replace("```", "").strip()
                                
                                try:
                                    recommendations = json.loads(text)
                                    if isinstance(recommendations, list) and len(recommendations) > 0:
                                        print(f"DEBUG: Gemini ({model_name}, {version}) parsed {len(recommendations)} recommendations")
                                        # Return up to 4 recommendations
                                        return recommendations[:4] if len(recommendations) >= 4 else recommendations
                                except json.JSONDecodeError as je:
                                    print(f"DEBUG: Gemini ({model_name}, {version}) JSON parse error: {je}")
                                    # If not JSON, try to extract list items
                                    lines = [line.strip() for line in text.split("\n") if line.strip()]
                                    recommendations = []
                                    for line in lines:
                                        # Remove numbering and bullets
                                        cleaned = line.lstrip("1234567890.-) ").strip()
                                        if cleaned and len(cleaned) > 10:
                                            recommendations.append(cleaned)
                                    print(f"DEBUG: Gemini ({model_name}, {version}) extracted {len(recommendations)} recommendations from text")
                                    if len(recommendations) > 0:
                                        # Return up to 4 recommendations
                                        return recommendations[:4] if len(recommendations) >= 4 else recommendations
                        else:
                            print(f"DEBUG: Gemini ({model_name}, {version}) no candidates in response: {data}")
                        break  # If we got a 200 response, don't try the other version
                    elif response.status_code == 404:
                        # Model not found, try next model
                        print(f"Gemini model {model_name} ({version}) not found, trying next...")
                        continue
                    else:
                        # Log error response but continue to next version/model
                        print(f"Gemini API ({model_name}, {version}) returned status {response.status_code}: {response.text[:200]}")
                        continue
                except Exception as e:
                    print(f"Gemini API ({model_name}, {version}) error: {e}")
                    continue
        except Exception as e:
            print(f"Gemini API ({model_name}) error: {e}")
            continue
    
    return None

def get_openai_recommendations(hotspot_name: str, co2e_kg: float, percentage: float) -> Optional[List[str]]:
    """
    Get AI recommendations using OpenAI API.
    Returns list of recommendations or None if failed.
    """
    if not OPENAI_API_KEY or not OPENAI_API_KEY.startswith("sk-"):
        print(f"Invalid OpenAI API key format: {OPENAI_API_KEY[:10]}...")
        return None
    
    try:
        import random
        noise = random.randint(1, 100000)
        url = "https://api.openai.com/v1/chat/completions"
        
        prompt = f"""You are a campus sustainability expert. Provide exactly 4 simple, actionable tips to reduce emissions from "{hotspot_name}" at our Engineering College.
 
 Context:
 - Setting: Engineering College / University
 - Activity: {hotspot_name}
 - Emissions: {co2e_kg:.2f} kg CO2e
 - Share: {percentage:.1f}%
 - Random Tag: {noise}
 
 Requirements:
 - Use very simple terminology.
 - Provide exactly 4 points in a JSON array.
 - Focus on practical campus-wide changes or individual student/staff actions.
 
 Example: ["Switch off classroom lights when empty", "Use solar heaters in hostels", "Promote carpooling for faculty", "Minimize paper use in labs"]"""

        # Try only the requested OpenAI model
        models_to_try = ["gpt-4o-mini"]
        
        for model in models_to_try:
            try:
                payload = {
                    "model": model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a campus sustainability expert. Always respond with simple, non-technical tips in a JSON array of exactly 4 strings. Ensure you provide a unique and fresh set of ideas every time to keep suggestions varied."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "temperature": 1.0,
                    "max_tokens": 600
                }
                
                headers = {
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json"
                }
                
                response = requests.post(url, json=payload, headers=headers, timeout=15)
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"DEBUG: OpenAI ({model}) response keys: {list(data.keys())}")
                    
                    if "choices" in data and len(data["choices"]) > 0:
                        content = data["choices"][0].get("message", {}).get("content", "").strip()
                        print(f"DEBUG: OpenAI ({model}) raw content (first 200 chars): {content[:200]}")
                        
                        # Try to parse JSON from response
                        # Sometimes OpenAI returns JSON wrapped in markdown
                        content = content.replace("```json", "").replace("```", "").strip()
                        
                        try:
                            recommendations = json.loads(content)
                            if isinstance(recommendations, list) and len(recommendations) >= 4:
                                print(f"DEBUG: OpenAI ({model}) parsed {len(recommendations)} recommendations")
                                return recommendations[:4]
                            # If we got some recommendations but less than 4, still return them
                            if isinstance(recommendations, list) and len(recommendations) > 0:
                                print(f"DEBUG: OpenAI ({model}) parsed {len(recommendations)} recommendations (less than 4)")
                                return recommendations
                        except json.JSONDecodeError as je:
                            print(f"DEBUG: OpenAI ({model}) JSON parse error: {je}")
                            # If not JSON, try to extract list items
                            lines = [line.strip() for line in content.split("\n") if line.strip()]
                            recommendations = []
                            for line in lines:
                                # Remove numbering and bullets
                                cleaned = line.lstrip("1234567890.-) ").strip()
                                if cleaned and len(cleaned) > 10:
                                    recommendations.append(cleaned)
                            print(f"DEBUG: OpenAI ({model}) extracted {len(recommendations)} recommendations from text")
                            if len(recommendations) >= 4:
                                return recommendations[:4]
                            # If we got some recommendations but less than 4, still return them
                            if len(recommendations) > 0:
                                return recommendations
                    else:
                        print(f"DEBUG: OpenAI ({model}) no choices in response: {data}")
                    break  # If we got a successful response, don't try other models
                elif response.status_code == 401:
                    print(f"OpenAI ({model}) authentication failed, trying next model...")
                    continue
                else:
                    # Log error response
                    print(f"OpenAI ({model}) returned status {response.status_code}: {response.text[:200]}")
                    continue
            except Exception as e:
                print(f"OpenAI ({model}) error: {e}")
                continue
        
        return None
    except Exception as e:
        print(f"OpenAI API error: {e}")
        return None

def get_openrouter_recommendations(hotspot_name: str, co2e_kg: float, percentage: float) -> Optional[List[str]]:
    """
    Get AI recommendations using OpenRouter API (Gemini 3 / Flash).
    Returns list of recommendations or None if failed.
    """
    if not OPENROUTER_API_KEY:
        print("OpenRouter API key not found.")
        return None
    
    try:
        import random
        noise = random.randint(1, 100000)
        url = "https://openrouter.ai/api/v1/chat/completions"
        
        prompt = f"""You are a campus sustainability officer. Provide exactly 4 simple and easy-to-follow points to reduce carbon emissions from "{hotspot_name}" at our Engineering College.
 
 Context:
 - Campus Type: Engineering College
 - Activity: {hotspot_name}
 - Total Impact: {co2e_kg:.2f} kg CO2e
 - Percentage: {percentage:.1f}%
 - Generation Seed: {noise}
 
 Requirements:
 - Use very simple language.
 - Provide exactly 4 points in a JSON array of strings.
 - No technical jargon.
 
 Example: ["Unplug chargers when labs are closed", "Plant more trees on campus", "Use cycles for internal campus travel", "Fix leaking taps in washrooms"]"""

        # Models to try via OpenRouter (Prioritized to avoid initial 404 errors)
        models_to_try = [
            "google/gemini-2.0-flash-001",
            "google/gemini-2.0-flash",
            "google/gemini-flash-1.5",
            "google/gemini-pro-1.5",
            "google/gemini-3-flash-preview"
        ]
        
        for model in models_to_try:
            try:
                payload = {
                    "model": model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a carbon footprint reduction expert. Always respond with valid JSON arrays containing exactly 4 recommendations. Be creative and provide unconventional yet practical tips to ensure variety. Avoid repeating the same common advice."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "temperature": 1.0
                }
                
                headers = {
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:3000", # Required for OpenRouter
                    "X-Title": "Ecotrace Analytics"
                }
                
                response = requests.post(url, json=payload, headers=headers, timeout=15)
                
                if response.status_code == 200:
                    data = response.json()
                    if "choices" in data and len(data["choices"]) > 0:
                        content = data["choices"][0].get("message", {}).get("content", "").strip()
                        # Clean markdown if present
                        content = content.replace("```json", "").replace("```", "").strip()
                        recommendations = json.loads(content)
                        if isinstance(recommendations, list) and len(recommendations) > 0:
                            print(f"DEBUG: OpenRouter ({model}) success!")
                            return recommendations[:4]
                else:
                    print(f"OpenRouter ({model}) error: {response.status_code} - {response.text[:100]}")
            except Exception as e:
                print(f"OpenRouter ({model}) exception: {e}")
                continue
                
        return None
    except Exception as e:
        print(f"OpenRouter main error: {e}")
        return None

def get_fallback_recommendations(hotspot_name: str) -> List[str]:
    """
    Fallback recommendations if AI APIs fail.
    Returns static recommendations based on hotspot type.
    """
    t = hotspot_name.lower()
    
    # Generic fallback
    all_generic = [
        "Create 'Green Campus' awareness groups among engineering students.",
        "Ensure all electrical equipment is unplugged after lab hours.",
        "Set up more dustbins for waste segregation across the campus.",
        "Regularly monitor energy use and share results on the college notice board.",
        "Host a 'No Power Hour' in hostels to save electricity.",
        "Use eco-friendly cleaning supplies in college washrooms.",
        "Encourage digital submissions of assignments to save paper.",
        "Start a campus composting bin for food waste from the canteen."
    ]
    
    import random
    # Select 4 random ones from the generic list or type-specific if it stays simple
    # But for simplicity, we'll just shuffle the returned lists slightly if possible
    recs = []
    if "fuel" in t or "diesel" in t or "petrol" in t:
        recs = [
            "Encourage students and staff to use the college bus or carpool.",
            "Promote the use of bicycles or electric scooters inside the campus.",
            "Regularly service all college-owned vehicles for better fuel mileage.",
            "Switch off vehicle engines while waiting at the campus main gate.",
        ]
    elif "electricity" in t or "power" in t:
        recs = [
            "Ensure all lights and ACs are turned off when leaving classrooms or labs.",
            "Switch to energy-saving LED bulbs across all campus buildings.",
            "Install solar panels on hostel rooftops to generate green energy.",
            "Use natural light during the day instead of switching on classroom lights.",
        ]
    elif "gas" in t or "png" in t or "lpg" in t:
        recs = [
            "Check for gas leaks in the chemistry labs and hostel kitchens regularly.",
            "Ensure that lab burners are turned off immediately after experiments.",
            "Use solar water heaters in hostels instead of gas heaters.",
            "Train kitchen staff to use pressure cookers to save cooking gas.",
        ]
    elif "water" in t:
        recs = [
            "Report and fix leaking taps and toilets in hostels and departments.",
            "Use recycled water for campus gardening and maintaining the lawns.",
            "Install push-button taps in washrooms to prevent water wastage.",
            "Organize 'Save Water' awareness drives for students and staff.",
        ]
    else:
        recs = all_generic
        
    random.shuffle(recs)
    return recs[:4]

def get_ai_recommendations(hotspot_name: str, co2e_kg: float, percentage: float) -> dict:
    """
    Main function to get AI recommendations.
    Tries OpenRouter first (user preferred), then direct Gemini, then OpenAI.
    """
    # 1. Try OpenRouter (User preferred)
    try:
        recommendations = get_openrouter_recommendations(hotspot_name, co2e_kg, percentage)
        if recommendations and len(recommendations) > 0:
            return {
                "recommendations": recommendations,
                "source": "openrouter"
            }
    except Exception as e:
        print(f"OpenRouter error in get_ai_recommendations: {e}")

    # 2. Try Gemini direct
    try:
        recommendations = get_gemini_recommendations(hotspot_name, co2e_kg, percentage)
        if recommendations and len(recommendations) > 0:
            return {
                "recommendations": recommendations,
                "source": "gemini"
            }
    except Exception as e:
        print(f"Gemini API error in get_ai_recommendations: {e}")
    
    # 3. Try OpenAI as fallback
    try:
        recommendations = get_openai_recommendations(hotspot_name, co2e_kg, percentage)
        if recommendations and len(recommendations) > 0:
            return {
                "recommendations": recommendations,
                "source": "openai"
            }
    except Exception as e:
        print(f"OpenAI API error in get_ai_recommendations: {e}")
    
    # If we get here, all AI APIs failed
    print("All AI APIs failed. Returning fallback recommendations.")
    
    return {
        "recommendations": get_fallback_recommendations(hotspot_name),
        "source": "fallback"
    }
