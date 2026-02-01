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
    # Switching to Bitget Public API for Top Assets
    try:
        # Bitget Spot Klines (1h)
        # Format: symbol, granularity (1h), limit
        url = f"https://api.bitget.com/api/v2/spot/market/history-candles?symbol={symbol}&granularity=1h&limit=50"
        resp = await client.get(url, timeout=5.0)
        
        if resp.status_code != 200:
            print(f"⚠️ Bitget Klines Error [{symbol}]: {resp.status_code}")
            return None
        
        data = resp.json().get('data', [])
        if not data:
            return None
            
        # Bitget candles: [ts, open, high, low, close, vol, quoteVol]
        closes = [float(d[4]) for d in data]
        current_price = closes[-1]
        rsi = calculate_rsi(closes)
        
        # Volume from latest candle or ticker
        volume_24h = float(data[-1][6]) # quoteVol of last candle as proxy or use ticker
        
        return {
            "symbol": symbol,
            "price": current_price,
            "rsi": round(rsi, 2),
            "volume_24h": volume_24h
        }
    except Exception as e:
        print(f"❌ Bitget Fetch Exception [{symbol}]: {e}")
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
    async with httpx.AsyncClient() as client:
        try:
            # 1. Fetch ALL Bitget Tickers to find truly active coins
            resp = await client.get("https://api.bitget.com/api/v2/spot/market/tickers", timeout=5.0)
            if resp.status_code != 200:
                return {"data": [], "status": "error", "message": "Error conectando con Bitget"}
            
            all_tickers = resp.json().get('data', [])
            # Sort by quoteVolume (liquid items) and filter for USDT pairs
            liquid_tickers = [t for t in all_tickers if t.get('symbol', '').endswith('USDT')]
            top_50 = sorted(liquid_tickers, key=lambda x: float(x.get('quoteVolume', 0)), reverse=True)[:50]
            assets = [t['symbol'] for t in top_50]
            
            if not assets:
                return {"data": [], "status": "empty", "message": "No se encontraron activos líquidos"}

            # 2. Fetch market data (klines) in parallel for these top assets
            tasks = [fetch_ticker_data(client, asset) for asset in assets]
            market_results = await asyncio.gather(*tasks)
            market_results = [r for r in market_results if r]

            # 3. Fetch latest sentiment from Supabase
            latest_news = await fetch_from_supabase()
            news_map = {}
            for n in latest_news:
                tickers = n.get('tickers', [])
                score = n.get('score', 0)
                for t in tickers:
                    clean_t = t.replace('$','').replace('USDT','').upper()
                    if clean_t not in news_map or n.get('created_at', '') > news_map[clean_t].get('date', ''):
                        news_map[clean_t] = {"score": score, "date": n.get('created_at', '')}

            # 4. Merge, Score & Label
            radar_data = []
            for m in market_results:
                clean_symbol = m['symbol'].replace('USDT', '')
                sentiment = news_map.get(clean_symbol)
                
                sentiment_score = sentiment['score'] if sentiment else 0
                sentiment_label = "Neural Sync" if sentiment else "En Observación"
                
                # 60% RSI (Lower is better, thresh 45) + 40% Sentiment
                rsi_factor = (100 - m['rsi']) * 0.6
                sentiment_factor = (sentiment_score * 50 + 50) * 0.4
                opportunity_score = rsi_factor + sentiment_factor
                
                radar_data.append({
                    **m,
                    "sentiment_score": sentiment_score,
                    "sentiment_label": sentiment_label,
                    "opportunity_score": round(opportunity_score, 2)
                })
                
            # 5. Ranking & Final Guarantee
            # Goal: Best opportunities first
            ranked = sorted(radar_data, key=lambda x: x['opportunity_score'], reverse=True)
            
            # If we don't have enough "Neural" positives, the Top Volume fallback is implicit
            # because we started with the Top 50 by volume.
            # We just need to make sure we return 10 items.
            final_list = ranked[:10]
            
            status = "ok" if any(r.get('opportunity_score', 0) > 40 for r in final_list) else "debug_fallback"
            
            return {
                "data": final_list,
                "status": status,
                "message": "Ranking Neural Alpha v2.0" if status == "ok" else "Analizando mercado: Filtros estrictos (Mostrando Top Volumen)"
            }
        except Exception as e:
            print(f"❌ Radar Endpoint Error: {e}")
            return {"data": [], "status": "error", "message": str(e)}

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

