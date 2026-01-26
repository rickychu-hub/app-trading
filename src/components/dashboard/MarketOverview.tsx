
import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { binanceService } from '../../services/binancePriceService';
import { analysisService } from '../../services/analysisService';

const MarketOverview: React.FC = () => {
    const [btcPrice, setBtcPrice] = useState(0);
    const [btcChange24h, setBtcChange24h] = useState(0);
    const [marketTrend, setMarketTrend] = useState<'bullish' | 'bearish' | 'neutral'>('neutral');
    const [averageRSI, setAverageRSI] = useState(50);
    const [loading, setLoading] = useState(true);

    const TOP_ASSETS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];

    useEffect(() => {
        const fetchMarketData = async () => {
            try {
                // 1. Get BTC data
                const btcCandles = await binanceService.fetchHistoricalCandles('BTCUSDT', '1h', 300);

                if (btcCandles.length > 0) {
                    const currentPrice = btcCandles[btcCandles.length - 1].close;
                    const price24hAgo = btcCandles[btcCandles.length - 24]?.close || currentPrice;
                    const change24h = ((currentPrice - price24hAgo) / price24hAgo) * 100;

                    setBtcPrice(currentPrice);
                    setBtcChange24h(change24h);

                    // Calculate EMA200 for trend
                    const closes = btcCandles.map(c => c.close);
                    const ema200Series = analysisService.generateEMASeries(closes, 200);
                    const ema200 = ema200Series[ema200Series.length - 1];

                    if (ema200) {
                        setMarketTrend(currentPrice > ema200 ? 'bullish' : 'bearish');
                    }
                }

                // 2. Calculate Average RSI across top assets
                let totalRSI = 0;
                let count = 0;

                for (const asset of TOP_ASSETS) {
                    try {
                        const candles = await binanceService.fetchHistoricalCandles(asset, '1h', 30);
                        if (candles.length > 0) {
                            const rsiSeries = analysisService.generateRSISeries(candles, 14);
                            const currentRSI = rsiSeries[rsiSeries.length - 1];
                            if (currentRSI) {
                                totalRSI += currentRSI;
                                count++;
                            }
                        }
                    } catch (e) {
                        // Skip if error
                    }
                }

                if (count > 0) {
                    setAverageRSI(totalRSI / count);
                }

                setLoading(false);
            } catch (error) {
                console.error('Error fetching market data:', error);
                setLoading(false);
            }
        };

        fetchMarketData();
        const interval = setInterval(fetchMarketData, 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    const getRSIStatus = (rsi: number) => {
        if (rsi < 30) return { label: 'Sobrevendido', color: 'text-green-400' };
        if (rsi > 70) return { label: 'Sobrecomprado', color: 'text-red-400' };
        return { label: 'Neutral', color: 'text-gray-400' };
    };

    const rsiStatus = getRSIStatus(averageRSI);

    return (
        <div className="glass-panel rounded-xl border border-white/10 p-4 h-full flex flex-col">
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                <Activity size={14} /> Market Overview
            </h3>

            <div className="flex-1 space-y-4">
                {/* BTC Status - Large */}
                <div className="bg-black/20 rounded-lg p-4 border border-white/5">
                    <div className="text-xs text-gray-500 mb-1">Bitcoin (BTC)</div>
                    <div className="flex items-end justify-between">
                        <div>
                            <div className="text-2xl font-bold text-white">
                                {loading ? '...' : `$${btcPrice.toLocaleString()}`}
                            </div>
                            <div className={`text-sm font-bold ${btcChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {loading ? '...' : `${btcChange24h >= 0 ? '+' : ''}${btcChange24h.toFixed(2)}%`}
                            </div>
                        </div>
                        {!loading && (
                            btcChange24h >= 0
                                ? <TrendingUp size={32} className="text-green-400 opacity-50" />
                                : <TrendingDown size={32} className="text-red-400 opacity-50" />
                        )}
                    </div>
                </div>

                {/* Market Trend */}
                <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                    <div className="text-xs text-gray-500 mb-2">Tendencia Global</div>
                    <div className="flex items-center gap-2">
                        {marketTrend === 'bullish' ? (
                            <>
                                <span className="h-3 w-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]"></span>
                                <span className="text-sm font-bold text-green-400">🟢 Mercado Alcista</span>
                            </>
                        ) : marketTrend === 'bearish' ? (
                            <>
                                <span className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]"></span>
                                <span className="text-sm font-bold text-red-400">🔴 Mercado Bajista</span>
                            </>
                        ) : (
                            <>
                                <span className="h-3 w-3 rounded-full bg-gray-500"></span>
                                <span className="text-sm font-bold text-gray-400">⚪ Neutral</span>
                            </>
                        )}
                    </div>
                    <div className="text-[10px] text-gray-600 mt-1">
                        {marketTrend === 'bullish' ? 'BTC > EMA200' : marketTrend === 'bearish' ? 'BTC < EMA200' : 'Calculando...'}
                    </div>
                </div>

                {/* Average RSI */}
                <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                    <div className="text-xs text-gray-500 mb-2">RSI Promedio (Top 5)</div>
                    <div className="flex items-center justify-between">
                        <div className={`text-xl font-bold font-mono ${rsiStatus.color}`}>
                            {loading ? '...' : averageRSI.toFixed(1)}
                        </div>
                        <div className={`text-xs font-bold ${rsiStatus.color}`}>
                            {rsiStatus.label}
                        </div>
                    </div>
                    {/* RSI Bar */}
                    <div className="mt-2 w-full bg-gray-800/50 rounded-full h-1.5 overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${averageRSI < 30 ? 'bg-green-500' :
                                    averageRSI > 70 ? 'bg-red-500' :
                                        'bg-gray-500'
                                }`}
                            style={{ width: `${Math.min(averageRSI, 100)}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarketOverview;
