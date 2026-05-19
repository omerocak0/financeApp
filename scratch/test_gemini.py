import os
from dotenv import load_dotenv
from google import genai

dotenv_path = os.path.join(os.path.dirname(__file__), "..", "backend", ".env")
load_dotenv(dotenv_path)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
print(f"API Key: {GEMINI_API_KEY}")

for model in ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"]:
    print(f"\nTrying model: {model}")
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(
            model=model,
            contents="Hello, say 'Test successful'",
        )
        print(f"Success for {model}! Response: {response.text.strip()}")
        break
    except Exception as e:
        print(f"Error for {model}: {type(e).__name__}: {e}")
