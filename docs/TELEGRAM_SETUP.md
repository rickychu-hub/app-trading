# Configuración de Notificaciones de Telegram

Este documento explica cómo configurar las notificaciones de Telegram para recibir alertas en tiempo real del bot de trading.

## 📱 Paso 1: Crear un Bot de Telegram

1. Abre Telegram y busca **@BotFather**
2. Envía el comando `/newbot`
3. Sigue las instrucciones:
   - Elige un nombre para tu bot (ej: "My Trading Bot")
   - Elige un username (debe terminar en 'bot', ej: "my_trading_bot")
4. **Guarda el token** que te proporciona BotFather
   - Se verá algo así: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

## 🆔 Paso 2: Obtener tu Chat ID

### Opción A: Usando @userinfobot
1. Busca **@userinfobot** en Telegram
2. Envía `/start`
3. El bot te responderá con tu **Chat ID**
4. Guarda este número (ej: `123456789`)

### Opción B: Usando tu propio bot
1. Envía un mensaje a tu bot (el que creaste con BotFather)
2. Abre en tu navegador:
   ```
   https://api.telegram.org/bot<TU_TOKEN>/getUpdates
   ```
3. Busca el campo `"chat":{"id":123456789}`
4. Ese número es tu Chat ID

## ⚙️ Paso 3: Configurar Variables de Entorno

Añade estas líneas a tu archivo `.env`:

```bash
# Telegram Notifications
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789
```

## ✅ Paso 4: Verificar Configuración

Reinicia el bot worker:
```bash
npm run worker
```

Deberías recibir un mensaje de Telegram:
```
🤖 Bot Iniciado

Estrategia: EMA200 + ATR + BTC Protection + News Sentiment
Hora: [fecha y hora]
Estado: Operativo ✅
```

## 📬 Tipos de Notificaciones

El bot enviará notificaciones para:

### 🚀 Compras Ejecutadas
```
🚀 BUY Executed

Asset: ETH
Price: $2,450.00
Cantidad: 0.4082 ETH
Inversión: $1,000.00
Stop Loss: $2,359.60 (-3.69%)
Take Profit: $2,585.60 (+5.53%)
Sentiment Score: 0.75
```

### 💰 Ventas Ejecutadas
```
💰 SELL Executed

Asset: BTC
Price: $45,200.00
PnL: +$125.50 (+2.51%)
```

### ⚠️ Alertas Críticas
```
⚠️ BTC Dumping - Trading Paused

👑 Bitcoin está cayendo -1.25% en la última hora.

Todas las compras están congeladas hasta que BTC se recupere.

Precio BTC: $43,850.00
```

## 🔕 Desactivar Notificaciones

Si no quieres recibir notificaciones:
1. Simplemente **no configures** las variables de Telegram en `.env`
2. El bot funcionará normalmente pero solo mostrará logs en consola

## 🛠️ Solución de Problemas

### "Telegram not configured"
- Verifica que las variables estén en `.env`
- Asegúrate de que no haya espacios extra
- Reinicia el worker

### No recibo mensajes
- Verifica que hayas enviado `/start` a tu bot
- Comprueba que el Chat ID sea correcto
- Revisa que el token sea válido

### Error 401 Unauthorized
- El token del bot es incorrecto
- Crea un nuevo bot con @BotFather

## 📚 Recursos

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [BotFather Commands](https://core.telegram.org/bots#6-botfather)
