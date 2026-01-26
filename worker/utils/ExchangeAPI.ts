
import axios from 'axios';

interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export class ExchangeAPI {

    /**
     * Centralized Fetch with strict Rate Limiting Enforcer (Bottleneck).
     * Guarantees at least 3 seconds between calls to avoid WAF 418 bans.
     */
    public static async fetchPrice(symbol: string): Promise<number | null> {
        // 1. Mandatory Bottleneck Delay (3 seconds)
        await new Promise(r => setTimeout(r, 3000));

        try {
            // 2. Fetch with Camouflage Headers
            // Optimization: Fetch only 2 candles (current and previous) to save bandwidth if possible, 
            // but Binance minimum is often higher. Let's fetch the standard kline but with limit=2 for price check.
            const response = await axios.get('https://api.binance.com/api/v3/klines', {
                params: { symbol: symbol, interval: '1m', limit: 2 },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const candles = response.data;
            if (!candles || candles.length === 0) return null;

            // Return latest close price
            return parseFloat(candles[candles.length - 1][4]);

        } catch (e: any) {
            // 3. Smart Backoff for Rate Limits
            if (e.response && (e.response.status === 418 || e.response.status === 429)) {
                console.error(`⚠️ WAF Limit Hit (418/429) for ${symbol}. Backing off 60s...`);
                await new Promise(resolve => setTimeout(resolve, 60000));
                return null;
            }
            console.error(`⚠️ Error fetching price for ${symbol}:`, e.message);
            return null;
        }
    }

    /**
     * Fetch Candles for Analysis (Full set)
     */
    public static async fetchCandles(symbol: string, interval: string = '1h', limit: number = 50): Promise<Candle[]> {
        // 1. Mandatory Bottleneck Delay (3 seconds)
        await new Promise(r => setTimeout(r, 3000));

        try {
            const response = await axios.get('https://api.binance.com/api/v3/klines', {
                params: { symbol, interval, limit },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            return response.data.map((d: any[]) => ({
                time: d[0],
                open: parseFloat(d[1]),
                high: parseFloat(d[2]),
                low: parseFloat(d[3]),
                close: parseFloat(d[4]),
                volume: parseFloat(d[5]),
            }));

        } catch (e: any) {
            if (e.response && (e.response.status === 418 || e.response.status === 429)) {
                console.error(`⚠️ WAF Limit Hit (418/429) for ${symbol}. Backing off 60s...`);
                await new Promise(resolve => setTimeout(resolve, 60000));
                return [];
            }
            console.error(`⚠️ Error fetching candles for ${symbol}:`, e.message);
            return [];
        }
    }
}
