import React, { useEffect, useState, useRef } from 'react';
import { ArrowUp, ArrowDown, Minus, X } from 'lucide-react';
import { useStrategyStore } from '../../store/strategyStore';
import { useBotStore } from '../../store/botStore';
import { binanceService } from '../../services/binancePriceService';
import { analysisService } from '../../services/analysisService';
import { type Candle } from '../../services/backtestEngine';

interface StrategyUnitProps {
    ticker: string;
    onExecuteTrade?: (side: 'BUY' | 'SELL', price: number, reason: string, ticker: string) => void;
}

const StrategyUnit: React.FC<StrategyUnitProps> = ({ ticker, onExecuteTrade }) => {
    const params = useStrategyStore();
    const { addLog, toggleAsset } = useBotStore();

    // Local State
    const [price, setPrice] = useState<number>(0);
    const [status, setStatus] = useState<'NEUTRAL' | 'BUY' | 'SELL' | 'WAITING'>('WAITING');
    const [indicators, setIndicators] = useState<{ rsi: number, emaFast: number, emaSlow: number } | null>(null);
    const candlesRef = useRef<Candle[]>([]);

    // Logic State
    const lastLogTimeRef = useRef<number>(0);
    const positionRef = useRef<'NONE' | 'LONG'>('NONE');
    const lastTradeTimeRef = useRef<number>(0);
    const COOLDOWN_MS = 5 * 60 * 1000;

    // Latest Logic Reference for Event Listener
    const updateLogicRef = useRef<(p: number) => void>(() => { });

    useEffect(() => {
        updateLogicRef.current = (currentPrice: number) => {
            if (candlesRef.current.length === 0) return;

            const i = candlesRef.current.length - 1;
            candlesRef.current[i].close = currentPrice; // Update current candle

            // Calc Indicators
            const data = candlesRef.current;
            const rsiSeries = analysisService.generateRSISeries(data, params.rsiPeriod);
            const rsi = rsiSeries[i] || 0;
            const fastSeries = analysisService.generateEMASeries(data, params.emaFast);
            const slowSeries = analysisService.generateEMASeries(data, params.emaSlow);
            const emaFast = fastSeries[i] || 0;
            const emaSlow = slowSeries[i] || 0;

            setIndicators({ rsi, emaFast, emaSlow });

            // Decision Logic
            let newStatus: 'NEUTRAL' | 'BUY' | 'SELL' | 'WAITING' = 'NEUTRAL';
            let reason = "Conditions not met";

            if (params.strategy === 'TREND_FOLLOWING') {
                if (emaFast > emaSlow && rsi > params.rsiThreshold) {
                    newStatus = 'BUY';
                    reason = `Trend Up (EMA${params.emaFast} > EMA${params.emaSlow}) & RSI ${rsi.toFixed(1)} > ${params.rsiThreshold}`;
                } else if (emaFast < emaSlow) {
                    newStatus = 'SELL';
                    reason = `Trend Down`;
                } else {
                    reason = "Choppy Market";
                }
            }

            setStatus(newStatus);

            // Logging (Heartbeat every 60s OR on Status Change)
            const now = Date.now();
            const timeSinceLastLog = now - lastLogTimeRef.current;

            // Only log if "Auto Trading" is effectively inspecting (we assume it is if component runs)
            // But we can check global isAutoTrading in the store if we want to silence logs when off.
            // User requested logs "Cuando el AutoTrader evalue".

            if (timeSinceLastLog > 60000 || status !== newStatus) {
                if (params.isAutoTrading) {
                    addLog({
                        timestamp: new Date().toLocaleTimeString(),
                        ticker: ticker,
                        rsi: rsi,
                        decision: newStatus === 'NEUTRAL' ? 'WAIT' : newStatus,
                        reason: reason
                    });
                    lastLogTimeRef.current = now;
                }
            }

            // Execution
            if (params.isAutoTrading && onExecuteTrade) {
                if (now - lastTradeTimeRef.current > COOLDOWN_MS) {
                    if (newStatus === 'BUY' && positionRef.current === 'NONE') {
                        onExecuteTrade('BUY', currentPrice, reason, ticker);
                        positionRef.current = 'LONG';
                        lastTradeTimeRef.current = now;
                    } else if (newStatus === 'SELL' && positionRef.current === 'LONG') {
                        onExecuteTrade('SELL', currentPrice, reason, ticker);
                        positionRef.current = 'NONE';
                        lastTradeTimeRef.current = now;
                    }
                }
            }
        };
    }); // Update on every render

    // Initialization
    useEffect(() => {
        const handleUpdate = (s: string, p: number) => {
            // Check match (normalized)
            const incoming = s.replace('USDT', '');
            const myTicker = ticker.replace('USDT', '');
            if (incoming === myTicker) {
                setPrice(p);
                updateLogicRef.current(p);
            }
        };

        const init = async () => {
            // 1. Subscribe
            binanceService.connect();
            binanceService.subscribe(ticker);
            binanceService.addListener(handleUpdate);

            // 2. History
            try {
                const history = await binanceService.fetchHistoricalCandles(`${ticker}USDT`, '1h', 100);
                candlesRef.current = history;
            } catch (e) {
                console.error(`Failed to load history for ${ticker}`);
            }
        };

        init();

        return () => {
            binanceService.removeListener(handleUpdate);
        };
    }, [ticker]);

    return (
        <div className="bg-black/20 border border-white/5 rounded-xl p-4 relative overflow-hidden group hover:border-white/10 transition-all">
            <button
                onClick={() => toggleAsset(ticker)}
                className="absolute top-2 right-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <X size={14} />
            </button>

            <div className="flex justify-between items-start mb-3">
                <div>
                    <h4 className="font-bold text-white flex items-center gap-2">
                        {ticker} <span className="text-xs text-gray-500 font-normal">1h</span>
                    </h4>
                    <p className="text-lg font-mono font-bold text-accent">
                        ${price.toLocaleString()}
                    </p>
                </div>

                <div className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 ${status === 'BUY' ? 'bg-accent/20 text-accent' :
                    status === 'SELL' ? 'bg-red-500/20 text-red-500' :
                        'bg-gray-500/10 text-gray-400'
                    }`}>
                    {status === 'BUY' && <ArrowUp size={12} />}
                    {status === 'SELL' && <ArrowDown size={12} />}
                    {status === 'NEUTRAL' && <Minus size={12} />}
                    {status}
                </div>
            </div>

            {/* Indicators Mini View */}
            {indicators && (
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-white/5 p-1.5 rounded">
                        <span className="text-gray-500 block">RSI</span>
                        <span className={`font-mono ${indicators.rsi > 70 ? 'text-red-400' : indicators.rsi < 30 ? 'text-accent' : 'text-white'}`}>
                            {indicators.rsi.toFixed(1)}
                        </span>
                    </div>
                    <div className="bg-white/5 p-1.5 rounded">
                        <span className="text-gray-500 block">EMA Spread</span>
                        <span className={`font-mono ${indicators.emaFast > indicators.emaSlow ? 'text-accent' : 'text-red-400'}`}>
                            {indicators.emaFast > indicators.emaSlow ? '+' : ''}
                            {((indicators.emaFast - indicators.emaSlow) / indicators.emaSlow * 100).toFixed(1)}%
                        </span>
                    </div>
                </div>
            )}

            {params.isAutoTrading && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500/50 animate-pulse"></div>
            )}
        </div>
    );
};

export default StrategyUnit;
