import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// @ts-ignore
import { RSI, EMA, ATR } from 'technicalindicators';
import { RiskManager } from './RiskManager';
import { NewsAuditor } from './skills/NewsAuditor';
import { ExchangeAPI } from './utils/ExchangeAPI';
import { telegramService } from './utils/TelegramService';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Secure Key for Server
const LOOP_INTERVAL = 300000; // 5 minutes (more efficient for 1H strategy)
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || '';

// Strategy Constants
const TIMEFRAME = '1h';
const CONSOLIDATION_PERIODS = 30;
const MAX_BOX_VOLATILITY = 0.02; // 2%
const VOLUME_MA_PERIOD = 20;
const VOLUME_MULTIPLIER = 1.2;
const FALLING_KNIFE_THRESHOLD = -5; // -5%
const FALLING_KNIFE_LOOKBACK = 4;   // 4 hours
const FREEZE_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours


if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("❌ CRITICAL: Missing credentials in .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
let globalUnrealizedPnL = 0; // Track aggregate performance of open positions
let isDumpingAlertActive = false; // Track if we've already notified about BTC dumping
const frozenAssets = new Map<string, number>(); // Ticker -> Unfreeze Timestamp


const TOP_ASSETS = [
    // 1. Los Reyes (Seguridad y Volumen)
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
    // 2. Capa 1 Alternativas (Alta Volatilidad, Proyectos Serios)
    'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'NEARUSDT', 'SUIUSDT', 'APTUSDT', 'TRXUSDT', 'MATICUSDT',
    // 3. Inteligencia Artificial (El Sector de Moda)
    'FETUSDT', 'RNDRUSDT', 'TAOUSDT', 'ICPUSDT',
    // 4. DeFi & Infraestructura
    'LINKUSDT', 'UNIUSDT', 'AAVEUSDT', 'OPUSDT', 'ARBUSDT', 'TIAUSDT', 'INJUSDT',
    // 5. Memecoins "Blue Chip" (Volatilidad Extrema pero Líquida)
    'DOGEUSDT', 'SHIBUSDT', 'PEPEUSDT', 'WIFUSDT'
];

interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

// --- Analysis Services (Mirrored from Frontend) ---

// --- Analysis Services (Mirrored from Frontend) ---

// fetchCandles removed, using ExchangeAPI directly

function detectConsolidation(candles: Candle[]) {
    if (candles.length < CONSOLIDATION_PERIODS) return { valid: false, high: 0, low: 0, volatility: 0 };


    const lookback = candles.slice(-CONSOLIDATION_PERIODS);
    const high = Math.max(...lookback.map(c => c.high));
    const low = Math.min(...lookback.map(c => c.low));

    const volatility = (high - low) / low;
    const valid = volatility <= MAX_BOX_VOLATILITY;

    return { valid, high, low, volatility: volatility || 0 };
}


function calculateIndicators(candles: Candle[]) {
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);

    // SMAs for Volume
    const volSMA = volumes.slice(-VOLUME_MA_PERIOD).reduce((a, b) => a + b, 0) / VOLUME_MA_PERIOD;

    // RSI 14
    const rsiInput = { values: closes, period: 14 };

    // ATR 14 (for Volatility Guard)
    const atrInput = { high: highs, low: lows, close: closes, period: 14 };

    const rsi = RSI.calculate(rsiInput);
    const atr = ATR.calculate(atrInput);
    const ema200 = EMA.calculate({ period: 200, values: closes });

    return {
        price: closes[closes.length - 1],
        prevPrice: closes[closes.length - 2] || 0,
        rsiCurrent: rsi[rsi.length - 1] || 50,
        atr: atr[atr.length - 1] || 0,
        ema200: ema200[ema200.length - 1] || 0,
        volSMA: volSMA,
        currentVolume: volumes[volumes.length - 1]
    };
}


// --- Trading Logic ---

