import React, { useEffect, useState, useRef } from 'react';
import { Activity, ArrowUp, ArrowDown, Minus, Play } from 'lucide-react';
import { useStrategyStore } from '../../store/strategyStore';
import { binanceService } from '../../services/binancePriceService';
import { analysisService } from '../../services/analysisService';
import { type Candle } from '../../services/backtestEngine';

const StrategyMonitor: React.FC = () => {
    const params = useStrategyStore();
    const [price, setPrice] = useState<number>(0);
    const [status, setStatus] = useState<'NEUTRAL' | 'BUY' | 'SELL' | 'WAITING'>('WAITING');
    const [indicators, setIndicators] = useState<{ rsi: number, emaFast: number, emaSlow: number } | null>(null);
    const candlesRef = useRef<Candle[]>([]);

    // On Mount: Fetch history and subscribe
    useEffect(() => {
        const symbol = 'BTCUSDT'; // Default for monitor
        const timeframe = '1h'; // Default for monitor (could be dynamic)

        const init = async () => {
            try {
                // 1. Get History (for indicators)
                const history = await binanceService.fetchHistoricalCandles(symbol, timeframe, 100);
                candlesRef.current = history;

                // 2. Subscribe to Live Price
                binanceService.connect();
                binanceService.subscribe(symbol);
                binanceService.setPriceCallback((s, p) => {
                    if (s === symbol) {
                        setPrice(p);
                        updateLogic(p);
                    }
                });
            } catch (e) {
                console.error("Monitor init failed", e);
            }
        };

        init();

        return () => {
            binanceService.unsubscribe(symbol);
        };
    }, []);

    const updateLogic = (currentPrice: number) => {
        // Simple Real-time Simulation: 
        // We update the Close of the LAST candle with current price to simulate "Tick"
        // In a real app, we'd manage a proper Candle Buffer handling time rollovers.
        // For this demo, we just verify indicators based on current state.

        if (candlesRef.current.length === 0) return;

        const lastIndex = candlesRef.current.length - 1;
        // Clone to avoid mutating Ref directly for React purity if we were using state for candles
        // But here we use Ref for perf, so we mutate the last candle "Close"
        candlesRef.current[lastIndex].close = currentPrice;

        // Recalculate Indicators
        const data = candlesRef.current;
        const i = lastIndex;

        // Calc RSI
        // Note: RSI usually requires a series. AnalysisService generates series.
        // Ideally we'd optimize to just calc latest, but generating series for 100 items is fast enough.
        const rsiSeries = analysisService.generateRSISeries(data, params.rsiPeriod);
        const rsi = rsiSeries[i] || 0;

        // Calc EMAs
        const fastSeries = analysisService.generateEMASeries(data, params.emaFast);
        const slowSeries = analysisService.generateEMASeries(data, params.emaSlow);
        const emaFast = fastSeries[i] || 0;
        const emaSlow = slowSeries[i] || 0;

        setIndicators({ rsi, emaFast, emaSlow });

        // Logic
        if (params.strategy === 'TREND_FOLLOWING') {
            if (emaFast > emaSlow && rsi > params.rsiThreshold) {
                setStatus('BUY');
            } else if (emaFast < emaSlow) {
                setStatus('SELL'); // Or Neutral?
            } else {
                setStatus('NEUTRAL');
            }
        }
        else if (params.strategy === 'MEAN_REVERSION') {
            // Need BB
            const bb = analysisService.calculateBollingerBands(data, i, params.bollingerPeriod, params.bollingerStd);
            if (bb) {
                if (currentPrice < bb.lower && rsi < params.rsiThreshold) {
                    setStatus('BUY');
                } else if (currentPrice > bb.upper) {
                    setStatus('SELL');
                } else {
                    setStatus('NEUTRAL');
                }
            }
        }
    };

    return (
        <div className="bg-[#0b1d16] border border-white/5 rounded-2xl p-6 relative overflow-hidden h-[300px]">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <Activity className="text-accent" size={18} />
                        Monitor de Estrategia
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                        {params.strategy === 'TREND_FOLLOWING' ? 'Trend Follower' : 'Mean Reversion'} on BTC/USDT (1h)
                    </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${status === 'BUY' ? 'bg-accent/20 text-accent' :
                        status === 'SELL' ? 'bg-red-500/20 text-red-500' :
                            'bg-gray-500/20 text-gray-400'
                    }`}>
                    {status === 'BUY' && <ArrowUp size={14} />}
                    {status === 'SELL' && <ArrowDown size={14} />}
                    {status === 'NEUTRAL' && <Minus size={14} />}
                    {status === 'WAITING' && <Play size={14} className="animate-pulse" />}
                    {status}
                </div>
            </div>

            <div className="flex flex-col gap-4">
                <div className="bg-black/20 rounded-lg p-3 flex justify-between items-center">
                    <p className="text-xs text-gray-500">Live Price (BTC)</p>
                    <p className="text-white font-mono font-bold text-lg">${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>

                {params.strategy === 'TREND_FOLLOWING' && indicators && (
                    <>
                        <div className="bg-black/20 rounded-lg p-3 flex justify-between items-center">
                            <p className="text-xs text-gray-500">EMA Spread (Fast/Slow)</p>
                            <p className={`font-mono font-bold ${indicators.emaFast > indicators.emaSlow ? 'text-green-400' : 'text-red-400'}`}>
                                {((indicators.emaFast - indicators.emaSlow) / indicators.emaSlow * 100).toFixed(2)}%
                            </p>
                        </div>
                    </>
                )}

                {indicators && (
                    <div className="bg-black/20 rounded-lg p-3 flex justify-between items-center">
                        <div className="flex flex-col">
                            <p className="text-xs text-gray-500">RSI ({params.rsiPeriod})</p>
                            <div className="flex items-center gap-2">
                                <span className={`font-mono font-bold ${indicators.rsi > 70 ? 'text-red-400' : indicators.rsi < 30 ? 'text-accent' : 'text-white'}`}>
                                    {indicators.rsi.toFixed(1)}
                                </span>
                                <span className="text-[10px] text-gray-600">
                                    {params.strategy === 'TREND_FOLLOWING' ? `Target: > ${params.rsiThreshold}` : `Target: < ${params.rsiThreshold}`}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StrategyMonitor;
