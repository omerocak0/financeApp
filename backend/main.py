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

# KRİTİK DEĞİŞİKLİK: Yeni SDK'nın en güncel ve kararlı 2.5 flash modelini tanımlıyoruz
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


# ── Rotalar ───────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {"mesaj": "Finansal Koruma Katmani API Calisiyor", "durum": "aktif"}


@app.post("/analiz", response_model=HaberAnalizi)
async def haberi_analiz_et(girdi: HaberGirdisi):
    haber_metni = girdi.haber_metni
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
            return HaberAnalizi(**json.loads(response.text.strip()))

        raise ValueError("Gemini bos bir yanit dondurdu.")

    except Exception as e:
        print(f"[Analiz Hatasi] {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Yapay zeka analiz servisinde hata oluştu: {str(e)}"
        )


@app.post("/sohbet")
async def sohbet_et(istek: SohbetIstegi):
    if not istek.mesajlar:
        raise HTTPException(status_code=400, detail="Mesaj listesi bos olamaz.")

    sistem_talimati = (
        "Sen üst düzey, profesyonel bir 'Finansal Analiz ve Koruma Asistanı'sın. "
        "Kullanıcıya daima zengin, veri odaklı ve iyi yapılandırılmış cevaplar ver. "
        "Şu kurallara KESİNLİKLE uy:\n"
        "1. Gerektiğinde kıyaslamalar veya finansal metrikler için **Markdown Tabloları** kullan.\n"
        "2. Konuları **madde imleri (bullet points)** veya numaralandırılmış listelerle açıkla.\n"
        "3. Önemli terimleri, hisse kodlarını ve risk uyarılarını **kalın (bold)** yaz.\n"
        "4. Uzun ve sıkıcı paragraflardan kaçın, metinleri başlıklar (###) ile bölümlere ayır.\n"
        "5. Daima risk yönetimi ve yatırımcı psikolojisini korumaya yönelik profesyonel bir dil kullan.\n"
        + (f"Referans haber bağlamı: {istek.haber_baglami}" if istek.haber_baglami else "")
    )

    try:
        history = []
        for m in istek.mesajlar[:-1]:
            role = "model" if m.rol in ["assistant", "model"] else "user"
            history.append(types.Content(role=role, parts=[types.Part.from_text(text=m.icerik)]))
            
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
        raise HTTPException(
            status_code=503,
            detail=f"Yapay zeka sohbet servisi şu an kullanılamıyor: {str(e)}"
        )


@app.post("/strateji", response_model=StratejiRaporu)
async def strateji_olustur(istek: StratejiIstegi):
    sistem_talimati = (
        "Sen Turkiye borsasinda uzmanlasmis bir kisisel finans danismanissin. "
        "Kullanicinin yatirim profilim, risk psikolojisi ve sektorel tercihlerine gore BIST hisselerinden "
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
            return StratejiRaporu(**json.loads(response.text.strip()))
            
        raise ValueError("Bos yanit.")
    except Exception as e:
        print(f"[Strateji Hatasi] {type(e).__name__}: {e}")
        return StratejiRaporu(
            kullanici_profili="Profil oluşturulamadı (Bağlantı Hatası)",
            strateji_ozeti=f"Yapay zeka servisine erişilemediği için genel portföy gösteriliyor. Hata: {str(e)}",
            onerilen_hisseler=[
                OnerilenHisse(hisse_kodu="THYAO", oneri_nedeni="Güçlü bilanço ve artan sektörel hacim (Örnek Veri)", guven_skoru=80, risk_durumu="ORTA"),
                OnerilenHisse(hisse_kodu="KCHOL", oneri_nedeni="Holding iskontosu ve defansif yapı (Örnek Veri)", guven_skoru=85, risk_durumu="DUSUK"),
                OnerilenHisse(hisse_kodu="TUPRS", oneri_nedeni="Temettü verimliliği ve güçlü nakit akışı (Örnek Veri)", guven_skoru=75, risk_durumu="ORTA")
            ]
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)