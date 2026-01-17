import { useState, useEffect } from 'react';
import { binanceService } from '../services/binancePriceService';

export const useBinancePrices = (tickers: string[]) => {
    const [prices, setPrices] = useState<Record<string, number>>({});

    useEffect(() => {
        if (tickers.length === 0) return;

        // Subscribe to all tickers
        tickers.forEach(ticker => {
            binanceService.subscribe(ticker);
        });

        // Ensure connection is active
        binanceService.connect();

        const handlePriceUpdate = (symbol: string, price: number) => {
            // Check if this update is relevant for our tickers
            // Ticker from binance is usually "BTCUSDT", but our list might be "BTC" or "BTCUSDT"
            // We need to normalize.

            const normalizedSymbol = symbol.replace('USDT', '');

            // Allow update if it matches one of our requested tickers (either exact match or base match)
            const isRelevant = tickers.some(t =>
                t === symbol ||
                t === normalizedSymbol ||
                `${t}USDT` === symbol
            );

            if (isRelevant) {
                setPrices(prev => ({
                    ...prev,
                    [normalizedSymbol]: price, // Store by base symbol for easier usage (e.g. "BTC")
                    [symbol]: price // Also store by full symbol just in case
                }));
            }
        };

        binanceService.addListener(handlePriceUpdate);

        return () => {
            binanceService.removeListener(handlePriceUpdate);
            // We do not unsubscribe from service to avoid affecting other components
        };
    }, [JSON.stringify(tickers)]); // Re-subscribe if list changes

    return prices;
};
