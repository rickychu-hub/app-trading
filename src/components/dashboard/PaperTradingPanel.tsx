import React, { useEffect, useState, useMemo } from 'react';
import PortfolioStats from './PortfolioStats';
import { Loader2, TrendingUp, TrendingDown, XCircle, AlertTriangle } from 'lucide-react';

interface Trade {
    id: number;
    created_at: string;
    ticker: string;
    entry_price: number;
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
    // Stocks are not supported by CoinGecko simple price, only crypto. 
    // For stocks we will rely on simulation or user entry + deviation.
    // Future improvement: AlphaVantage or Yahoo Finance for stocks.
};

const PaperTradingPanel: React.FC = () => {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});

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

    const handleCloseTrade = async (id: number) => {
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
            // 1. Identify tickers to fetch
            const tickersToFetch = new Set<string>();
            const tickersToSimulate = new Set<string>();

            trades.forEach(t => {
                const geckoId = TICKER_MAP[t.ticker.toUpperCase()]; // Try to map to ID
                if (geckoId) {
                    tickersToFetch.add(geckoId);
                } else {
                    tickersToSimulate.add(t.ticker);
                }
            });

            // 2. Fetch from CoinGecko
            let fetchedPrices: Record<string, number> = {};
            if (tickersToFetch.size > 0) {
                try {
                    const ids = Array.from(tickersToFetch).join(',');
                    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
                    if (response.ok) {
                        const data = await response.json(); // { "bitcoin": { "usd": 50000 } }

                        // Map back to Ticker
                        Object.entries(TICKER_MAP).forEach(([ticker, id]) => {
                            if (data[id] && data[id].usd) {
                                fetchedPrices[ticker] = data[id].usd;
                            }
                        });
                    }
                } catch (e) {
                    console.error("CoinGecko API Error:", e);
                    // Fallback: all go to simulate
                    trades.forEach(t => {
                        if (TICKER_MAP[t.ticker.toUpperCase()]) tickersToSimulate.add(t.ticker);
                    });
                }
            }

            // 3. Update State mixing Real and Simulated
            setCurrentPrices(prev => {
                const next = { ...prev };

                // Apply fetched
                Object.entries(fetchedPrices).forEach(([ticker, price]) => {
                    next[ticker] = price;
                });

                // Apply simulation for others (or fallback)
                trades.forEach(t => {
                    // If not in fetchedPrices, simulate
                    if (!fetchedPrices[t.ticker]) {
                        const current = next[t.ticker] || t.entry_price;
                        const volatility = 0.005; // 0.5% volatility for fallback
                        const change = 1 + (Math.random() * (volatility * 2) - volatility);
                        next[t.ticker] = current * change;
                    }
                });

                return next;
            });
        };

        // Initial fetch
        updatePrices();

        // Loop: CoinGecko allows ~10-30 calls/min free. Safe: 60s.
        // But user wants live feel. 
        // Strategy: 
        // - Fetch Real Prices every 60s.
        // - Simulate oscillation every 3s based on last real price to keep "alive".

        // Actually, let's keep it simple as requested: Call API every 60s. 
        // If we want "live" feel between calls, we can interpolate, but that's complex.
        // User asked "Fetch API every 30-60s... use these prices".
        // To keep "live" feel (blinking prices), maybe we add tiny noise to real price locally 
        // between fetches? Or just refresh the simulation loop every 5s, but only fetch API every 60s.

        // Implementation: 
        // Main Loop 5s: 
        //   - If (now - lastFetch > 60s) -> Fetch API. 
        //   - Else -> Simulate/Jitter existing prices lightly.

        const loopInterval = setInterval(updatePrices, 30000); // 30s as requested compromise

        return () => clearInterval(loopInterval);
    }, [trades]);

    // Calculate Portfolio Metrics
    const metrics = useMemo(() => {
        let invested = 0;
        let current = 0;

        trades.forEach(t => {
            if (t.status === 'OPEN') {
                invested += t.entry_price;
                current += currentPrices[t.ticker] || t.entry_price;
            }
        });

        return { invested, current };
    }, [trades, currentPrices]);

    const getSignal = (trade: Trade, currentPrice: number) => {
        const pnlPercent = ((currentPrice - trade.entry_price) / trade.entry_price) * 100;

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

        // Fallback to AI Sentiment for "Hold" or if neutral
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
                                    <th className="py-4 px-4 text-right">Entrada</th>
                                    <th className="py-4 px-4 text-right">Precio Actual</th>
                                    <th className="py-4 px-4 text-right">Retorno</th>
                                    <th className="py-4 px-4 text-center">IA Score</th>
                                    <th className="py-4 px-4 text-center">Señal</th>
                                    <th className="py-4 px-4 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {trades.map((trade) => {
                                    const currentPrice = currentPrices[trade.ticker] || trade.entry_price;
                                    const pnl = currentPrice - trade.entry_price;
                                    const pnlPercent = (pnl / trade.entry_price) * 100;

                                    return (
                                        <tr key={trade.id} className="text-gray-200 border-b border-white/5 hover:bg-white/5 transition-colors group">
                                            <td className="py-4 px-4 text-sm text-gray-400">
                                                {new Date(trade.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="py-4 px-4 font-bold text-white group-hover:text-accent transition-colors">
                                                {trade.ticker}
                                            </td>
                                            <td className="py-4 px-4 font-mono text-gray-400 text-right">
                                                ${trade.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-4 px-4 font-mono text-right font-bold">
                                                <span className="animate-pulse-slow">
                                                    ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 font-mono text-right">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${pnl >= 0 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                                                    {pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-center text-sm text-gray-400">
                                                {trade.initial_score?.toFixed(2)}
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <div className="inline-block min-w-[120px] text-center text-xs font-bold">
                                                    {getSignal(trade, currentPrice)}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <button
                                                    onClick={() => handleCloseTrade(trade.id)}
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
        </div>
    );
};

export default PaperTradingPanel;
