
import React, { useEffect, useState, useRef } from 'react';
import { ArrowUp, ArrowDown, Minus, X } from 'lucide-react';
import { useStrategyStore } from '../../store/strategyStore';
import { useBotStore } from '../../store/botStore';
import { binanceService } from '../../services/binancePriceService';
import { analysisService } from '../../services/analysisService';
import { type Candle } from '../../services/backtestEngine';

interface StrategyUnitProps {
    ticker: string;
    activeTrade?: any;
    onExecuteTrade?: (side: 'BUY' | 'SELL', price: number, reason: string, ticker: string, amount: number) => Promise<void>;
    onRefresh?: () => void;
}

const StrategyUnit: React.FC<StrategyUnitProps> = ({ ticker, onExecuteTrade, activeTrade, onRefresh }) => {
    const params = useStrategyStore();
    const { addLog, toggleAsset } = useBotStore();

    // Local State
    const [price, setPrice] = useState<number>(0);
    const [status, setStatus] = useState<'NEUTRAL' | 'BUY' | 'SELL' | 'WAITING'>('WAITING');
    const [indicators, setIndicators] = useState<{ rsi: number, emaFast: number, emaSlow: number } | null>(null);
    const [investmentAmount, setInvestmentAmount] = useState<string>("1000");
    const [isProcessing, setIsProcessing] = useState(false);

    const candlesRef = useRef<Candle[]>([]);

    // Logic State
    const lastLogTimeRef = useRef<number>(0);
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

            // Logging (Heartbeat every 30s OR on Status Change)
            const now = Date.now();
            const timeSinceLastLog = now - lastLogTimeRef.current;
            const shouldLog = status !== newStatus || timeSinceLastLog > 30000;

            if (shouldLog && params.isAutoTrading) {
                let logDecision = newStatus === 'NEUTRAL' ? 'WAIT' : newStatus;
                let logReason = reason;

                // Heartbeat / Keep-Alive message
                if (status === newStatus && newStatus === 'NEUTRAL') {
                    logReason = `[INFO] Monitoring... Price stable at $${currentPrice.toFixed(0)}`;
                }

                addLog({
                    timestamp: new Date().toLocaleTimeString(),
                    ticker: ticker,
                    rsi: rsi,
                    decision: logDecision as any,
                    reason: logReason
                });
                lastLogTimeRef.current = now;
            }

            // Execution (Auto)
            // Use activeTrade prop instead of local positionRef to avoid duplicates
            if (params.isAutoTrading && onExecuteTrade) {
                if (now - lastTradeTimeRef.current > COOLDOWN_MS) {
                    // Only BUY if no active trade
                    if (newStatus === 'BUY' && !activeTrade) {
                        onExecuteTrade('BUY', currentPrice, reason, ticker, Number(investmentAmount));
                        lastTradeTimeRef.current = now;
                    }
                    // Only SELL if we have an active trade (activeTrade)
                    // Note: 'SELL' from strategy means "Close Position" usually
                    else if (newStatus === 'SELL' && activeTrade) {
                        // For Auto-Sell, we need to implement closing logic similar to manual
                        // But StrategyMonitor onExecuteTrade only handles Opening currently.
                        // We might need to call handleManualClose here or update the parent.
                        // For now, let's just Log "SELL SIGNAL" and maybe trigger manual close if we can
                        // OR calls handleManualClose() internally if we trust the bot
                        handleManualClose(); // Auto-close
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

    // Immediate Log on Start
    useEffect(() => {
        if (params.isAutoTrading) {
            addLog({
                timestamp: new Date().toLocaleTimeString(),
                ticker: ticker,
                rsi: indicators?.rsi || 0,
                decision: 'WAIT',
                reason: "[START] Engine active. Analyzing..."
            });
        }
    }, [params.isAutoTrading]);

    const handleManualBuy = async () => {
        try {
            if (!onExecuteTrade) throw new Error("Función de ejecución no disponible");

            const amt = Number(investmentAmount);
            if (!amt || amt <= 0 || isNaN(amt)) {
                throw new Error("Cantidad inválida. Ingrese un número mayor a 0.");
            }

            if (!price || price <= 0) {
                throw new Error("Esperando datos de precio market data...");
            }

            // Input Sanitization Passed
            setIsProcessing(true);

            await onExecuteTrade('BUY', price, "Manual Override", ticker, amt);

            // Explicit Success Handling
            alert('✅ Operación Exitosa. Recargando Dashboard...');
            window.location.reload();

        } catch (e: any) {
            console.error("Manual Buy Error:", e);
            alert(`ERROR CRÍTICO: ${e.message || "Fallo desconocido"}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleManualClose = async () => {
        try {
            if (!activeTrade) throw new Error("No hay operación activa para cerrar");
            if (!activeTrade.id) throw new Error("ID de operación perdido. Posible desincronización.");

            setIsProcessing(true);

            // Calculate estimated P&L
            const invested = activeTrade.invested_amount || activeTrade.entry_price || 0;
            const qty = activeTrade.quantity || (activeTrade.entry_price > 0 ? invested / activeTrade.entry_price : 0);
            const currentVal = price * qty;
            const pnl = currentVal - invested;

            let reason = "Manual Override";
            if (status === 'SELL') reason = "Strategy Sell Signal";

            const payload = {
                exit_price: price,
                final_pnl: pnl,
                reason: reason
            };

            const response = await fetch(`/api/trades/${activeTrade.id}/close`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert('✅ Venta Exitosa. Recargando...');
                window.location.reload();
            } else {
                const err = await response.json();
                throw new Error(err.message || "Error en el servidor al cerrar");
            }

        } catch (e: any) {
            console.error("Manual Close Error:", e);
            alert(`ERROR CRÍTICO AL VENDER: ${e.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className={`bg-black/20 border rounded-xl p-4 relative overflow-hidden group transition-all ${activeTrade ? 'border-accent shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'border-white/5 hover:border-white/10'}`}>
            <button
                onClick={() => toggleAsset(ticker)}
                className="absolute top-2 right-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <X size={14} />
            </button>

            {activeTrade && (
                <div className="absolute top-0 right-0 bg-accent text-black text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                    POSICIÓN ABIERTA
                </div>
            )}

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
                <div className="grid grid-cols-2 gap-2 text-[10px] mb-4">
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

            {/* Manual Controls */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500">Inversión ($)</span>
                    <input
                        type="number"
                        value={investmentAmount}
                        onChange={(e) => setInvestmentAmount(e.target.value)}
                        className="bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white w-full focus:outline-none focus:border-accent"
                    />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={handleManualBuy}
                        disabled={!!activeTrade || !price || isProcessing}
                        className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 rounded py-1.5 text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        {isProcessing && !activeTrade ? 'PROCESANDO...' : 'COMPRAR AHORA'}
                    </button>
                    <button
                        onClick={handleManualClose}
                        disabled={!activeTrade || isProcessing}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded py-1.5 text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        {isProcessing && activeTrade ? 'PROCESANDO...' : 'VENDER AHORA'}
                    </button>
                </div>
            </div>

            {params.isAutoTrading && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500/50 animate-pulse"></div>
            )}
        </div>
    );
};

export default StrategyUnit;
