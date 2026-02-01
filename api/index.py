import os
import httpx
from google import genai
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Union
import random # For fallback simulation

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

# Data Model
class NewsItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    titulo: Optional[str] = Field(None, title="Title of the news", alias="title")
    resumen: str = Field(..., title="Summary of the news", alias="summary") # 'summary' alias might conflict with output summary field, but typically input is 'description' or 'summary'
    sentimiento: str = Field("Neutro", alias="sentiment")  # "Positivo", "Negativo", "Neutro"
    empresas: Optional[List[str]] = Field([], alias="companies")
    enlace: Optional[str] = Field(None, alias="url")
    fecha: Optional[str] = Field(None, alias="date")
    
    # Enrichment fields (internal or from explicit input)
    sentiment_score: Optional[float] = None
    category: Optional[str] = None
    tickers: Optional[List[str]] = []
    summary_ai: Optional[str] = Field(None, alias="ai_summary") # Different from input summary/resumen

# Gemini Analysis Function
async def analyze_with_gemini(text: str) -> dict:
    if not GEMINI_API_KEY:
        print("Warning: GEMINI_API_KEY not found. Skipping AI analysis.")
        return {}

    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        
        prompt = f"""
        Actúa como un Analista Financiero Senior. Analiza la siguiente noticia y devuelve un objeto JSON estricto (sin markdown, sin backticks).
        Tu salida JSON debe estar ESTRICTAMENTE en ESPAÑOL. Traduce el título y el resumen. Si la noticia es técnica, mantén los términos financieros (tickers, ETF) pero explica el contexto en español.

        DEFINICIÓN DE SENTIMENT SCORE (CRÍTICO):
        +1.0: Extremadamente Bullish (El precio va a explotar hacia arriba, récords históricos, adopción masiva).
        0.0: Neutral (Información técnica sin impacto en precio).
        -1.0: Extremadamente Bearish (Hacks, prohibiciones, el precio se va a desplomar).

        INSTRUCCIÓN DE RAZONAMIENTO:
        Antes de asignar el score, pregúntate: ¿Esta noticia hará que el precio SUBA (positivo) o BAJE (negativo)? Asigna el signo matemático basándote estrictamente en la acción del precio esperada.
        
        Noticia: "{text}"
        
        Estructura de Salida:
        {{
            "sentiment_score": <float entre -1.0 y 1.0 basado en la escala anterior>,
            "sentiment": <"Positivo", "Negativo" o "Neutro">,
            "category": <uno de ["Crypto", "Stocks", "Forex", "Economy"]>,
            "tickers": <lista de strings, ej: ["$BTC", "$AAPL"]>,
            "summary": <string en ESPAÑOL, max 15 palabras enfocado en acción del precio>
        }}
        """
        
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt
        )
        
        # Clean response if necessary
        content = response.text.replace('```json', '').replace('```', '').strip()
        analysis = json.loads(content)
        return analysis
    except Exception as e:
        print(f"Error analyzing with Gemini: {e}")
        return {}

# Helper functions for Supabase REST API
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
            # Note: If Supabase columns don't exist, this might error. 
            # Ideally the user has prepared the DB or we use a JSONB column.
            # We attempt to send all data.
            response = await client.post(url, json=data, headers=headers)
            response.raise_for_status()
            return True
        except Exception as e:
            print(f"Error inserting into Supabase: {e}")
            return False

async def fetch_from_supabase() -> List[dict]:
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Supabase credentials not found.")
        return []
        
    # Fetch 100 items
    url = f"{SUPABASE_URL}/rest/v1/news?select=*&order=created_at.desc&limit=100"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            # Deduplicate by title
            seen_titles = set()
            unique_news = []
            
            categories_fallback = ['Crypto', 'Forex', 'Stock']
            
            for item in data:
                title = item.get("titulo")
                if title:
                    title_clean = title.strip()
                    if title_clean not in seen_titles:
                        seen_titles.add(title_clean)
                        
                        # Fallback Simulation if fields missing
                        if item.get('sentiment_score') is None:
                             item['sentiment_score'] = round(random.uniform(-1.0, 1.0), 2)
                        
                        if item.get('category') is None:
                            item['category'] = random.choice(categories_fallback)
                            
                        # Ensure tickers exist if missing
                        if item.get('tickers') is None:
                             item['tickers'] = item.get('empresas', [])

                        unique_news.append(item)
                else:
                    unique_news.append(item)
                    
                if len(unique_news) >= 4:
                    break
            
            return unique_news
            
        except Exception as e:
            print(f"Error fetching from Supabase: {e}")
            return []

