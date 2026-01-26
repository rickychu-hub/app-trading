
import axios from 'axios';

interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

const ENDPOINTS = [
    'https://api.binance.com',
    'https://api1.binance.com',
    'https://api2.binance.com',
    'https://api3.binance.com',
    'https://data-api.binance.vision' // Endpoint research, permissive
];

export class ExchangeAPI {

    /**
     * Executes a GET request with Endpoint Rotation logic.
     * Tries multiple servers if a 418/429 WAF error occurs.
     */
    private static async requestWithRotation(path: string, params: any): Promise<any> {
        for (const baseUrl of ENDPOINTS) {
            try {
                // console.log(`👉 Trying via ${baseUrl}...`); // Log verbose if needed, user asked for it in prompt item 3
                // Ideally we log this only if we are rotating or debugging? 
                // User said: "Quiero ver en los logs qué puerta estamos usando: Trying via api3.binance.com..."

                const url = `${baseUrl}${path}`;
                console.log(`📡 Requesting: ${baseUrl}...`);

                const response = await axios.get(url, {
                    params: params,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    },
                    timeout: 5000 // fail fast if hanging
                });

                return response.data;

            } catch (e: any) {
                const status = e.response ? e.response.status : 0;

                if (status === 418 || status === 429) {
                    console.warn(`⚠️ WAF Blocked (${status}) on ${baseUrl}. Rotating to next endpoint...`);
                    continue; // Try next endpoint immediately
                }

                // If it's another error (e.g. 404, 500), we might want to throw or continue. 
                // For connection errors (timeout), we should also rotate.
                if (!e.response) {
                    console.warn(`⚠️ Connection Error on ${baseUrl}. Rotating...`);
                    continue;
                }

                // If it's a legitimate error from API (e.g. invalid symbol), throw it.
                // console.error(`❌ API Error on ${baseUrl}: ${e.message}`);
                throw e;
            }
        }

        throw new Error("All endpoints failed or blocked.");
    }

    /**
     * Centralized Fetch with strict Rate Limiting Enforcer (Bottleneck).
     * Guarantees massive jitter between calls to avoid WAF patterns.
     */
    public static async fetchPrice(symbol: string): Promise<number | null> {
        // 1. Mandatory Jitter Delay (3s to 5s)
        const delay = 3000 + Math.random() * 2000;
        await new Promise(r => setTimeout(r, delay));

        try {
            // 2. Fetch with Rotation
            // Optimization: limit=2
            const data = await this.requestWithRotation('/api/v3/klines', {
                symbol: symbol,
                interval: '1m',
                limit: 2
            });

            if (!data || data.length === 0) return null;

            // Return latest close price
            return parseFloat(data[data.length - 1][4]);

        } catch (e: any) {
            console.error(`❌ Failed to fetch price for ${symbol} after rotation:`, e.message);
            // If completely blocked, maybe pause globally? 
            // Logic says if all fail, we might return null and let the bot loop handle it.
            return null;
        }
    }

    /**
     * Fetch Candles for Analysis (Full set)
     */
    public static async fetchCandles(symbol: string, interval: string = '1h', limit: number = 50): Promise<Candle[]> {
        // 1. Mandatory Jitter Delay (3s to 5s)
        const delay = 3000 + Math.random() * 2000;
        await new Promise(r => setTimeout(r, delay));

        try {
            const data = await this.requestWithRotation('/api/v3/klines', {
                symbol: symbol,
                interval: interval,
                limit: limit
            });

            return data.map((d: any[]) => ({
                time: d[0],
                open: parseFloat(d[1]),
                high: parseFloat(d[2]),
                low: parseFloat(d[3]),
                close: parseFloat(d[4]),
                volume: parseFloat(d[5]),
            }));

        } catch (e: any) {
            console.error(`❌ Failed to fetch candles for ${symbol} after rotation:`, e.message);
            return [];
        }
    }
}
