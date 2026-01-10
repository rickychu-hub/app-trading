import os
import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Union

app = FastAPI()

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

# Data Model
class NewsItem(BaseModel):
    titulo: Optional[str] = None
    resumen: str
    sentimiento: str  # "Positivo", "Negativo", "Neutro"
    empresas: Optional[List[str]] = []
    enlace: Optional[str] = None
    fecha: Optional[str] = None

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
        
    url = f"{SUPABASE_URL}/rest/v1/news?select=*&order=created_at.desc"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.json()
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
        # Convert pydantic model to dict
        data = item.dict()
        # Insert into Supabase using REST API
        if await save_to_supabase(data):
            saved_count += 1
        
    return {"status": "success", "received_count": len(incoming_news), "saved_count": saved_count}

@app.get("/api/news")
async def get_news():
    return await fetch_from_supabase()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
