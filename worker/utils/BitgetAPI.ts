
import axios from 'axios';
import crypto from 'crypto';

export class BitgetAPI {
    private apiKey: string;
    private apiSecret: string;
    private passphrase: string;
    private baseUrl: string = 'https://api.bitget.com';

    constructor() {
        this.apiKey = process.env.BITGET_API_KEY || '';
        this.apiSecret = process.env.BITGET_SECRET || '';
        this.passphrase = process.env.BITGET_PASSPHRASE || '';
    }

    private generateSignature(timestamp: string, method: string, requestPath: string, body: string = ''): string {
        const message = timestamp + method + requestPath + body;
        return crypto.createHmac('sha256', this.apiSecret).update(message).digest('base64');
    }

    private getHeaders(method: string, requestPath: string, body: string = '') {
        const timestamp = Date.now().toString();
        const signature = this.generateSignature(timestamp, method, requestPath, body);

        return {
            'ACCESS-KEY': this.apiKey,
            'ACCESS-SIGN': signature,
            'ACCESS-PASSPHRASE': this.passphrase,
            'ACCESS-TIMESTAMP': timestamp,
            'Content-Type': 'application/json',
            'locale': 'en-US'
        };
    }

    /**
     * Places a Market Sell Order on Bitget Spot
     * @param symbol Symbol (e.g., BTCUSDT)
     * @param quantity Quantity to sell
     * @returns API Response
     */
    public async placeMarketSellOrder(symbol: string, quantity: number) {
        if (!this.apiKey || !this.apiSecret) {
            throw new Error("Bitget API credentials not configured");
        }

        const requestPath = '/api/v2/spot/trade/place-order';
        const method = 'POST';
        const body = JSON.stringify({
            symbol: symbol,
            side: 'sell',
            orderType: 'market',
            quantity: quantity.toString(),
            force: 'gtc'
        });

        const headers = this.getHeaders(method, requestPath, body);

        try {
            console.log(`📡 [BitgetAPI] Placing Market Sell Order: ${symbol} (${quantity})`);
            const response = await axios.post(`${this.baseUrl}${requestPath}`, body, { headers });

            if (response.data.code !== '00000') {
                throw new Error(`Bitget API Error: ${response.data.msg} (Code: ${response.data.code})`);
            }

            return response.data.data;
        } catch (error: any) {
            console.error(`❌ [BitgetAPI] Error placing order for ${symbol}:`, error.message);
            throw error;
        }
    }
}

export const bitgetApi = new BitgetAPI();