async function executeTrade(
    ticker: string,
    price: number,
    amount: number,
    sentimentScore: number = 0,
    newsSummary: string = '',
    stopLossPrice?: number,
    takeProfitPrice?: number
) {
    if (!price || price <= 0) {
        console.warn(`⚠️ SKIPPING BUY: Invalid Price $${price} for ${ticker}`);
        return;
    }

    // 1. Check if we already have an open trade
    const cleanTicker = ticker.replace('USDT', '').trim().toUpperCase();

    const { data: existingTrades, error: fetchError } = await supabase
        .from('paper_trades')
        .select('id, ticker, status')
        .eq('status', 'OPEN')
        .ilike('ticker', cleanTicker);

    if (fetchError) {
        console.error(`❌ DB Error checking duplicates for ${cleanTicker}:`, fetchError.message);
        return;
    }

    if (existingTrades && existingTrades.length > 0) {
        console.log(`⏸️  Skipping ${cleanTicker}: Position already open.`);
        return;
    }

    // 2. On-Demand Neural Veto (Active n8n Trigger)
    if (N8N_WEBHOOK_URL) {
        console.log(`🧠 [WAITING_FOR_VETO] Triggering Neural Validation for ${cleanTicker}...`);
        try {
            const response = await axios.post(N8N_WEBHOOK_URL, {
                ticker: cleanTicker,
                price: price,
                strategy: 'SWING-BOX-BREAKOUT-ON-DEMAND',
                timestamp: new Date().toISOString()
            }, { timeout: 15000 }); // 15s Timeout as requested

            const decision = response.data?.decision;
            const reason = response.data?.reason || 'Market Sentiment';

            if (decision === 'PROCEED') {
                console.log(`✅ NEURAL VETO: n8n approved ${cleanTicker}. Proceeding immediately.`);
            } else if (decision === 'VETO') {
                console.log(`⛔ NEURAL VETO: n8n rejected trade for ${cleanTicker}. Reason: ${reason}`);
                return;
            } else {
                console.warn(`⚠️ NEURAL VETO: Inconclusive decision for ${cleanTicker}. Cancelling for safety.`);
                return;
            }
        } catch (e: any) {
            console.error(`❌ NEURAL VETO TIMEOUT/ERROR: No response from n8n in 15s for ${cleanTicker}. Operación cancelada por Veto Neural o Timeout.`);
            return;
        }
    } else {
        console.warn(`⚠️ N8N_WEBHOOK_URL not configured. Skipping Neural Veto for ${cleanTicker}.`);
    }



    // 3. Insert Trade
    const quantity = amount / price;

    const { error } = await supabase.from('paper_trades').insert([{
        ticker: cleanTicker,
        entry_price: price,
        invested_amount: amount,
        quantity: quantity,
        initial_score: 95,
        status: 'OPEN',
        news_id: 'SWING-BOX',
        news_sentiment_score: sentimentScore,
        news_summary: newsSummary,
        stop_loss: stopLossPrice,
        take_profit: takeProfitPrice
    }]);

    if (error) {
        console.error(`❌ DB Insert Error for ${cleanTicker}:`, error.message);
    } else {
        console.log(`🚀 BUY EXECUTED: ${cleanTicker} @ $${price}`);

        let details = `<b>Cantidad:</b> ${quantity.toFixed(4)} ${cleanTicker}\n` +
            `<b>Inversión:</b> $${amount.toFixed(2)}`;

        if (stopLossPrice) {
            const slPercent = ((price - stopLossPrice) / price) * 100;
            details += `\n<b>Stop Loss:</b> $${stopLossPrice.toFixed(2)} (-${slPercent.toFixed(2)}%)`;
        }

        if (takeProfitPrice) {
            const tpPercent = ((takeProfitPrice - price) / price) * 100;
            details += `\n<b>Take Profit:</b> $${takeProfitPrice.toFixed(2)} (+${tpPercent.toFixed(2)}%)`;
        }

        await telegramService.notifyTrade('BUY', cleanTicker, price, details);
    }
}


