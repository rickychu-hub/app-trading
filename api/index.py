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
        Traduce y resume TODO el contenido al ESPAÑOL.
        
        Noticia: "{text}"
        
        Estructura de Salida:
        {{
            "sentiment_score": <float entre -1.0 y 1.0>,
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
                    
                if len(unique_news) >= 20:
                    break
            
            return unique_news
            
        except Exception as e:
            print(f"Error fetching from Supabase: {e}")
            return []

@app.post("/webhook/news")
async def receive_news(news: Union[NewsItem, List[NewsItem]]):
    # Handle single item or list of items
    incoming_news = news if isinstance(news, list) else [news]
    
    saved_count = 0
    
    for item in incoming_news:
        print(f"Noticia recibida: {item.titulo}")
        
        # Initialize defaults if missing
        if not item.sentimiento:
            item.sentimiento = "Neutro"
        if not item.resumen:
             # If summary is missing, try to use title or default
            item.resumen = item.titulo if item.titulo else "Sin resumen disponible"

        # 1. Analyze with Gemini
        # Combine title and summary for better context
        full_text = f"{item.titulo or ''} - {item.resumen or ''}"
        
        try:
            analysis_result = await analyze_with_gemini(full_text)
            
            # 2. Merge analysis into item
            if analysis_result:
                if 'sentiment_score' in analysis_result:
                    item.sentiment_score = analysis_result['sentiment_score']
                
                # Logic: Force sentiment text based on score for consistency
                if item.sentiment_score is not None:
                    if item.sentiment_score > 0.3:
                        item.sentimiento = "Positivo"
                    elif item.sentiment_score < -0.3:
                        item.sentimiento = "Negativo"
                    else:
                        item.sentimiento = "Neutro"
                elif 'sentiment' in analysis_result:
                    # Fallback to AI label if score is missing (rare)
                    item.sentimiento = analysis_result['sentiment']

                if 'category' in analysis_result:
                    item.category = analysis_result['category']
                
                if 'tickers' in analysis_result:
                    item.tickers = analysis_result['tickers']
                    # Sync logic: if we have tickers, update 'empresas' too for legacy compat
                    item.empresas = analysis_result['tickers'] 
                
                if 'summary' in analysis_result and analysis_result['summary']:
                     # Valid "summary" from AI
                    item.summary_ai = analysis_result['summary']
                    item.resumen = analysis_result['summary']
                    
        except Exception as e:
            print(f"Error merging AI analysis: {e}. Using strict defaults.")
            # FORCE defaults to prevent Supabase 400
            if not item.sentimiento or item.sentimiento == "Neutro":
                item.sentimiento = "Neutro"
            
            # Ensure summary is NEVER None
            if not item.resumen:
                item.resumen = item.titulo if item.titulo else "Resumen no disponible por error de API"
            
            # Default enrichment fields
            if not item.category:
                 item.category = "General"
            if item.sentiment_score is None:
                 item.sentiment_score = 0.0
            if item.empresas is None:
                 item.empresas = []

        # 3. Construct Payload for Supabase (Strict Mapping)
        # Using item fields directly to handle aliases and updates
        
        # Ensure values for required fields
        final_sentiment = item.sentimiento if item.sentimiento else "Neutro"
        final_summary = item.resumen if item.resumen else "Resumen no disponible"
        
        payload = {
            "titulo": item.titulo,
            "resumen": final_summary,
            "enlace": item.enlace,
            "fecha": item.fecha,
            "sentimiento": final_sentiment,
            "score": item.sentiment_score, # Mapped from sentiment_score to score
            "category": item.category,
            "tickers": item.tickers,
            "empresas": item.empresas # Optional compatibility
        }
        
        # Log payload for debug (optional, can be removed)
        # print(f"Payload to Supabase: {payload}")

        if await save_to_supabase(payload):
            saved_count += 1
        
    return {"status": "success", "received_count": len(incoming_news), "saved_count": saved_count}

@app.get("/news")
async def get_news():
    return await fetch_from_supabase()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
