# PLAN DE AUDITORÍA Y REPARACIÓN - SISTEMA DE TRADING

## 1. Análisis de Estado Actual
### Arquitectura
- **Frontend**: Next.js (React) con Componentes de Dashboard (`PaperTradingPanel`, `TradeModal`).
- **Backend / API**: FastAPI (`api/index.py`) actuando como proxy y lógica de negocio ligera.
- **Worker**: Script de Node.js (`worker/bot-engine.ts`) ejecutándose en bucle para trading automático.
- **Base de Datos**: Supabase (PostgreSQL) tablas `paper_trades` y `news`.

### Discrepancias Detectadas

#### A. Órdenes Duplicadas
*   **Diagnóstico**: El `bot-engine.ts` realiza una comprobación de idempotencia (Líneas 86-95), pero es vulnerable a condiciones de carrera si múltiples instancias del worker están activas (Local + Producción) o si la latencia de red es alta.
*   **Hallazgo Crítico**: La base de datos no parece tener una restricción `UNIQUE` compuesta en `(ticker, status='OPEN')`. Esto permite que si el chequeo de software falla (o se salta), la DB acepte el registro.
*   **Causa Secundaria**: El Frontend (`TradeModal`) permite compras manuales. Si el usuario hace clic compulsivamente o hay lag, podría enviar múltiples `POST` a la API antes de que el estado local se actualice.

#### B. Precios a $0
*   **Worker**: El bot tiene una guarda `if (!price || price <= 0) return;` (Línea 82). Es robusto aquí.
*   **Frontend**: El `TradeModal` valida `parseFloat(price) > 0` antes de habilitar el botón "Confirmar".
*   **API (Posible Vector)**: El endpoint `POST /trades` en `api/index.py` (Línea 352) **NO valida** que `entry_price` sea mayor a 0. Acepta cualquier float. Si un cliente (o un script malformado) envía `0`, se guarda.
*   **Hipótesis de "Precio Visual $0"**: En `PaperTradingPanel.tsx`, si la conexión WebSocket de precios falla, `livePrice` puede ser undefined, mostrando "Connecting...". Sin embargo, si `fetch` inicial falla o devuelve 0, podría verse mal.

#### C. Inconsistencia de Datos
*   **Ticker Normalization**: El bot usa `ticker.replace('USDT', '')` para limpiar. El frontend usa `ticker.replace(/[^A-Z0-9]/gi, '').toUpperCase()`. Esta discrepancia menor podría causar que `BTC` y `BTCUSDT` se traten como activos diferentes en verificaciones de unicidad.

---

## 2. Estrategia de Reparación (The Fix)

### Fase A: Base de Datos (Posición Única)
Dado que no puedo ejecutar SQL DDL directamente en Supabase desde aquí sin una herramienta específica configurada, simularé la restricción vía **Lógica de Código Reforzada** en ambos puntos de entrada (Worker y API).

### Fase B: El Ojo (Frontend)
1.  **Validación Visual**: Confirmar que las tarjetas de precios manejan `undefined` o `0` elegantemente.
2.  **Trade Modal**: Asegurar que el botón de confirmación se deshabilite inmediatamente tras el primer clic (prevent double submission).

### Fase C: La Defensa (Worker & API)
1.  **Bot Engine**:
    *   Implementar **Exponential Backoff** para llamadas a Binance (evitar crash por rate limits).
    *   Reforzar la verificación de duplicados normalizando Tickers agresivamente.
2.  **API (Python)**:
    *   Añadir validación `if trade.entry_price <= 0: raise HTTPException(...)`.
    *   Añadir verificación de duplicados en el endpoint `POST` antes de insertar.

---

## 3. Plan de Acción Inmediato
1.  **Navegador**: Verificar UX en `localhost:3000`.
2.  **Refactor Worker**: Implementar validaciones y retry loop.
3.  **Refactor API**: Implementar validación de precio > 0 y unicidad.
