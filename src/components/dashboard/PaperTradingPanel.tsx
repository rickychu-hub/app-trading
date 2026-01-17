import React, { useEffect, useState, useMemo } from 'react';
import PortfolioStats from './PortfolioStats';
import AssetDetailModal from './AssetDetailModal';
import AIPortfolioInsights from './AIPortfolioInsights';
import { Loader2, TrendingUp, TrendingDown, XCircle, AlertTriangle } from 'lucide-react';
import { useBinancePrices } from '../../hooks/useBinancePrices';

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
}

// import { getCoingeckoId, TICKER_MAP } from '../../utils/crypto';

const PaperTradingPanel: React.FC = () => {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
    const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
    const [isChartOpen, setIsChartOpen] = useState(false);

    const fetchTrades = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/trades");
            if (response.ok) {
                const data = await response.json();
                setTrades(data);
            }
        } catch (error) {
            console.error("Error fetching trades:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCloseTrade = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (!confirm("¿Cerrar esta operación?")) return;
        try {
            const response = await fetch(`/api/trades/${id}/close`, { method: 'PUT' });
            if (response.ok) {
                fetchTrades();
            } else {
                alert("Error al cerrar operación");
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleRowClick = (ticker: string) => {
        setSelectedAsset(ticker);
        setIsChartOpen(true);
    };

    useEffect(() => {
        fetchTrades();
        window.addEventListener('tradeResponse', fetchTrades);
        return () => window.removeEventListener('tradeResponse', fetchTrades);
    }, []);

    // Real-time Prices from Binance
    const activeTickers = useMemo(() => {
        const tickers = new Set<string>();
        trades.forEach(t => tickers.add(t.ticker.toUpperCase()));
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
                // Lookup using Uppercase because useBinancePrices normalizes to "BTC" (Base) or "BTCUSDT"
                const tickerUpper = t.ticker.toUpperCase();
                const live = livePrices[tickerUpper] || livePrices[`${tickerUpper}USDT`];

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
                const investedAmt = t.invested_amount || t.entry_price; // Legacy: price = amount (1 unit)
                const currentPrice = currentPrices[t.ticker] || t.entry_price;

                invested += investedAmt;
                current += (currentPrice * qty);
            }
        });

        return { invested, current };
    }, [trades, currentPrices]);

    const [algoSignals, setAlgoSignals] = useState<Record<number, { signal: string, score: number, reason: string }>>({});

    // Fetch News for AI Analysis
    useEffect(() => {
        const analyzeHoldings = async () => {
            if (trades.length === 0) return;

            try {
                const res = await fetch('/api/news');
                if (!res.ok) return;
                const newsItems: any[] = await res.json();

                const newSignals: Record<number, { signal: string, score: number, reason: string }> = {};
                const now = new Date();
                const oneDayMs = 24 * 60 * 60 * 1000;

                trades.forEach(trade => {
                    // Filter news for this ticker (< 24h)
                    const relevantNews = newsItems.filter(n => {
                        const newsDate = new Date(n.created_at || n.fecha || new Date());
                        const isRecent = (now.getTime() - newsDate.getTime()) < oneDayMs;
                        // Match ticker in tickers array or title/summary text
                        const referencesTicker = (n.tickers && n.tickers.includes(trade.ticker)) ||
                            (n.title && n.title.toUpperCase().includes(trade.ticker)) ||
                            (n.resumen && n.resumen.toUpperCase().includes(trade.ticker));
                        return isRecent && referencesTicker;
                    });

                    // Sort by date desc (just in case)
                    relevantNews.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                    const recent3 = relevantNews.slice(0, 3);

                    if (recent3.length > 0) {
                        const avgScore = recent3.reduce((acc, curr) => acc + (curr.score || curr.sentiment_score || 0), 0) / recent3.length;

                        let signal = "NEUTRAL";
                        let reason = "Sin cambios fundamentales.";

                        if (avgScore > 0.3) { // Lower threshold for testing
                            signal = "MANTENER 🟢";
                            reason = "Tendencia positiva en noticias recientes.";
                        } else if (avgScore < -0.2) {
                            signal = "VENTA SUGERIDA 🔴";
                            reason = "Noticias negativas recientes detectadas.";
                        }

                        newSignals[trade.id] = { signal, score: avgScore, reason };
                    } else {
                        newSignals[trade.id] = { signal: "NEUTRAL ⚪", score: 0, reason: "Sin noticias recientes." };
                    }
                });

                setAlgoSignals(newSignals);

            } catch (e) {
                console.error("AI Analysis Failed:", e);
            }
        };

        analyzeHoldings();
    }, [trades]); // Re-run when trades change

    const getSignal = (trade: Trade, pnlPercent: number) => {
        // 1. Take Profit / Stop Loss (Hard Rules) override AI
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

        // 2. AI Analysis Signal
        const aiAnalysis = algoSignals[trade.id];
        if (aiAnalysis) {
            if (aiAnalysis.signal.includes("VENTA")) {
                return <span className="text-red-400 font-bold flex items-center gap-1"><TrendingDown size={14} /> {aiAnalysis.signal}</span>;
            }
            if (aiAnalysis.signal.includes("MANTENER")) {
                return <span className="text-green-400 font-bold flex items-center gap-1"><TrendingUp size={14} /> {aiAnalysis.signal}</span>;
            }
            return <span className="text-gray-400 text-xs">{aiAnalysis.signal}</span>;
        }

        // 3. Fallback to existing logic if analysis not ready
        if (trade.latest_sentiment_score !== undefined) {
            if (trade.latest_sentiment_score <= -0.4) {
                return <span className="text-red-400 flex items-center gap-1"><TrendingDown size={14} /> BEARISH AI</span>;
            } else if (trade.latest_sentiment_score >= 0.4) {
                return <span className="text-green-400 flex items-center gap-1"><TrendingUp size={14} /> BULLISH AI</span>;
            }
        }

        return <span className="text-gray-400 text-xs">MANTENER</span>;
    };

    return (
        <div className="mt-8 space-y-8 animate-fade-in">
            <PortfolioStats
                investedCapital={metrics.invested}
                currentValue={metrics.current}
            />

            <AIPortfolioInsights trades={trades} currentPrices={currentPrices} />

            <div className="glass-panel rounded-2xl p-8 border border-white/10">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    Operaciones Activas <span className="text-xs bg-white/10 px-2 py-1 rounded font-normal text-gray-400">Live Simulation</span>
                </h2>

                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="animate-spin text-accent" />
                    </div>
                ) : trades.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No hay operaciones activas. Ve al Dashboard para simular una.</p>
                ) : (
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
                                    const currentPrice = currentPrices[trade.ticker] || trade.entry_price;

                                    // Logic for legacy trades support
                                    const investedAmt = trade.invested_amount || trade.entry_price;
                                    const qty = trade.quantity || (trade.entry_price > 0 ? investedAmt / trade.entry_price : 0);

                                    const currentValue = currentPrice * qty;
                                    const pnl = currentValue - investedAmt;
                                    const pnlPercent = investedAmt > 0 ? (pnl / investedAmt) * 100 : 0;

                                    return (
                                        <tr
                                            key={trade.id}
                                            onClick={() => handleRowClick(trade.ticker)}
                                            className="text-gray-200 border-b border-white/5 hover:bg-white/10 transition-colors group cursor-pointer"
                                            title="Click para ver gráfico"
                                        >
                                            <td className="py-4 px-4 text-sm text-gray-400">
                                                {new Date(trade.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="py-4 px-4 font-bold text-white group-hover:text-accent transition-colors">
                                                {trade.ticker}
                                            </td>
                                            <td className="py-4 px-4 font-mono text-gray-400 text-right">
                                                ${trade.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-4 px-4 font-mono text-gray-300 text-right">
                                                ${investedAmt.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                            </td>
                                            <td className="py-4 px-4 font-mono text-right font-bold">
                                                <span className="animate-pulse-slow">
                                                    ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
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
                                                    onClick={(e) => handleCloseTrade(e, trade.id)}
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
                )}
            </div>

            <AssetDetailModal
                ticker={selectedAsset || ''}
                isOpen={isChartOpen}
                onClose={() => setIsChartOpen(false)}
            />
        </div>
    );
};

export default PaperTradingPanel;
