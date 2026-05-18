import os
import json
from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# ── Uygulama ──────────────────────────────────────────────────────────────────
app = FastAPI(title="Finansal Koruma Katmani API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Gemini Istemcisi ──────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY bulunamadi. Lutfen .env dosyasini kontrol edin.")

client = genai.Client(api_key=GEMINI_API_KEY)
MODEL = "gemini-2.5-flash"

# ── Veri Modelleri ────────────────────────────────────────────────────────────
class HaberGirdisi(BaseModel):
    haber_metni: str = Field(..., description="Analiz edilecek finansal haber metni")

class HaberAnalizi(BaseModel):
    ozet: str = Field(..., description="Haberin halk diliyle basit ozeti")
    manipulasyon_skoru: int = Field(..., ge=0, le=100, description="Manipulasyon skoru (0-100)")
    risk_seviyesi: str = Field(..., description="Finansal risk seviyesi (DUSUK, ORTA veya YUKSEK)")
    eylem_onerisi: str = Field(..., description="Yatirimciya yonelik koruma tavsiyesi")

class Mesaj(BaseModel):
    rol: str
    icerik: str

class SohbetIstegi(BaseModel):
    mesajlar: List[Mesaj]
    haber_baglami: str = ""

# ── Rotalar ───────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {"mesaj": "Finansal Koruma Katmani API Calisiyor", "durum": "aktif"}

@app.post("/analiz", response_model=HaberAnalizi)
async def haberi_analiz_et(haber_metni: str):
    if not haber_metni.strip():
        raise HTTPException(status_code=400, detail="Haber metni bos olamaz.")

    sistem_talimati = (
        "Sen bir finansal koruma uzmanissin. Kucuk yatirimcilari piyasa manipulasyonundan ve "
        "spekulatif haberlerden korumak icin haber metinlerini analiz edersin.\n\n"
        "KESINLIKLE uymaniz gereken kural: manipulasyon_skoru ile risk_seviyesi TUTARLI olmalidir:\n"
        "- manipulasyon_skoru 0-33 arasi ise risk_seviyesi = 'DUSUK'\n"
        "- manipulasyon_skoru 34-66 arasi ise risk_seviyesi = 'ORTA'\n"
        "- manipulasyon_skoru 67-100 arasi ise risk_seviyesi = 'YUKSEK'\n\n"
        "Bu esiklere KESINLIKLE uy. Skor ile risk seviyesi ASLA celismemeli."
    )

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=haber_metni,
            config=types.GenerateContentConfig(
                system_instruction=sistem_talimati,
                temperature=0.1,
                response_mime_type="application/json",
                response_schema=HaberAnalizi,
            ),
        )

        if response.text:
            cleaned_text = response.text.strip()
            if cleaned_text.startswith("```"):
                cleaned_text = cleaned_text.split("```")[1]
                if cleaned_text.startswith("json"):
                    cleaned_text = cleaned_text[4:]
            json_data = json.loads(cleaned_text.strip())
            return HaberAnalizi(**json_data)

        raise ValueError("Gemini bos bir yanit dondurdu.")

    except Exception as e:
        print(f"[Analiz Hatasi] {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"Gemini Hatasi: {str(e)}")

@app.post("/sohbet")
async def sohbet_et(istek: SohbetIstegi):
    if not istek.mesajlar:
        raise HTTPException(status_code=400, detail="Mesaj listesi bos olamaz.")

    sistem_talimati = (
        "Sen deneyimli bir finans asistanisin. Kullanicinin piyasalar, hisseler ve ekonomiyle ilgili "
        "sorularini net ve anlasılir sekilde yanitla. "
        + (f"Referans haber baglami: {istek.haber_baglami}" if istek.haber_baglami else "")
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
        print(f"[Sohbet Hatasi] {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Strateji Modelleri ────────────────────────────────────────────────────────
class StratejiIstegi(BaseModel):
    amac: str = Field(..., description="Yatirim amaci")
    psikoloji: str = Field(..., description="Panik yonetimi")
    deneyim: str = Field(..., description="Finansal okuryazarlik")
    vade: str = Field(..., description="Yatirim vadesi")
    butce_orani: str = Field(..., description="Birikim orani")
    sektor_tercihi: str = Field(..., description="Sektorel tercih")

class OnerilenHisse(BaseModel):
    hisse_kodu: str
    oneri_nedeni: str
    guven_skoru: int = Field(..., ge=0, le=100)
    risk_durumu: str

class StratejiRaporu(BaseModel):
    kullanici_profili: str
    strateji_ozeti: str
    onerilen_hisseler: List[OnerilenHisse]

@app.post("/strateji", response_model=StratejiRaporu)
async def strateji_olustur(istek: StratejiIstegi):
    sistem_talimati = (
        "Sen Turkiye borsasinda uzmanlasmis bir kisisel finans danismanissin. "
        "Kullanicinin yatirim profili, risk psikolojisi ve sektorel tercihlerine gore BIST hisselerinden "
        "kisisellestirilmis portfoy stratejisi olusturursun.\n\n"
        "KURALLAR:\n"
        "- Sadece gercek BIST hisse kodlari kullan (KCHOL, TUPRS, ASELS, THYAO, GARAN, EREGL, BIMAS, AKBNK, SAHOL, SISE, FROTO, PGSUS, KOZAL, TCELL vb.)\n"
        "- risk_durumu yalnizca 'DUSUK', 'ORTA' veya 'YUKSEK' olabilir\n"
        "- DUSUK risk: guven_skoru 70-90, ORTA: 50-70, YUKSEK: 30-55\n"
        "- Tam olarak 3 hisse oner\n"
        "- Turkce, sade ve anlasilir yaz"
    )
    kullanici_mesaji = (
        f"Yatirim profilim:\n"
        f"- Amac: {istek.amac}\n"
        f"- Psikoloji (Dususte ne yaparim): {istek.psikoloji}\n"
        f"- Borsa Deneyimi: {istek.deneyim}\n"
        f"- Vade: {istek.vade}\n"
        f"- Birikim Orani: {istek.butce_orani}\n"
        f"- Sektor Tercihi: {istek.sektor_tercihi}\n\n"
        f"Bu profile tam olarak uygun kisisel strateji roadmap'i ve 3 adet BIST hissesi oner."
    )
    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=kullanici_mesaji,
            config=types.GenerateContentConfig(
                system_instruction=sistem_talimati,
                temperature=0.4,
                response_mime_type="application/json",
                response_schema=StratejiRaporu,
            ),
        )
        if response.text:
            cleaned = response.text.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("```")[1]
                if cleaned.startswith("json"):
                    cleaned = cleaned[4:]
            data = json.loads(cleaned.strip())
            return StratejiRaporu(**data)
        raise ValueError("Bos yanit.")
    except Exception as e:
        print(f"[Strateji Hatasi] {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ── Baslat ────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