async function runMarketScan() {
    // 0. Safety Check via Risk Manager
    const riskStatus = await RiskManager.getInstance().checkTradeStatus(globalUnrealizedPnL);

    if (!riskStatus.canTrade) {
        console.warn(`🛑 MARKET SCAN SKIPPED: ${riskStatus.reason}`);
        console.log(`📉 Daily PnL: $${riskStatus.dailyPnL.toFixed(2)} (${riskStatus.dailyPnLPercent.toFixed(2)}%)`);
        return;
    }

    const anyFrozen = TOP_ASSETS.some(s => {
        const unfreezeAt = frozenAssets.get(s);
        return unfreezeAt && Date.now() < unfreezeAt;
    });

    console.log(`\n🔎 Scanning Market [${new Date().toISOString()}]...`);
    console.log(`🛡️ Estado de Protección: ${anyFrozen ? '❄️ CONGELADO (Algunos activos)' : '✅ ACTIVO'}`);


    // ========================================
    // THE KING'S MOOD - BTC Sentiment Check
    // ========================================
    console.log('\n👑 Checking The King\'s Mood (BTC)...');
    const btcCandles = await ExchangeAPI.fetchCandles('BTCUSDT', '1h', 50);

    if (btcCandles.length >= 2) {
        const btcCurrentPrice = btcCandles[btcCandles.length - 1].close;
        const btcPreviousPrice = btcCandles[btcCandles.length - 2].close;
        const btcChange1h = ((btcCurrentPrice - btcPreviousPrice) / btcPreviousPrice) * 100;

        console.log(`📊 BTC: $${btcCurrentPrice.toFixed(2)} | 1h Change: ${btcChange1h.toFixed(2)}%`);

        if (btcChange1h < -1.0) {
            console.log(`👑 BTC is dumping (${btcChange1h.toFixed(2)}%). Freezing all buys. 🚫`);
            console.log(`⏸️  Market scan aborted. Waiting for BTC recovery...\n`);

            // Send Telegram alert ONLY if not already active
            if (!isDumpingAlertActive) {
                isDumpingAlertActive = true;
                await telegramService.notifyAlert(
                    'BTC Dumping - Trading Paused',
                    `👑 Bitcoin está cayendo <b>${btcChange1h.toFixed(2)}%</b> en la última hora.\n\n` +
                    `Todas las compras están congeladas hasta que BTC se recupere.\n\n` +
                    `<b>Precio BTC:</b> $${btcCurrentPrice.toFixed(2)}`
                );
            }

            return; // Skip entire scan cycle
        } else {
            // Check for recovery
            if (isDumpingAlertActive) {
                isDumpingAlertActive = false;
                await telegramService.notifyAlert(
                    'BTC Recovered - Trading Resumed',
                    `✅ Bitcoin se está estabilizando (Cambio 1h: ${btcChange1h.toFixed(2)}%).\n\n` +
                    `El escaneo de mercado y las compras se han reanudado.\n\n` +
                    `<b>Precio BTC:</b> $${btcCurrentPrice.toFixed(2)}`
                );
            }
            console.log(`✅ BTC sentiment: ${btcChange1h >= 0 ? 'Bullish' : 'Neutral'}. Proceeding with scan.\n`);
        }
    } else {
        console.log('⚠️  Unable to fetch BTC data. Proceeding with caution...\n');
    }

    for (const symbol of TOP_ASSETS) {
        // 0. Freeze Check
        const unfreezeAt = frozenAssets.get(symbol);
        if (unfreezeAt && Date.now() < unfreezeAt) {
            console.log(`❄️ ${symbol} is frozen until ${new Date(unfreezeAt).toLocaleTimeString()}. Skipping.`);
            continue;
        }

        console.log(`⏳ Processing ${symbol}...`);

        // 1. Fetch 1H candles
        const candles = await ExchangeAPI.fetchCandles(symbol, TIMEFRAME, 100);
        if (candles.length < 50) continue;

        // 2. Analyze indicators
        const { price, prevPrice, atr, ema200, volSMA, currentVolume } = calculateIndicators(candles);

        // 3. Falling Knife Detection (5% drop in 4h)
        const price4hAgo = candles[candles.length - 5]?.close || candles[0].close;
        const change4h = ((price - price4hAgo) / price4hAgo) * 100;

        if (change4h <= FALLING_KNIFE_THRESHOLD) {
            console.warn(`🔪 FALLING KNIFE: ${symbol} dropped ${change4h.toFixed(2)}% in 4h. Freezing for 12h.`);
            frozenAssets.set(symbol, Date.now() + FREEZE_DURATION_MS);
            await telegramService.notifyAlert(
                `Falling Knife - ${symbol}`,
                `⚠️ <b>${symbol}</b> ha caído un <b>${change4h.toFixed(2)}%</b> en 4 horas.\n` +
                `Congelado por 12 horas para evitar operar en caída libre.`
            );
            continue;
        }

        // 4. Consolidation Check (The Box)
        const box = detectConsolidation(candles.slice(0, -1)); // Check box on previous 30 candles

        if (!box.valid) {
            console.log(`📦 ${symbol}: No valid consolidation box (Volat: ${(box.volatility * 100).toFixed(2)}% > 2%). Skipping.`);
            continue;
        }

        console.log(`📦 ${symbol}: Box found [$${box.low.toFixed(2)} - $${box.high.toFixed(2)}]. Scanning for breakout...`);

        // 5. Trigger Logic
        const isBreakout = price > box.high && prevPrice <= box.high;
        const volumeConfirmed = currentVolume > volSMA * VOLUME_MULTIPLIER;

        if (isBreakout && volumeConfirmed) {
            console.log(`🚀 BREAKOUT DETECTED for ${symbol}!`);
            console.log(`   Price: $${price.toFixed(2)} > High: $${box.high.toFixed(2)}`);
            console.log(`   Volume: ${currentVolume.toFixed(0)} > 1.2x SMA: ${(volSMA * 1.2).toFixed(0)}`);

            // 6. Volatility Guard (ATR)
            const stopLossPrice = price - (atr * 2);
            const takeProfitPrice = price + (atr * 3); // 1:1.5 Risk/Reward

            // 7. News Audit
            const newsAnalysis = await NewsAuditor.analyzeSentiment(symbol);
            if (newsAnalysis.score < -0.4) {
                console.log(`⛔ NEWS VETO: Sentiment too negative (${newsAnalysis.score}) for ${symbol}.`);
                continue;
            }

            // 8. Execute with Veto
            await executeTrade(symbol, price, 1000, newsAnalysis.score, newsAnalysis.summary, stopLossPrice, takeProfitPrice);
        } else {
            if (isBreakout) console.log(`⚠️ Breakout without volume confirmation for ${symbol}.`);
        }
    }
}


