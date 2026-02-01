import os
import httpx
import google.generativeai as genai
import json
import traceback
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Union
import random

app = FastAPI(title="InvIntel API", root_path="/api")

# CORS Configuration
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Gemini Analysis Function
async def analyze_with_gemini(text: str) -> dict:
    if not GEMINI_API_KEY:
        return {}
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        prompt = f"""
        Actúa como un Analista Financiero. Analiza la siguiente noticia y devuelve JSON estricto.
        {{
            "sentiment_score": <float -1.0 a 1.0>,
            "category": <"Crypto", "Economy", "General">,
            "tickers": <list of tickers>,
            "summary": <resumen en español, max 15 palabras>
        }}
        Noticia: "{text}"
        """
        response = model.generate_content(prompt)
        content = response.text.replace('```json', '').replace('```', '').strip()
        return json.loads(content)
    except Exception as e:
        print(f"Error AI: {e}")
        return {}



# Data Model
class NewsItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    titulo: Optional[str] = Field(None, title="Title of the news", alias="title")
    resumen: str = Field(..., title="Summary of the news", alias="summary")
    sentimiento: str = Field("Neutro", alias="sentiment")
    empresas: Optional[List[str]] = Field([], alias="companies")
    enlace: Optional[str] = Field(None, alias="url")
    fecha: Optional[str] = Field(None, alias="date")
    
    sentiment_score: Optional[float] = None
    category: Optional[str] = None
    tickers: Optional[List[str]] = []

# Supabase Helpers
async def save_to_supabase(data: dict) -> bool:
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Supabase credentials not found.")
        return False
    
    url = f"{SUPABASE_URL}/rest/v1/news"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=data, headers=headers)
            if response.status_code >= 400:
                print(f"❌ Supabase Error ({response.status_code}): {response.text}")
            response.raise_for_status()
            return True
        except Exception as e:
            print(f"Error inserting into Supabase: {e}")
            return False

async def fetch_from_supabase() -> List[dict]:
    if not SUPABASE_URL or not SUPABASE_KEY:
        return []
    url = f"{SUPABASE_URL}/rest/v1/news?select=*&order=created_at.desc&limit=4"
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.json()
        except:
            return []

@app.get("/")
async def root():
    return {"message": "InvIntel API is active"}

@app.post("/webhook/news")
async def receive_news(news: Union[dict, List[dict]]):
    try:
        print(f"DEBUG: Received webhook payload: {json.dumps(news)[:500]}...")
        incoming_news = news if isinstance(news, list) else [news]
        saved_count = 0
        
        for item in incoming_news:
            title = str(item.get("title") or item.get("titulo") or "Sin título")
            summary = str(item.get("summary") or item.get("resumen") or "Sin resumen disponible")
            url = str(item.get("url") or item.get("enlace") or "")
            published_at = str(item.get("published_at") or item.get("fecha") or "now()")
            
            try:
                raw_score = item.get("sentiment_score") or item.get("score") or 0.0
                sentiment_score = float(raw_score)
            except:
                sentiment_score = 0.0

            tickers = item.get("tickers") or item.get("companies") or []
            if not isinstance(tickers, list): tickers = [str(tickers)]
            else: tickers = [str(t) for t in tickers]

            veto_status = bool(item.get("veto", False))
            print(f"📡 Processing News: [{title}] | Score: {sentiment_score} | Veto: {veto_status}")
            
            payload = {
                "titulo": title,
                "resumen": summary,
                "enlace": url,
                "fecha": published_at,
                "sentimiento": "Positivo" if sentiment_score > 0.3 else ("Negativo" if sentiment_score < -0.3 else "Neutro"),
                "score": sentiment_score,
                "category": str(item.get("category", "Crypto")),
                "tickers": tickers
            }
            if await save_to_supabase(payload):
                saved_count += 1
            
        return {"status": "success", "received_count": len(incoming_news), "saved_count": saved_count}
    except Exception as e:
        print(f"❌ Critical Error in Webhook: {str(e)}")
        traceback.print_exc()
        return {"status": "error", "message": str(e)}

@app.get("/news")
async def get_news():
    return await fetch_from_supabase()

# Paper Trading
class PaperTrade(BaseModel):
    ticker: str
    entry_price: float
    invested_amount: float
    quantity: float
    status: str = "OPEN"

@app.post("/trades")
async def create_trade(trade: PaperTrade):
    if not SUPABASE_URL or not SUPABASE_KEY: return {"status": "error"}
    url = f"{SUPABASE_URL}/rest/v1/paper_trades"
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"}
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url, json=trade.dict(), headers=headers)
            resp.raise_for_status()
            return {"status": "success"}
        except: return {"status": "error"}

@app.get("/trades")
async def get_trades(status: str = "OPEN"):
    if not SUPABASE_URL or not SUPABASE_KEY: return []
    url = f"{SUPABASE_URL}/rest/v1/paper_trades?select=*&status=eq.{status}&order=created_at.desc"
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            return resp.json()
        except: return []

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

