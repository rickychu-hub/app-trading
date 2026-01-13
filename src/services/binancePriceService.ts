type PriceCallback = (symbol: string, price: number) => void;

class BinancePriceService {
    private ws: WebSocket | null = null;
    private subscribers: Set<string> = new Set();
    private priceCallback: PriceCallback | null = null;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    private isExplicitlyDisconnected: boolean = false;
    private readonly BASE_URL = 'wss://stream.binance.com:9443/ws';

    constructor() { }

    setPriceCallback(callback: PriceCallback) {
        this.priceCallback = callback;
    }

    connect() {
        if (this.ws?.readyState === WebSocket.OPEN) return;

        this.isExplicitlyDisconnected = false;
        this.ws = new WebSocket(this.BASE_URL);

        this.ws.onopen = () => {
            console.log('Connected to Binance WebSocket');
            this.resubscribeAll();
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                // Handle aggTrade event
                // Format: { e: 'aggTrade', s: 'BTCUSDT', p: '30000.00', ... }
                if (data.e === 'aggTrade' && data.s && data.p) {
                    const symbol = data.s; // Already uppercase usually via Binance, e.g. BTCUSDT
                    const price = parseFloat(data.p);
                    if (this.priceCallback) {
                        this.priceCallback(symbol, price);
                    }
                }
            } catch (err) {
                console.error('Error parsing Binance message:', err);
            }
        };

        this.ws.onerror = (error) => {
            console.error('Binance WebSocket Error:', error);
        };

        this.ws.onclose = () => {
            console.log('Binance WebSocket Closed');
            if (!this.isExplicitlyDisconnected) {
                this.attemptReconnect();
            }
        };
    }

    private attemptReconnect() {
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => {
            console.log('Attempting to reconnect...');
            this.connect();
        }, 3000);
    }

    subscribe(symbol: string) {
        // Binance streams are lowercase, e.g. btcusdt@aggTrade
        const cleanSymbol = symbol.toUpperCase();
        // Just store the base ticker + USDT for simplicity if user passes 'BTC'
        const pair = cleanSymbol.endsWith('USDT') ? cleanSymbol : `${cleanSymbol}USDT`;

        if (!this.subscribers.has(pair)) {
            this.subscribers.add(pair);
            this.sendSubscription(pair, 'SUBSCRIBE');
        }
    }

    unsubscribe(symbol: string) {
        const cleanSymbol = symbol.toUpperCase();
        const pair = cleanSymbol.endsWith('USDT') ? cleanSymbol : `${cleanSymbol}USDT`;

        if (this.subscribers.has(pair)) {
            this.subscribers.delete(pair);
            this.sendSubscription(pair, 'UNSUBSCRIBE');
        }
    }

    private sendSubscription(pair: string, method: 'SUBSCRIBE' | 'UNSUBSCRIBE') {
        if (this.ws?.readyState === WebSocket.OPEN) {
            const streamName = `${pair.toLowerCase()}@aggTrade`;
            const payload = {
                method: method,
                params: [streamName],
                id: Date.now()
            };
            this.ws.send(JSON.stringify(payload));
        }
    }

    private resubscribeAll() {
        if (this.subscribers.size === 0) return;

        const streams = Array.from(this.subscribers).map(pair => `${pair.toLowerCase()}@aggTrade`);
        const payload = {
            method: 'SUBSCRIBE',
            params: streams,
            id: Date.now()
        };
        this.ws.send(JSON.stringify(payload));
    }

    disconnect() {
        this.isExplicitlyDisconnected = true;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

export const binanceService = new BinancePriceService();
