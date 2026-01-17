import { create } from 'zustand';

export interface BotLog {
    id: string;
    timestamp: string;
    ticker: string;
    rsi: number;
    decision: 'WAIT' | 'BUY' | 'SELL';
    reason: string;
}

interface BotState {
    logs: BotLog[];
    selectedAssets: string[];
    addLog: (log: Omit<BotLog, 'id'>) => void;
    clearLogs: () => void;
    toggleAsset: (ticker: string) => void;
    setAssets: (tickers: string[]) => void;
}

import { persist } from 'zustand/middleware';

export const useBotStore = create<BotState>()(
    persist(
        (set) => ({
            logs: [],
            selectedAssets: ['BTC'], // Default

            addLog: (log) => set((state) => {
                const newLog = { ...log, id: Math.random().toString(36).substr(2, 9) };
                // Keep last 50 logs to prevent memory overflow
                return { logs: [newLog, ...state.logs].slice(0, 50) };
            }),

            clearLogs: () => set({ logs: [] }),

            toggleAsset: (ticker) => set((state) => {
                const exists = state.selectedAssets.includes(ticker.toUpperCase());
                if (exists) {
                    if (state.selectedAssets.length === 1) return state; // Keep at least one
                    return { selectedAssets: state.selectedAssets.filter(t => t !== ticker.toUpperCase()) };
                } else {
                    return { selectedAssets: [...state.selectedAssets, ticker.toUpperCase()] };
                }
            }),

            setAssets: (tickers) => set({ selectedAssets: tickers }),
        }),
        {
            name: 'bot-storage',
        }
    )
);