// --- Main Loop ---

async function managePositions() {
    console.log("🛡️ Checking Risk Levels for Open Positions...");

    // 1. Fetch ALL Open Trades
    const { data: openTrades, error } = await supabase
        .from('paper_trades')
        .select('*')
        .eq('status', 'OPEN');

    if (error || !openTrades || openTrades.length === 0) {
        globalUnrealizedPnL = 0;
        return;
    }

    let currentLoopPnL = 0;

    for (const trade of openTrades) {
        console.log(`⏳ Checking trade ${trade.ticker} (ID: ${trade.id})...`);
        const symbol = trade.ticker.endsWith('USDT') ? trade.ticker : `${trade.ticker}USDT`;

        // 2. Get Live Price
        const currentPrice = await ExchangeAPI.fetchPrice(symbol);
        if (!currentPrice || currentPrice <= 0) continue;

        const entryPrice = trade.entry_price || trade.invested_amount;
        if (!entryPrice || entryPrice <= 0) continue;

        // 3. Trailing & Break-Even Logic
        let currentStopLoss = trade.stop_loss;
        let shouldSell = false;
        let reason = "";

        const currentProfitPercent = ((currentPrice - entryPrice) / entryPrice) * 100;

        // A. Break-Even Trigger (1.5% Profit)
        if (currentProfitPercent >= 1.5) {
            const breakEvenPrice = entryPrice * 1.001; // Entry + 0.1% commission
            if (!currentStopLoss || breakEvenPrice > currentStopLoss) {
                console.log(`🛡️ BREAK-EVEN: ${trade.ticker} profit ${currentProfitPercent.toFixed(2)}% >= 1.5%. Moving SL to $${breakEvenPrice.toFixed(2)}.`);
                currentStopLoss = breakEvenPrice;

                await supabase
                    .from('paper_trades')
                    .update({ stop_loss: currentStopLoss })
                    .eq('id', trade.id);
            }
        }

        // B. Check Sell Conditions
        if (currentStopLoss && currentPrice <= currentStopLoss) {
            shouldSell = true;
            reason = `STOP LOSS HIT @ $${currentPrice.toFixed(2)} (SL: $${currentStopLoss.toFixed(2)})`;
        } else if (trade.take_profit && currentPrice >= trade.take_profit) {
            shouldSell = true;
            reason = `TAKE PROFIT HIT @ $${currentPrice.toFixed(2)} (TP: $${trade.take_profit.toFixed(2)})`;
        }

        // 4. Execute Sale
        if (shouldSell) {
            console.log(`🚨 EXECUTING SALE for ${trade.ticker}: ${reason}`);

            const invested = trade.invested_amount || entryPrice;
            const quantity = trade.quantity || (invested / entryPrice);
            const exitValue = quantity * currentPrice;
            const finalPnL = exitValue - invested;

            const { error: closeError } = await supabase
                .from('paper_trades')
                .update({
                    status: 'CLOSED',
                    exit_price: currentPrice,
                    exit_time: new Date().toISOString(),
                    final_pnl: finalPnL,
                    close_reason: reason
                })
                .eq('id', trade.id);

            if (closeError) {
                console.error(`❌ FAILED to close trade ${trade.id}:`, closeError.message);
            } else {
                console.log(`✅ Trade ${trade.id} CLOSED successfully.`);

                const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
                const details = `<b>PnL:</b> $${finalPnL.toFixed(2)} (${pnlPercent.toFixed(2)}%)\n` +
                    `<b>Reason:</b> ${reason}`;

                await telegramService.notifyTrade('SELL', trade.ticker, currentPrice, details);
            }
        } else {
            currentLoopPnL += (currentPrice - entryPrice) * (trade.quantity || 0);
        }
    }

    globalUnrealizedPnL = currentLoopPnL;
    console.log(`💰 Total Unrealized PnL: $${globalUnrealizedPnL.toFixed(2)}`);
}

// --- Main Loop ---

async function startBot() {
    console.log('🤖 Headless Bot Worker Started (Swing Strategy)...');
    console.log(`Targeting: ${TOP_ASSETS.join(', ')}`);

    await telegramService.notifyStartup('Swing Box Breakout + ATR + Neural Veto');

    while (true) {
        try {
            await managePositions();
            await runMarketScan();
            console.log(`💤 Cycle complete. Sleeping ${LOOP_INTERVAL / 60000}m...`);
        } catch (error: any) {
            console.error('❌ Critical Loop Error:', error);
        }
        await new Promise(resolve => setTimeout(resolve, LOOP_INTERVAL));
    }
}

// Start
startBot();
