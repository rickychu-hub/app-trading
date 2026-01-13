import { create } from 'zustand';
import { binanceService } from '../services/binancePriceService';

interface PriceState {
    prices: Record<string, number>;
    connectionStatus: 'disconnected' | 'connecting' | 'connected';

    // Actions
    connect: () => void;
    disconnect: () => void;
    subscribeToSymbol: (symbol: string) => void;
    unsubscribeFromSymbol: (symbol: string) => void;
    getPrice: (symbol: string) => number | undefined;
}

export const usePriceStore = create<PriceState>((set, get) => ({
    prices: {},
    connectionStatus: 'disconnected',

    connect: () => {
        if (get().connectionStatus === 'connected') return;

        set({ connectionStatus: 'connecting' });

        binanceService.setPriceCallback((pair, price) => {
            // Update state efficiently
            // Extract base symbol if needed, or just store by pair name (BTCUSDT)
            // But UI might ask for 'BTC'. Let's handle 'BTC' -> 'BTCUSDT' logic mostly in service,
            // but here we receive 'BTCUSDT'.

            set((state) => ({
                prices: {
                    ...state.prices,
                    [pair]: price
                },
                connectionStatus: 'connected' // Assume connected on first message
            }));
        });

        binanceService.connect();
    },

    disconnect: () => {
        binanceService.disconnect();
        set({ connectionStatus: 'disconnected' });
    },

    subscribeToSymbol: (symbol: string) => {
        if (!symbol) return;
        // Ensure we are connected
        get().connect();

        binanceService.subscribe(symbol);
    },

    unsubscribeFromSymbol: (symbol: string) => {
        if (!symbol) return;
        binanceService.unsubscribe(symbol);
    },

    getPrice: (symbol: string) => {
        const prices = get().prices;
        const upper = symbol.toUpperCase();
        // Check for direct match or appended USDT
        return prices[upper] || prices[`${upper}USDT`];
    }
}));
