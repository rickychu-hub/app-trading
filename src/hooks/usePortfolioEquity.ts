import { useState, useEffect, useMemo } from 'react';
import { useBinancePrices } from './useBinancePrices';

interface MinimalTrade {
    id: number;
    ticker: string;
    entry_price: number;
    invested_amount?: number;
    quantity?: number;
    status: string;
}

export const usePortfolioEquity = () => {
    const [trades, setTrades] = useState<MinimalTrade[]>([]);

    const fetchTrades = async () => {
        try {
            const response = await fetch("/api/trades");
            if (response.ok) {
                const data = await response.json();
                setTrades(data);
            }
        } catch (error) {
            console.error("Error fetching trades for equity:", error);
        }
    };

    useEffect(() => {
        fetchTrades();
        // Optional: polling or listener if necessary.
        // For now, fetch once on mount. If we want real-time sync with trade closing, we might need an event listener
        // matching the one in PaperTradingPanel.
        window.addEventListener('tradeResponse', fetchTrades);
        return () => window.removeEventListener('tradeResponse', fetchTrades);
    }, []);

    // Get active tickers
    const activeTickers = useMemo(() => {
        const tickers = new Set<string>();
        trades.forEach(t => {
            if (t.ticker && t.status === 'OPEN') {
                const clean = t.ticker.replace(/[^A-Z0-9]/gi, '').toUpperCase();
                tickers.add(clean);
            }
        });
        return Array.from(tickers);
    }, [trades]);

    // Live Prices
    const livePrices = useBinancePrices(activeTickers);

    // Calculate Equity
    const { totalEquity, totalInvested, pnl } = useMemo(() => {
        let currentTotal = 0;
        let investedTotal = 0;

        trades.forEach(t => {
            if (t.status === 'OPEN') {
                const qty = t.quantity || (t.invested_amount && t.entry_price ? t.invested_amount / t.entry_price : 1);
                const investedAmt = t.invested_amount || t.entry_price;

                const rawTicker = t.ticker || '';
                const ticker = rawTicker.replace(/[^A-Z0-9]/gi, '').toUpperCase();
                const live = livePrices[ticker] || livePrices[`${ticker}USDT`];

                const price = live ? Number(live) : t.entry_price; // Fallback to entry if not connected yet

                currentTotal += (price * qty);
                investedTotal += investedAmt;
            }
        });

        return {
            totalEquity: currentTotal,
            totalInvested: investedTotal,
            pnl: currentTotal - investedTotal
        };
    }, [trades, livePrices]);

    return { totalEquity, totalInvested, pnl };
};
