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
import math
import asyncio

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
# Handle both names for the service key
SUPABASE_KEY = os.environ.get("SUPABASE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# Debugging logs for Vercel
print(f"🔍 [DEBUG] SUPABASE_URL: {SUPABASE_URL[:10]}..." if SUPABASE_URL else "🔍 [DEBUG] SUPABASE_URL NOT FOUND")
print(f"🔍 [DEBUG] SUPABASE_KEY: {SUPABASE_KEY[:10]}..." if SUPABASE_KEY else "🔍 [DEBUG] SUPABASE_KEY NOT FOUND")
print(f"🔍 [DEBUG] GEMINI_API_KEY: {GEMINI_API_KEY[:5]}..." if GEMINI_API_KEY else "🔍 [DEBUG] GEMINI_API_KEY NOT FOUND")

if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
    except Exception as e:
        print(f"❌ [ERROR] GenAI Configuration failed: {e}")


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


# Market Data Helpers
def calculate_rsi(prices, period=14):
    if len(prices) <= period:
        return 50.0
    
    deltas = [prices[i+1] - prices[i] for i in range(len(prices)-1)]
    gains = [d if d > 0 else 0 for d in deltas]
    losses = [-d if d < 0 else 0 for d in deltas]
    
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period
    
    if avg_loss == 0:
        return 100.0
    
    for i in range(period, len(deltas)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
        
    if avg_loss == 0:
        return 100.0
        
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))

async def fetch_ticker_data(client, symbol):
    # Simulating Bitget/Binance logic for top assets
    try:
        # Fetching 1H candles (limit 50 to be safe for RSI 14)
        url = f"https://api.binance.com/api/v3/klines?symbol={symbol}&interval=1h&limit=50"
        resp = await client.get(url, timeout=5.0)
        if resp.status_code != 200:
            return None
        
        data = resp.json()
        closes = [float(d[4]) for d in data]
        current_price = closes[-1]
        rsi = calculate_rsi(closes)
        
        # 24h Volume (from 24h ticker)
        ticker_url = f"https://api.binance.com/api/v3/ticker/24hr?symbol={symbol}"
        t_resp = await client.get(ticker_url, timeout=5.0)
        volume_24h = float(t_resp.json().get('quoteVolume', 0)) if t_resp.status_code == 200 else 0
        
        return {
            "symbol": symbol,
            "price": current_price,
            "rsi": round(rsi, 2),
            "volume_24h": volume_24h
        }
    except Exception as e:
        print(f"Error fetching data for {symbol}: {e}")
        return None



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

@app.get("/market-radar")
async def get_market_radar():
    assets = [
        "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "AVAXUSDT", 
        "DOTUSDT", "LINKUSDT", "NEARUSDT", "MATICUSDT", "SUIUSDT", "FETUSDT", "RNDRUSDT",
        "INJUSDT", "PEPEUSDT", "SHIBUSDT", "OPUSDT", "ARBUSDT", "TIAUSDT", "SUIUSDT",
        "LTCUSDT", "BCHUSDT", "XLMUSDT", "ETCUSDT", "FILUSDT", "ICPUSDT", "STXUSDT",
        "GRTUSDT", "AAVEUSDT", "MKRUSDT", "LDOUSDT", "RUNEUSDT", "ATOMUSDT", "SEIUSDT",
        "BONKUSDT", "FLOKIUSDT", "DYDXUSDT", "IMXUSDT", "GALAUSDT", "SANDUSDT", "MANAUSDT",
        "BEAMUSDT", "PYTHUSDT", "JUPUSDT", "RENDERUSDT", "TAOUSDT", "WIFUSDT", "STXUSDT"
    ]
    
    async with httpx.AsyncClient() as client:
        # Fetch market data in parallel
        tasks = [fetch_ticker_data(client, asset) for asset in assets]
        market_results = await asyncio.gather(*tasks)
        market_results = [r for r in market_results if r]

        # Fetch latest sentiment for all these from Supabase
        # To optimize, we'll just get the latest entries from 'news'
        latest_news = await fetch_from_supabase() # Returns latest 4, maybe more?
        # Let's adjust fetch_from_supabase to take a limit if possible, or just use another query
        
        news_map = {}
        for n in latest_news:
            tickers = n.get('tickers', [])
            score = n.get('score', 0)
            for t in tickers:
                clean_t = t.replace('$','').replace('USDT','').upper()
                if clean_t not in news_map or n.get('created_at', '') > news_map[clean_t].get('date', ''):
                    news_map[clean_t] = {"score": score, "date": n.get('created_at', '')}

        # Merge
        radar_data = []
        for m in market_results:
            clean_symbol = m['symbol'].replace('USDT', '')
            sentiment = news_map.get(clean_symbol, {"score": 0})
            radar_data.append({
                **m,
                "sentiment_score": sentiment['score']
            })
            
        return sorted(radar_data, key=lambda x: x['rsi'])

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

