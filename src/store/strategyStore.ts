import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StrategyType } from '../services/backtestEngine';

interface StrategyState {
    strategy: StrategyType;
    emaFast: number;
    emaSlow: number;
    rsiPeriod: number;
    rsiThreshold: number;
    bollingerPeriod: number;
    bollingerStd: number;
    stopLossPct: number;
    takeProfitPct: number;
    isAutoTrading: boolean; // Managed globally for Mobile Header access

    setStrategy: (s: StrategyType) => void;
    setIsAutoTrading: (active: boolean) => void;
    setParams: (params: Partial<StrategyState>) => void;
}

export const useStrategyStore = create<StrategyState>()(
    persist(
        (set) => ({
            strategy: 'TREND_FOLLOWING',
            emaFast: 9,
            emaSlow: 21,
            rsiPeriod: 14,
            rsiThreshold: 50,
            bollingerPeriod: 20,
            bollingerStd: 2,
            stopLossPct: 5,
            takeProfitPct: 10,
            isAutoTrading: false,

            setStrategy: (strategy) => set({ strategy }),
            setIsAutoTrading: (active) => set({ isAutoTrading: active }),
            setParams: (params) => set((state) => ({ ...state, ...params })),
        }),
        {
            name: 'strategy-storage',
        }
    )
);