@app.post("/webhook/news")
async def receive_news(news: Union[dict, List[dict]]):
    try:
        # Handle single item or list of items
        incoming_news = news if isinstance(news, list) else [news]
        saved_count = 0
        
        for item in incoming_news:
            # Destructuring with fallbacks (Manual because it might be a dict or NewsItem)
            # Supporting both standard and n8n-style field names
            title = item.get("title") or item.get("titulo") or "Sin título"
            summary = item.get("summary") or item.get("resumen") or "Sin resumen disponible"
            url = item.get("url") or item.get("enlace") or ""
            published_at = item.get("published_at") or item.get("fecha") or "now()"
            sentiment_score = item.get("sentiment_score") or item.get("score") or 0.0
            tickers = item.get("tickers") or item.get("companies") or []
            veto_status = item.get("veto") or False

            print(f"📡 Noticia Recibida: [{title}] (Veto: {veto_status})")
            
            # Construct Payload for Supabase (Strict Mapping)
            payload = {
                "titulo": title,
                "resumen": summary,
                "enlace": url,
                "fecha": published_at,
                "sentimiento": "Positivo" if float(sentiment_score) > 0.3 else ("Negativo" if float(sentiment_score) < -0.3 else "Neutro"),
                "score": float(sentiment_score),
                "category": item.get("category", "Crypto"),
                "tickers": tickers if isinstance(tickers, list) else [tickers]
            }
            
            if await save_to_supabase(payload):
                saved_count += 1
            
        return {"status": "success", "received_count": len(incoming_news), "saved_count": saved_count}
    except Exception as e:
        print(f"❌ Critical Error in Webhook: {e}")
        # Return 200 to prevent n8n from failing the whole workflow
        return {"status": "error", "message": str(e)}


@app.get("/news")
async def get_news():
    return await fetch_from_supabase()

# Paper Trading Model
class PaperTrade(BaseModel):
    ticker: str
    entry_price: float
    invested_amount: float
    quantity: float
    news_id: Optional[str] = None
    initial_score: Optional[float] = None
    status: str = "OPEN"

class TradeCloseRequest(BaseModel):
    exit_price: float
    final_pnl: float
    reason: str

# Helper functions for Paper Trades
async def save_trade(data: dict) -> bool:
    if not SUPABASE_URL or not SUPABASE_KEY:
        return False
    
    url = f"{SUPABASE_URL}/rest/v1/paper_trades"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=data, headers=headers)
            response.raise_for_status()
            return True
        except Exception as e:
            print(f"Error saving trade: {e}")
            return False

async def fetch_trades(status: str = "OPEN") -> List[dict]:
    if not SUPABASE_URL or not SUPABASE_KEY:
        return []
        
    url = f"{SUPABASE_URL}/rest/v1/paper_trades?select=*&status=eq.{status}&order=created_at.desc"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    
    async with httpx.AsyncClient() as client:
        try:
            # 1. Fetch Trades by Status
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            trades = response.json()
            
            # 2. Enrich with Latest Sentiment (Only for OPEN trades usually, but keeping for all is fine)
            if status == "OPEN":
                for trade in trades:
                    ticker = trade.get('ticker')
                    if ticker:
                        news_url = f"{SUPABASE_URL}/rest/v1/news?select=sentiment_score,titulo&order=created_at.desc&limit=1"
                        news_query = f"{news_url}&empresas=cs.{{ {ticker} }}" 
                        
                        try:
                            news_resp = await client.get(news_query, headers=headers)
                            if not news_resp.is_error:
                                news_items = news_resp.json()
                                if news_items:
                                    latest = news_items[0]
                                    trade['latest_sentiment_score'] = latest.get('sentiment_score')
                                    trade['latest_news_title'] = latest.get('titulo')
                        except:
                            pass
                        
            return trades
        except Exception as e:
            print(f"Error fetching trades: {e}")
            return []

@app.post("/trades")
async def create_trade(trade: PaperTrade):
    print(f"💰 Creating trade for {trade.ticker}: Invested=${trade.invested_amount}, Qty={trade.quantity}")
    data = trade.dict()
    if await save_trade(data):
        return {"status": "success"}
    return {"status": "error"}

@app.put("/trades/{trade_id}/close")
async def close_trade(trade_id: int, close_data: TradeCloseRequest):
    if not SUPABASE_URL or not SUPABASE_KEY:
        return {"status": "error", "message": "No credentials"}

    url = f"{SUPABASE_URL}/rest/v1/paper_trades?id=eq.{trade_id}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    
    # Payload
    update_data = {
        "status": "CLOSED",
        "exit_price": close_data.exit_price,
        "final_pnl": close_data.final_pnl,
        "close_reason": close_data.reason,
        "exit_time": "now()" # Supabase will handle this if valid timestamp, else defaults
    }
    
    async with httpx.AsyncClient() as client:
        try:
            # Update status and exit details
            response = await client.patch(url, json=update_data, headers=headers)
            response.raise_for_status()
            return {"status": "success"}
        except Exception as e:
            print(f"Error closing trade: {e}")
            return {"status": "error", "message": str(e)}

@app.get("/trades")
async def get_trades(status: str = "OPEN"):
    return await fetch_trades(status)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
