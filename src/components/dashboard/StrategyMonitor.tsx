import React, { useEffect, useState, useRef } from 'react';
import { Play, Pause, Activity, TrendingUp, AlertTriangle, ArrowUp, ArrowDown, Minus, Power } from 'lucide-react';
import { useStrategyStore } from '../../store/strategyStore';
import { binanceService } from '../../services/binancePriceService';
import { analysisService } from '../../services/analysisService';
import { type Candle } from '../../services/backtestEngine';

interface StrategyMonitorProps {
    onExecuteTrade?: (side: 'BUY' | 'SELL', price: number, reason: string) => void;
}

const StrategyMonitor: React.FC<StrategyMonitorProps> = ({ onExecuteTrade }) => {
    const params = useStrategyStore();
    const [price, setPrice] = useState<number>(0);
    const [status, setStatus] = useState<'NEUTRAL' | 'BUY' | 'SELL' | 'WAITING'>('WAITING');
    const [indicators, setIndicators] = useState<{ rsi: number, emaFast: number, emaSlow: number } | null>(null);
    const candlesRef = useRef<Candle[]>([]);

    // Auto-Trading State
    const [isAutoTrading, setIsAutoTrading] = useState(false);
    const lastTradeTimeRef = useRef<number>(0);
    const COOLDOWN_MS = 5 * 60 * 1000; // 5 Minutes
    const positionRef = useRef<'NONE' | 'LONG'>('NONE'); // Simple internal state tracking

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

    // Effect to reset internal state if strategy changes (safety)
    useEffect(() => {
        positionRef.current = 'NONE';
        setStatus('WAITING');
    }, [params.strategy]);

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

        let newStatus: 'NEUTRAL' | 'BUY' | 'SELL' | 'WAITING' = 'NEUTRAL';

        // Logic Determination
        if (params.strategy === 'TREND_FOLLOWING') {
            if (emaFast > emaSlow && rsi > params.rsiThreshold) {
                newStatus = 'BUY';
            } else if (emaFast < emaSlow) {
                newStatus = 'SELL';
            }
        }
        else if (params.strategy === 'MEAN_REVERSION') {
            // Need BB
            const bb = analysisService.calculateBollingerBands(data, i, params.bollingerPeriod, params.bollingerStd);
            if (bb) {
                if (currentPrice < bb.lower && rsi < params.rsiThreshold) {
                    newStatus = 'BUY';
                } else if (currentPrice > bb.upper) {
                    newStatus = 'SELL';
                }
            }
        }

        setStatus(newStatus);
        handleAutoExecution(newStatus, currentPrice, params.strategy);
    };

    const handleAutoExecution = (signal: string, currentPrice: number, strategyName: string) => {
        if (!isAutoTrading || !onExecuteTrade) return;

        const now = Date.now();
        if (now - lastTradeTimeRef.current < COOLDOWN_MS) return; // Cooldown Check

        // BUY Logic
        if (signal === 'BUY' && positionRef.current === 'NONE') {
            console.log(`[AUTO-TRADER] Executing BUY @${currentPrice}`);
            onExecuteTrade('BUY', currentPrice, `${strategyName} Signal`);
            positionRef.current = 'LONG';
            lastTradeTimeRef.current = now;
        }
        // SELL Logic
        else if (signal === 'SELL' && positionRef.current === 'LONG') {
            console.log(`[AUTO-TRADER] Executing SELL @${currentPrice}`);
            onExecuteTrade('SELL', currentPrice, `${strategyName} Exit`);
            positionRef.current = 'NONE';
            lastTradeTimeRef.current = now;
        }
    };

    return (
        <div className="bg-[#0b1d16] border border-white/5 rounded-2xl p-6 relative overflow-hidden h-[300px]">
            {/* Header */}
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

                {/* Status Badge & Master Switch */}
                <div className="flex items-center gap-3">
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

                    <button
                        onClick={() => setIsAutoTrading(!isAutoTrading)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${isAutoTrading
                                ? 'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30'
                                : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-700/50'
                            }`}
                        title="Master Switch del Bot"
                    >
                        <Power size={14} />
                        <span className="text-xs font-bold">{isAutoTrading ? 'AUTO ON' : 'AUTO OFF'}</span>
                        {isAutoTrading && <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>}
                    </button>
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

            {isAutoTrading && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-500/20">
                    <div className="h-full bg-green-500 animate-pulse w-full"></div>
                </div>
            )}
        </div>
    );
};

export default StrategyMonitor;
