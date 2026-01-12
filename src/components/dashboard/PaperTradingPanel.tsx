import React, { useEffect, useState, useMemo } from 'react';
import PortfolioStats from './PortfolioStats';
import AssetDetailModal from './AssetDetailModal';
import AIPortfolioInsights from './AIPortfolioInsights';
import { Loader2, TrendingUp, TrendingDown, XCircle, AlertTriangle } from 'lucide-react';

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

const TICKER_MAP: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'SOL': 'solana',
    'AVAX': 'avalanche-2',
    'DOT': 'polkadot',
    'DOGE': 'dogecoin',
    'SHIB': 'shiba-inu',
    'MATIC': 'matic-network',
    'LINK': 'chainlink',
    'UNI': 'uniswap',
};

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

    // Real-time Simulation Effect with CoinGecko
    useEffect(() => {
        if (trades.length === 0) return;

        // Initialize prices once
        setCurrentPrices(prev => {
            const next = { ...prev };
            let changed = false;
            trades.forEach(t => {
                if (!next[t.ticker]) {
                    next[t.ticker] = t.entry_price;
                    changed = true;
                }
            });
            return changed ? next : prev;
        });

        const updatePrices = async () => {
            const tickersToFetch = new Set<string>();
            const tickersToSimulate = new Set<string>();

            trades.forEach(t => {
                const geckoId = TICKER_MAP[t.ticker.toUpperCase()];
                if (geckoId) {
                    tickersToFetch.add(geckoId);
                } else {
                    tickersToSimulate.add(t.ticker);
                }
            });

            let fetchedPrices: Record<string, number> = {};
            if (tickersToFetch.size > 0) {
                try {
                    const ids = Array.from(tickersToFetch).join(',');
                    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
                    if (response.ok) {
                        const data = await response.json();
                        Object.entries(TICKER_MAP).forEach(([ticker, id]) => {
                            if (data[id] && data[id].usd) {
                                fetchedPrices[ticker] = data[id].usd;
                            }
                        });
                    }
                } catch (e) {
                    console.error("CoinGecko API Error:", e);
                    trades.forEach(t => {
                        if (TICKER_MAP[t.ticker.toUpperCase()]) tickersToSimulate.add(t.ticker);
                    });
                }
            }

            setCurrentPrices(prev => {
                const next = { ...prev };
                Object.entries(fetchedPrices).forEach(([ticker, price]) => {
                    next[ticker] = price;
                });

                trades.forEach(t => {
                    if (!fetchedPrices[t.ticker]) {
                        const current = next[t.ticker] || t.entry_price;
                        const volatility = 0.005;
                        const change = 1 + (Math.random() * (volatility * 2) - volatility);
                        next[t.ticker] = current * change;
                    }
                });
                return next;
            });
        };

        updatePrices();
        const loopInterval = setInterval(updatePrices, 30000);
        return () => clearInterval(loopInterval);
    }, [trades]);

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

    const getSignal = (trade: Trade, pnlPercent: number) => {
        if (pnlPercent > 5) {
            return (
                <span className="flex items-center gap-1 text-green-400 font-bold bg-green-400/10 px-2 py-1 rounded animate-pulse">
                    <TrendingUp size={14} /> TAKE PROFIT
                </span>
            );
        } else if (pnlPercent < -3) {
            return (
                <span className="flex items-center gap-1 text-red-500 font-bold bg-red-500/10 px-2 py-1 rounded animate-pulse">
                    <AlertTriangle size={14} /> STOP LOSS
                </span>
            );
        }

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
                                    <th className="py-4 px-4 text-center">Señal</th>
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
