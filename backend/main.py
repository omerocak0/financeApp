import os
from typing import Literal, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# ── Uygulama ─────────────────────────────────────────────────────────────────
app = FastAPI(title="Finansal Koruma Katmanı API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Gemini İstemcisi ──────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY bulunamadı. Lütfen .env dosyasını kontrol edin.")

client = genai.Client(api_key=GEMINI_API_KEY)
MODEL = "gemini-2.5-flash"

# ── Veri Modelleri ────────────────────────────────────────────────────────────
class HaberAnalizi(BaseModel):
    ozet: str = Field(..., description="Haberin halk diliyle basit özeti")
    manipulasyon_skoru: int = Field(..., ge=0, le=100, description="Manipülasyon skoru (0-100)")
    risk_seviyesi: Literal["DÜŞÜK", "ORTA", "YÜKSEK"] = Field(..., description="Finansal risk seviyesi")
    eylem_onerisi: str = Field(..., description="Yatırımcıya yönelik koruma tavsiyesi")

class Mesaj(BaseModel):
    rol: Literal["user", "model"]
    icerik: str

class SohbetIstegi(BaseModel):
    mesajlar: List[Mesaj]
    haber_baglami: str = ""

# ── Rotalar ───────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {"mesaj": "Finansal Koruma Katmanı API Çalışıyor", "durum": "aktif", "dokümantasyon": "/docs"}

@app.post("/analiz", response_model=HaberAnalizi)
async def haberi_analiz_et(haber_metni: str):
    if not haber_metni.strip():
        raise HTTPException(status_code=400, detail="Haber metni boş olamaz.")

    sistem_talimati = (
        "Sen bir finansal koruma uzmanısın. Küçük yatırımcıları piyasa manipülasyonundan ve "
        "spekülatif haberlerden korumak için haber metinlerini analiz edersin. "
        "Haberi analiz et ve yalnızca JSON formatında yanıt ver."
    )

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=haber_metni,
            config=types.GenerateContentConfig(
                system_instruction=sistem_talimati,
                temperature=0.2,
                response_mime_type="application/json",
                response_schema=HaberAnalizi,
            ),
        )
        return response.parsed
    except Exception as e:
        print(f"[Analiz Hatası] {e}")
        raise HTTPException(status_code=500, detail=f"Analiz başarısız: {str(e)}")

@app.post("/sohbet")
async def sohbet_et(istek: SohbetIstegi):
    if not istek.mesajlar:
        raise HTTPException(status_code=400, detail="Mesaj listesi boş olamaz.")

    sistem_talimati = (
        "Sen deneyimli bir finans asistanısın. Kullanıcının piyasalar, hisseler ve ekonomiyle ilgili "
        "sorularını net ve anlaşılır şekilde yanıtla. "
        + (f"Referans haber bağlamı: {istek.haber_baglami}" if istek.haber_baglami else "")
    )

    try:
        history = [
            types.Content(role=m.rol, parts=[types.Part(text=m.icerik)])
            for m in istek.mesajlar[:-1]
        ]
        current_msg = istek.mesajlar[-1].icerik

        chat = client.chats.create(
            model=MODEL,
            config=types.GenerateContentConfig(
                system_instruction=sistem_talimati,
                temperature=0.7,
            ),
            history=history
        )

        response = chat.send_message(current_msg)
        return {"yanit": response.text}
    except Exception as e:
        print(f"[Sohbet Hatası] {e}")
        raise HTTPException(status_code=500, detail=f"Mesaj iletilemedi: {str(e)}")

# ── Başlat ────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
