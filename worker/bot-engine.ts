import { createClient } from '@supabase/supabase-js';
// @ts-ignore
import { RSI, EMA } from 'technicalindicators';
import { RiskManager } from './RiskManager';
import { NewsAuditor } from './skills/NewsAuditor';
import { ExchangeAPI } from './utils/ExchangeAPI';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Secure Key for Server
const LOOP_INTERVAL = 60000; // 1 minute

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("❌ CRITICAL: Missing credentials in .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
let globalUnrealizedPnL = 0; // Track aggregate performance of open positions

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

function calculateIndicators(candles: Candle[]) {
    const closes = candles.map(c => c.close);

    // EMA 9 & 21
    const emaFastInput = { values: closes, period: 9 };
    const emaSlowInput = { values: closes, period: 21 };

    // RSI 14
    const rsiInput = { values: closes, period: 14 };

    const emaFast = EMA.calculate(emaFastInput);
    const emaSlow = EMA.calculate(emaSlowInput);
    const rsi = RSI.calculate(rsiInput);

    // Get latest values (last index) & Previous
    return {
        price: closes[closes.length - 1],
        prevPrice: closes[closes.length - 2] || 0, // Close of previous candle
        emaFast: emaFast[emaFast.length - 1] || 0,
        emaSlow: emaSlow[emaSlow.length - 1] || 0,
        rsiCurrent: rsi[rsi.length - 1] || 50,
        rsiPrevious: rsi[rsi.length - 2] || 50
    };
}

// --- Trading Logic ---

async function executeTrade(ticker: string, price: number, amount: number, sentimentScore: number = 0, newsSummary: string = '') {
    if (!price || price <= 0) {
        console.warn(`⚠️ SKIPPING BUY: Invalid Price $${price} for ${ticker}`);
        return;
    }

    // 1. Check if we already have an open trade for this user/bot (Idempotency)
    const cleanTicker = ticker.replace('USDT', '').trim().toUpperCase();

    // Double Check: Verify if ANY open position exists for this ticker
    const { data: existingTrades, error: fetchError } = await supabase
        .from('paper_trades')
        .select('id, ticker, status')
        .eq('status', 'OPEN')
        .ilike('ticker', cleanTicker); // Use ilike for case-insensitivity

    if (fetchError) {
        console.error(`❌ DB Error checking duplicates for ${cleanTicker}:`, fetchError.message);
        return; // Fail safe
    }

    if (existingTrades && existingTrades.length > 0) {
        console.log(`⏸️  Skipping ${cleanTicker}: Position already open (ID: ${existingTrades[0].id}).`);
        return;
    }

    // 2. Insert Trade
    const quantity = amount / price;

    const { error } = await supabase.from('paper_trades').insert([{
        ticker: cleanTicker,
        entry_price: price,
        invested_amount: amount,
        quantity: quantity,
        initial_score: 90, // High score for manual confirmation strategy
        status: 'OPEN',
        news_id: 'BOT-RSI-CROSS', // Marker for this specific strategy
        news_sentiment_score: sentimentScore,
        news_summary: newsSummary
    }]);

    if (error) console.error(`❌ DB Insert Error for ${cleanTicker}:`, error.message);
    else console.log(`🚀 BUY EXECUTED: ${cleanTicker} @ $${price}`);
}

async function runMarketScan() {
    // 0. Safety Check via Risk Manager
    const riskStatus = await RiskManager.getInstance().checkTradeStatus(globalUnrealizedPnL);

    if (!riskStatus.canTrade) {
        console.warn(`🛑 MARKET SCAN SKIPPED: ${riskStatus.reason}`);
        console.log(`📉 Daily PnL: $${riskStatus.dailyPnL.toFixed(2)} (${riskStatus.dailyPnLPercent.toFixed(2)}%)`);
        return;
    }

    console.log(`\n🔎 Scanning Market [${new Date().toISOString()}]... (Risk Status: OK)`);

    for (const symbol of TOP_ASSETS) {
        console.log(`⏳ Processing ${symbol}...`);
        // 1. Fetch
        const candles = await ExchangeAPI.fetchCandles(symbol);
        if (candles.length < 30) continue;

        // 2. Analyze
        const { price, prevPrice, rsiCurrent, rsiPrevious } = calculateIndicators(candles);

        // 3. Logic: RSI Crossover (Dip Buying with Confirmation)
        // Condition A: Previous RSI was < 30 (Oversold)
        const wasOversold = rsiPrevious < 30;

        // Condition B: Current RSI > Previous RSI (Turning Up)
        const isRecovering = rsiCurrent > rsiPrevious;

        // Condition C: Green Candle (Price Confirmation)
        const isGreenCandle = price > prevPrice;

        const logMsg = `${symbol.padEnd(8)} | Price: ${price.toFixed(2)} | RSI Prev: ${rsiPrevious.toFixed(1)} -> Curr: ${rsiCurrent.toFixed(1)}`;
        // console.log(logMsg); 

        // 4. Decision
        if (wasOversold && isRecovering && isGreenCandle) {
            console.log(`✅ TECHNICAL FILTER PASSED: ${logMsg}`);

            // Phase 2: News Audit (Qualitative Check)
            const newsAnalysis = await NewsAuditor.analyzeSentiment(symbol);

            if (newsAnalysis.score < -0.5) {
                console.log(`⛔ BUY REJECTED: News Sentiment too negative (${newsAnalysis.score}) for ${symbol}. Summary: ${newsAnalysis.summary}`);
                continue;
            }

            console.log(`🚀 EXECUTING BUY: Sentiment Validated (${newsAnalysis.score}).`);
            await executeTrade(symbol, price, 1000, newsAnalysis.score, newsAnalysis.summary);
        } else if (wasOversold && !isRecovering) {
            console.log(`⚠️ Watching ${symbol} (Falling Knife): RSI ${rsiCurrent.toFixed(1)} still dropping...`);
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
        // Normalize Ticker to match Binance format (e.g. BTC -> BTCUSDT)
        const symbol = trade.ticker.endsWith('USDT') ? trade.ticker : `${trade.ticker}USDT`;

        // 2. Get Live Price
        const currentPrice = await ExchangeAPI.fetchPrice(symbol);
        if (!currentPrice || currentPrice <= 0) continue;

        const entryPrice = trade.entry_price || trade.invested_amount; // Fallback for legacy

        if (!entryPrice || entryPrice <= 0) continue;

        // 3. Risk Logic & Max Price Tracking
        let shouldSell = false;
        let reason = "";

        // A. Update Highest Price (Trailing Stop Base)
        // Ensure we have a valid baseline for highest price
        let highestPrice = trade.highest_price;
        if (!highestPrice || highestPrice < entryPrice) {
            highestPrice = entryPrice;
        }

        // If current price exceeds recorded highest, update it
        if (currentPrice > highestPrice) {
            highestPrice = currentPrice;

            // Persist new High to DB so we don't lose it if bot restarts
            await supabase
                .from('paper_trades')
                .update({ highest_price: highestPrice })
                .eq('id', trade.id);

            console.log(`📈 New High for ${trade.ticker}: $${highestPrice} (Tracking for Trailing Stop)`);
        }

        // B. Calculate Thresholds
        const dynamicStopPrice = highestPrice * 0.98; // 2% drop from Peak
        const hardStopPrice = entryPrice * 0.97;      // 3% drop from Entry (Safety Net)

        // C. Check Sell Conditions
        if (currentPrice < dynamicStopPrice) {
            // Condition 1: Trailing Stop Hit
            shouldSell = true;
            reason = `TRAILING STOP HIT (Dropped from Peak $${highestPrice})`;
        }
        else if (currentPrice < hardStopPrice) {
            // Condition 2: Safety Hard Stop Hit
            shouldSell = true;
            const pnl = ((currentPrice - entryPrice) / entryPrice) * 100;
            reason = `HARD STOP HIT (Safety Net Triggered at ${pnl.toFixed(2)}%)`;
        }

        // 4. Execute Sale
        if (shouldSell) {
            console.log(`🚨 EXECUTING SALE for ${trade.ticker}: ${reason}`);

            // Calc Final PnL Amount
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
            }
            if (!shouldSell) {
                currentLoopPnL += (currentPrice - entryPrice) * (trade.quantity || 0);
            }
        }

        globalUnrealizedPnL = currentLoopPnL;
        // console.log(`💰 Current Floating PnL: $${globalUnrealizedPnL.toFixed(2)}`);
    }
}

// --- Main Loop ---

async function startBot() {
    console.log('🤖 Headless Bot Worker Started...');
    console.log(`Targeting: ${TOP_ASSETS.join(', ')}`);

    while (true) {
        try {
            // Priority 1: Manage Risks (Sell before Buy)
            await managePositions();

            // Priority 2: Look for opportunities
            await runMarketScan();

            console.log('💤 Cycle complete. Sleeping...');
        } catch (error: any) {
            console.error('❌ Critical Loop Error:', error);
        }
        await new Promise(resolve => setTimeout(resolve, LOOP_INTERVAL));
    }
}

// Start
startBot();
