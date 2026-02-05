import React, { useEffect, useState, useMemo } from 'react';
import PortfolioStats from './PortfolioStats';
import AssetDetailModal from './AssetDetailModal';
import DailyPerformanceChart from './DailyPerformanceChart';
import AIPortfolioInsights from './AIPortfolioInsights';
import { Loader2, TrendingUp, TrendingDown, XCircle, AlertTriangle } from 'lucide-react';
import { useBinancePrices } from '../../hooks/useBinancePrices';
import { binanceService } from '../../services/binancePriceService';
import { analysisService } from '../../services/analysisService';
import { supabase } from '../../lib/supabaseClient';
import { usePortfolio } from '../../hooks/usePortfolio';

interface Trade {
    id: number;
    created_at: string;
    ticker: string;
    entry_price: number;
    invested_amount?: number;
    quantity?: number;
    initial_score: number;
    status: string;
    latest_sentiment_score?: number;
    latest_news_title?: string;
    highest_price?: number; // New field for Trailing Stop
    // Closed trade fields
    exit_price?: number;
    final_pnl?: number;
    net_profit?: number; // New field for after-tax profit
    close_reason?: string;
    exit_time?: string;
}

// import { getCoingeckoId, TICKER_MAP } from '../../utils/crypto';

const PaperTradingPanel: React.FC = () => {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
    const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
    const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
    const [isChartOpen, setIsChartOpen] = useState(false);
    const [dailyStats, setDailyStats] = useState<{ pnl: number, status: any } | null>(null);

    const [dailyHistory, setDailyHistory] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState<string | null>(null); // null = All time

    const fetchTrades = async () => {
        setLoading(true);
        try {
            // 1. Fetch History for Chart & Filter
            const { data: balanceData } = await supabase
                .from('daily_balances')
                .select('*')
                .order('date', { ascending: true }); // Chart needs chronological

            if (balanceData) {
                setDailyHistory(balanceData);
                // Default to Today if no selection
                // if (!selectedDate && balanceData.length > 0) setSelectedDate(balanceData[balanceData.length - 1].date);
            }

            // 2. Fetch Trades
            // If historical view, we might want ALL, or filtered by date if selected
            let query = supabase
                .from('paper_trades')
                .select('*')
                .order('created_at', { ascending: false });

            if (activeTab === 'active') {
                query = query.eq('status', 'OPEN');
            } else {
                query = query.eq('status', 'CLOSED');
                // Apply Date Filter only for History tab
                if (selectedDate) {
                    // Filter by exit_time matching the date YYYY-MM-DD
                    // This is tricky with timestamps. easier to filter in memory for small datasets, 
                    // or use date_trunc in SQL. Let's filter in memory for UI responsiveness for now.
                }
            }

            const { data: tradesData, error } = await query;

            if (tradesData) {
                setTrades(tradesData);
            }
            if (error) {
                console.error("Supabase error fetching trades:", error);
            }

            // Fetch Today's Specific Stats (for Top Cards)
            const todayStr = new Date().toISOString().split('T')[0];
            const todayData = balanceData?.find(d => d.date === todayStr);

            if (todayData) {
                setDailyStats({ pnl: todayData.pnl_daily, status: todayData.status });
            }
        } catch (error) {
            console.error("Error fetching trades:", error);
        } finally {
            setLoading(false);
        }
    };

    // Re-fetch when tab or date changes
    useEffect(() => {
        fetchTrades();
    }, [activeTab, selectedDate]);

    const closePosition = async (trade: Trade) => {
        // Calculate P&L for closing
        const rawTicker = trade.ticker || '';
        const ticker = rawTicker.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        const livePrice = livePrices[ticker] || livePrices[`${ticker}USDT`];

        if (!livePrice) {
            alert("No hay precio actual disponible para cerrar la operación.");
            return;
        }

        const investedAmt = trade.invested_amount || trade.entry_price;
        const qty = trade.quantity || (trade.entry_price > 0 ? investedAmt / trade.entry_price : 0);
        const currentValue = livePrice * qty;
        const pnl = currentValue - investedAmt;
        const pnlPercent = (pnl / investedAmt) * 100;

        // Reason Logic
        let reason = "Manual Close";
        if (pnlPercent > 10) reason = "Take Profit";
        else if (pnlPercent < -5) reason = "Stop Loss";

        if (!confirm(`¿Cerrar operación en ${ticker}?\n\nP&L Estimado: $${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`)) return;

        try {
            const payload = {
                exit_price: Number(livePrice),
                final_pnl: Number(pnl),
                reason: reason
            };

            // 1. PRIMARY: Try API (Uses Service Role bypass on backend)
            const response = await fetch(`/api/trades/${trade.id}/close`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                fetchTrades();
                return;
            }

            console.warn("⚠️ API Close failed, attempting Emergency Supabase bypass...");

            // 2. BACKUP: Direct Supabase Update (Bypass API if it's down or blocked)
            const net_profit = Number(pnl) > 0 ? Number(pnl) * 0.80 : Number(pnl);

            const { error: sbError } = await supabase
                .from('paper_trades')
                .update({
                    status: 'CLOSED',
                    exit_price: Number(livePrice),
                    final_pnl: Number(pnl),
                    net_profit: net_profit,
                    close_reason: `${reason} (EMERGENCY BYPASS)`,
                    exit_time: new Date().toISOString()
                })
                .eq('id', trade.id);

            if (!sbError) {
                alert("✅ Posición cerrada mediante BYPASS DIRECTO (Supabase).");
                fetchTrades();
            } else {
                console.error("Supabase direct update failed:", sbError);
                alert("❌ ERROR CRÍTICO: No se pudo cerrar la posición. Verifique permisos RLS o contacte soporte.");
            }
        } catch (e) {
            console.error("Catastrophic error during closePosition:", e);
            alert("Fallo catastrófico en la ejecución del cierre.");
        }
    };

    const handleCloseTrade = (e: React.MouseEvent, trade: Trade) => {
        e.stopPropagation();
        closePosition(trade);
    };

    const handleRowClick = (ticker: string) => {
        setSelectedAsset(ticker);
        setIsChartOpen(true);
    };

    useEffect(() => {
        // Initial fetch handled by tab effect usually, but we want to listen to events
        window.addEventListener('tradeResponse', fetchTrades);
        return () => window.removeEventListener('tradeResponse', fetchTrades);
    }, []);

    // Real-time Prices from Binance
    const activeTickers = useMemo(() => {
        const tickers = new Set<string>();
        trades.forEach(t => {
            if (t.ticker) {
                const clean = t.ticker.replace(/[^A-Z0-9]/gi, '').toUpperCase();
                tickers.add(clean);
            }
        });
        return Array.from(tickers);
    }, [trades]);

    const livePrices = useBinancePrices(activeTickers);

    // Merge live prices with fallback
    useEffect(() => {
        if (trades.length === 0) return;

        setCurrentPrices(prev => {
            const next = { ...prev };
            let changed = false;

            trades.forEach(t => {
                // Priority: Live Price -> Previous Price -> Entry Price
                // Lookup using Uppercase and cleaned ticker
                const rawTicker = t.ticker || '';
                const ticker = rawTicker.replace(/[^A-Z0-9]/gi, '').toUpperCase();

                const live = livePrices[ticker] || livePrices[`${ticker}USDT`];

                if (live && live !== next[t.ticker]) {
                    next[t.ticker] = live;
                    changed = true;
                } else if (!next[t.ticker]) {
                    next[t.ticker] = t.entry_price;
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [trades, livePrices]);

    // Calculate Portfolio Metrics
    const metrics = useMemo(() => {
        let invested = 0;
        let current = 0;

        trades.forEach(t => {
            if (t.status === 'OPEN') {
                const qty = t.quantity || (t.invested_amount && t.entry_price ? t.invested_amount / t.entry_price : 1); // Fallback for legacy trades
                const investedAmt = t.invested_amount || t.entry_price || 0; // Legacy: price = amount (1 unit)

                // Strong Fallback Logic:
                // 1. Current Live Price (if > 0)
                // 2. Entry Price (if no live price)
                // 3. 0 as last resort
                let currentPrice = currentPrices[t.ticker];
                if (!currentPrice || currentPrice <= 0) {
                    currentPrice = t.entry_price || 0;
                }

                invested += investedAmt;
                current += (currentPrice * qty);
            }
        });

        return { invested, current };
    }, [trades, currentPrices]);

    const [technicalSignals, setTechnicalSignals] = useState<Record<number, { signal: string, color: string }>>({});

    // Unified Analysis: Technicals (Strategy) + Fundamentals (News)
    useEffect(() => {
        const runAnalysis = async () => {
            if (activeTab !== 'active' || trades.length === 0) return;

            const newSignals: Record<number, { signal: string, color: string }> = {};

            // We need to fetch candles for technical analysis
            // Optimization: We could cache this or use a store, but for now we fetch fresh.
            for (const trade of trades) {
                if (trade.status !== 'OPEN') continue;

                // 1. Technical Analysis (Priority)
                try {
                    const rawTicker = trade.ticker.replace(/[^A-Z0-9]/gi, '').toUpperCase();
                    const pair = `${rawTicker}USDT`;
                    const candles = await binanceService.fetchHistoricalCandles(pair, '1h', 50); // Same timeframe as Strategy

                    if (candles.length > 0) {
                        const data = candles;
                        const i = data.length - 1;

                        // Indicators (Same Params as Default Strategy)
                        const rsiSeries = analysisService.generateRSISeries(data, 14);
                        const fastSeries = analysisService.generateEMASeries(data, 9);
                        const slowSeries = analysisService.generateEMASeries(data, 21);

                        const rsi = rsiSeries[i] || 0;
                        const emaFast = fastSeries[i] || 0;
                        const emaSlow = slowSeries[i] || 0;

                        // Logic Mirroring StrategyUnit
                        // Enhanced Logic for "Thinking" UI
                        if (rsi < 30) {
                            newSignals[trade.id] = {
                                signal: "🟢 Oportunidad Compr (RSI Bajo)", // Shortened for UI fit
                                color: "text-green-400 font-bold"
                            };
                        } else if (rsi > 70) {
                            newSignals[trade.id] = {
                                signal: "🔴 Sobrecompra (Prep Venta)",
                                color: "text-red-400 font-bold"
                            };
                        } else if (emaFast > emaSlow) {
                            newSignals[trade.id] = {
                                signal: "🚀 Tendencia Alcista (Hold)",
                                color: "text-green-300"
                            };
                        } else if (emaFast < emaSlow) {
                            newSignals[trade.id] = {
                                signal: "⚠️ Tendencia Rota (Cerrar)",
                                color: "text-orange-400"
                            };
                        } else {
                            newSignals[trade.id] = {
                                signal: "⏳ Esperando Señal",
                                color: "text-gray-500"
                            };
                        }
                    }
                } catch (e) {
                    console.error(`Error analyzing ${trade.ticker}`, e);
                    newSignals[trade.id] = { signal: "Check Manual", color: "text-yellow-500" };
                }
            }
            setTechnicalSignals(newSignals);
        };

        runAnalysis();
    }, [trades, activeTab]);

    const getSignal = (trade: Trade, pnlPercent: number) => {
        // 1. Hard Stops (Highest Priority)
        if (pnlPercent > 10) {
            return (
                <span className="flex items-center gap-1 text-green-400 font-bold bg-green-400/10 px-2 py-1 rounded animate-pulse">
                    <TrendingUp size={14} /> TAKE PROFIT
                </span>
            );
        } else if (pnlPercent < -5) {
            return (
                <span className="flex items-center gap-1 text-red-500 font-bold bg-red-500/10 px-2 py-1 rounded animate-pulse">
                    <AlertTriangle size={14} /> STOP LOSS
                </span>
            );
        }

        // 2. Technical Strategy Signal
        const tech = technicalSignals[trade.id];
        if (tech) {
            return (
                <span className={`flex items-center gap-1 ${tech.color}`}>
                    {tech.signal.includes("VENTA") ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                    {tech.signal}
                </span>
            );
        }

        // 3. Fallback
        return <span className="text-gray-500 text-xs">Calculando...</span>;
    };

    const { stats } = usePortfolio();

    return (
        <div className="mt-8 space-y-8 animate-fade-in">
            <PortfolioStats
                investedCapital={metrics.invested}
                currentValue={stats.totalEquity || 10000}
                dailyPnL={stats.dailyPnL || 0}
                botStatus={dailyStats?.status || 'ACTIVE'}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT COLUMN: Chart & Filters */}
                <div className="lg:col-span-2 space-y-8">
                    {activeTab === 'history' && (
                        <div className="glass-panel p-6 rounded-2xl border border-white/10">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <TrendingUp className="text-accent" size={20} />
                                    Rendimiento Diario
                                </h3>
                                {selectedDate && (
                                    <button
                                        onClick={() => setSelectedDate(null)}
                                        className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                                    >
                                        <XCircle size={14} /> Limpiar Filtro
                                    </button>
                                )}
                            </div>
                            <DailyPerformanceChart data={dailyHistory} />
                        </div>
                    )}

                    <div className="glass-panel rounded-2xl p-8 border border-white/10">
                        {/* HEADER */}
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                {activeTab === 'active' ? 'Operaciones Activas' : 'Historial de Operaciones'}
                                <span className="text-xs bg-white/10 px-2 py-1 rounded font-normal text-gray-400">Live Simulation</span>
                            </h2>

                            <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
                                <button
                                    onClick={() => setActiveTab('active')}
                                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'active' ? 'bg-accent text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Activas
                                </button>
                                <button
                                    onClick={() => setActiveTab('history')}
                                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-accent text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Historial
                                </button>
                            </div>
                        </div>

                        {/* FILTRADO EN MEMORIA (Client-Side filtering for speed on small datasets) */}
                        {(() => {
                            let displayedTrades = trades;
                            if (activeTab === 'history' && selectedDate) {
                                displayedTrades = trades.filter(t => {
                                    if (!t.exit_time) return false;
                                    return t.exit_time.startsWith(selectedDate);
                                });
                            }

                            return loading ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="animate-spin text-accent" />
                                </div>
                            ) : displayedTrades.length === 0 ? (
                                <p className="text-gray-400 text-center py-8">
                                    {activeTab === 'active' ? "No hay operaciones activas." : "No hay operaciones para este día."}
                                </p>
                            ) : activeTab === 'active' ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="text-gray-400 border-b border-white/10 text-xs uppercase tracking-wider">
                                                <th className="py-4 px-4">Fecha</th>
                                                <th className="py-4 px-4">Ticker</th>
                                                <th className="py-4 px-4 text-right">Precio Entrada</th>
                                                <th className="py-4 px-4 text-right">Inversión</th>
                                                <th className="py-4 px-4 text-right">Precio Actual</th>
                                                <th className="py-4 px-4 text-right">P&L</th>
                                                <th className="py-4 px-4 text-center">Estado Actual (IA)</th>
                                                <th className="py-4 px-4 text-right">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {trades.map((trade) => {
                                                // Aggressive Normalization & Forced Conversion
                                                const rawTicker = trade.ticker || '';
                                                const ticker = rawTicker.replace(/[^A-Z0-9]/gi, '').toUpperCase();

                                                const rawLivePrice = livePrices[ticker] || livePrices[`${ticker}USDT`];
                                                const livePrice = rawLivePrice ? Number(rawLivePrice) : undefined;

                                                // Use live price if available, otherwise undefined (to show Connecting...)
                                                // DO NOT Fallback to trade.entry_price for the display to ensure we know if connection is working

                                                const currentPriceDisplay = livePrice || undefined;

                                                // Logic for legacy trades support
                                                const investedAmt = trade.invested_amount || trade.entry_price;
                                                const qty = trade.quantity || (trade.entry_price > 0 ? investedAmt / trade.entry_price : 0);

                                                // Calculate P&L only if we have a live price
                                                const currentValue = livePrice ? (livePrice * qty) : (investedAmt); // Default to invested if no price (0 P&L)
                                                const pnl = livePrice ? (currentValue - investedAmt) : 0;
                                                const pnlPercent = investedAmt > 0 ? (pnl / investedAmt) * 100 : 0;

                                                // Trailing Stop Logic for Display
                                                const highestPrice = trade.highest_price ? Math.max(trade.highest_price, currentPriceDisplay || 0) : Math.max(trade.entry_price, currentPriceDisplay || 0);
                                                const dynamicStopPrice = highestPrice * 0.98;
                                                const distanceToStop = currentPriceDisplay ? ((currentPriceDisplay - dynamicStopPrice) / currentPriceDisplay) * 100 : 0;

                                                return (
                                                    <tr
                                                        key={trade.id}
                                                        onClick={() => handleRowClick(trade.ticker)}
                                                        className="text-gray-200 border-b border-white/5 hover:bg-white/10 transition-colors group cursor-pointer"
                                                        title="Click para ver gráfico"
                                                    >
                                                        <td className="py-4 px-4 text-sm text-gray-400">
                                                            {new Date(trade.created_at).toLocaleDateString()}
                                                            <span className="block text-[10px] opacity-50">{new Date(trade.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </td>
                                                        <td className="py-4 px-4 font-bold text-white group-hover:text-accent transition-colors">
                                                            {ticker}
                                                        </td>
                                                        <td className="py-4 px-4 font-mono text-gray-400 text-right">
                                                            ${trade.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="py-4 px-4 font-mono text-gray-300 text-right">
                                                            ${investedAmt.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                        </td>
                                                        <td className="py-4 px-4 font-mono text-right font-bold">
                                                            {currentPriceDisplay ? (
                                                                <div className="flex flex-col items-end gap-1">
                                                                    <span className="text-white text-sm">
                                                                        ${currentPriceDisplay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                    </span>

                                                                    {/* Trailing Stop Visualization */}
                                                                    <div className="flex flex-col items-end bg-white/5 p-1.5 rounded border border-white/5 w-max">
                                                                        <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                                                            <TrendingUp size={10} className="text-green-500" />
                                                                            Pico: <span className="text-gray-300">${highestPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                                        </div>
                                                                        <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                                                            <AlertTriangle size={10} className="text-orange-500" />
                                                                            Stop: <span className="text-orange-300">${dynamicStopPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                                        </div>
                                                                        <span className={`text-[9px] mt-0.5 ${distanceToStop < 0.5 ? 'text-red-500 animate-pulse font-bold' : 'text-gray-500'}`}>
                                                                            Margen: {distanceToStop.toFixed(2)}%
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-yellow-500/80 text-xs animate-pulse">Obteniendo...</span>
                                                            )}
                                                        </td>
                                                        <td className="py-4 px-4 font-mono text-right">
                                                            <div className="flex flex-col items-end">
                                                                <span className={`font-bold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                                    {pnl >= 0 ? '+' : ''}${pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                </span>
                                                                <span className={`text-xs ${pnl >= 0 ? 'text-green-500/70' : 'text-red-500/70'}`}>
                                                                    {pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-4 text-center">
                                                            <div className="inline-block min-w-[120px] text-center text-xs font-bold">
                                                                {getSignal(trade, pnlPercent)}
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-4 text-right">
                                                            <button
                                                                onClick={(e) => handleCloseTrade(e, trade)}
                                                                className="text-gray-400 hover:text-red-400 transition-colors p-2 hover:bg-red-500/10 rounded-lg group-hover:opacity-100 opacity-50"
                                                                title="Cerrar Operación"
                                                            >
                                                                <XCircle size={18} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                // HISTORY TABLE
                                <div className="overflow-x-auto space-y-4">
                                    {/* Summary Aggregator */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                        <div className="bg-white/5 p-4 rounded-lg border border-white/10 flex flex-col items-center">
                                            <span className="text-gray-400 text-xs uppercase">Beneficio Bruto</span>
                                            <span className={`text-xl font-bold ${displayedTrades.reduce((acc, t) => acc + (t.final_pnl || 0), 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                ${displayedTrades.reduce((acc, t) => acc + (t.final_pnl || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-lg border border-accent/20 flex flex-col items-center">
                                            <span className="text-accent text-xs uppercase font-bold">Beneficio Neto</span>
                                            <span className={`text-xl font-bold ${displayedTrades.reduce((acc, t) => acc + (t.net_profit || (t.final_pnl || 0)), 0) >= 0 ? 'text-accent' : 'text-red-400'}`}>
                                                ${displayedTrades.reduce((acc, t) => acc + (t.net_profit || (t.final_pnl || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-lg border border-white/10 flex flex-col items-center">
                                            <span className="text-gray-400 text-xs uppercase">Win Rate</span>
                                            <span className="text-xl font-bold text-white">
                                                {displayedTrades.length > 0
                                                    ? ((displayedTrades.filter(t => (t.final_pnl || 0) > 0).length / displayedTrades.length) * 100).toFixed(0)
                                                    : 0}%
                                            </span>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-lg border border-white/10 flex flex-col items-center">
                                            <span className="text-gray-400 text-xs uppercase">Trades</span>
                                            <span className="text-xl font-bold text-white">{displayedTrades.length}</span>
                                        </div>
                                    </div>

                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="text-gray-400 border-b border-white/10 text-xs uppercase tracking-wider">
                                                <th className="py-4 px-4">Fecha Entrada</th>
                                                <th className="py-4 px-4">Fecha Salida</th>
                                                <th className="py-4 px-4">Ticker</th>
                                                <th className="py-4 px-4 text-right">Entrada</th>
                                                <th className="py-4 px-4 text-right">Salida</th>
                                                <th className="py-4 px-4 text-right">P&L Bruto</th>
                                                <th className="py-4 px-4 text-right">P&L Neto</th>
                                                <th className="py-4 px-4 text-right">Razón</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {displayedTrades.map((trade) => {
                                                const pnl = trade.final_pnl || 0;
                                                const colorClass = pnl >= 0 ? 'text-green-400' : 'text-red-400';

                                                // Format: "22 Jan, 14:30"
                                                const formatDate = (dateString?: string) => {
                                                    if (!dateString) return '-';
                                                    const date = new Date(dateString);
                                                    return date.toLocaleDateString('en-GB', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    });
                                                };

                                                return (
                                                    <tr key={trade.id} className="text-gray-300 border-b border-white/5 hover:bg-white/5 transition-colors">
                                                        <td className="py-4 px-4 text-sm text-gray-400">
                                                            {formatDate(trade.created_at)}
                                                        </td>
                                                        <td className="py-4 px-4 text-sm text-gray-400">
                                                            {formatDate(trade.exit_time)}
                                                        </td>
                                                        <td className="py-4 px-4 font-bold text-white">
                                                            {trade.ticker}
                                                        </td>
                                                        <td className="py-4 px-4 font-mono text-right text-gray-400">
                                                            ${trade.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="py-4 px-4 font-mono text-right text-white">
                                                            ${trade.exit_price?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '-'}
                                                        </td>
                                                        <td className={`py-4 px-4 font-mono text-right font-bold ${colorClass}`}>
                                                            {pnl >= 0 ? '+' : ''}${pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className={`py-4 px-4 font-mono text-right font-bold ${trade.net_profit && trade.net_profit >= 0 ? 'text-accent' : trade.net_profit ? 'text-red-400' : 'text-gray-500'}`}>
                                                            {trade.net_profit ? (trade.net_profit >= 0 ? '+' : '') + '$' + trade.net_profit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                                        </td>
                                                        <td className="py-4 px-4 text-right text-sm">
                                                            <span className={`px-2 py-1 rounded text-xs border font-bold ${trade.close_reason?.includes('PROFIT') || trade.close_reason?.includes('Take Profit') ? 'border-green-500/30 text-green-300 bg-green-500/10' :
                                                                trade.close_reason?.includes('STOP') || trade.close_reason?.includes('Stop Loss') ? 'border-red-500/30 text-red-300 bg-red-500/10' :
                                                                    'border-gray-500/30 text-gray-300 bg-gray-500/10'
                                                                }`}>
                                                                {trade.close_reason?.includes('TRAILING') ? '🛡️ TRAILING' :
                                                                    trade.close_reason?.includes('HARD') ? '🛑 SL' :
                                                                        trade.close_reason?.includes('PROFIT') ? '💰 TP' : trade.close_reason || 'MANUAL'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })()}
                    </div>

                </div>

                {/* RIGHT COLUMN: Day Selector (Sidebar) */}
                <div className="lg:col-span-1 space-y-6">
                    <AIPortfolioInsights trades={trades} currentPrices={currentPrices} />

                    {activeTab === 'history' && (
                        <div className="glass-panel p-6 rounded-2xl border border-white/10 sticky top-8">
                            <h3 className="text-gray-400 text-sm font-bold uppercase mb-4">Filtrar por Día</h3>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                                <button
                                    onClick={() => setSelectedDate(null)}
                                    className={`w-full text-left p-3 rounded-xl border transition-all ${!selectedDate ? 'bg-accent/10 border-accent text-white' : 'bg-transparent border-white/5 text-gray-400 hover:bg-white/5'
                                        }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold">Todos los Tiempos</span>
                                    </div>
                                </button>

                                {[...dailyHistory].reverse().map((day) => (
                                    <button
                                        key={day.date}
                                        onClick={() => setSelectedDate(day.date)}
                                        className={`w-full text-left p-3 rounded-xl border transition-all ${selectedDate === day.date ? 'bg-accent/10 border-accent text-white' : 'bg-transparent border-white/5 text-gray-400 hover:bg-white/5'
                                            }`}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-mono text-sm">{new Date(day.date).toLocaleDateString()}</span>
                                            <span className={`text-xs font-bold ${day.pnl_daily >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {day.pnl_daily >= 0 ? '+' : ''}${day.pnl_daily.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-700 h-1 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${day.pnl_daily >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                                                style={{ width: `${Math.min(Math.abs(day.percent_daily || 0) * 5, 100)}%` }} // Visual bar
                                            ></div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div >

            <AssetDetailModal
                ticker={selectedAsset || ''}
                isOpen={isChartOpen}
                onClose={() => setIsChartOpen(false)}
            />
        </div >
    );
};

export default PaperTradingPanel;
