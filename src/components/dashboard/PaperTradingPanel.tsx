import React, { useEffect, useState } from 'react';
import { Loader2, TrendingUp, TrendingDown, XCircle } from 'lucide-react';

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

const PaperTradingPanel: React.FC = () => {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);

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
        // Listen for new trades (simple event bus for now)
        window.addEventListener('tradeResponse', fetchTrades);
        return () => window.removeEventListener('tradeResponse', fetchTrades);
    }, []);

    const getSignal = (score?: number) => {
        if (score === undefined) return <span className="text-gray-500 text-xs">Sin datos recientes</span>;

        if (score <= -0.4) {
            return (
                <span className="flex items-center gap-1 text-red-500 font-bold animate-pulse">
                    <TrendingDown size={14} /> VENDER
                </span>
            );
        } else if (score >= 0.4) {
            return (
                <span className="flex items-center gap-1 text-green-500 font-bold">
                    <TrendingUp size={14} /> MANTENER
                </span>
            );
        } else {
            return <span className="text-gray-400 text-xs">Sin cambios</span>;
        }
    };

    return (
        <div className="glass-panel rounded-2xl p-8 border border-white/10 mt-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                Mis Operaciones Activas <span className="text-xs bg-white/10 px-2 py-1 rounded font-normal">Cartera Simulada</span>
            </h2>

            {loading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="animate-spin text-accent" />
                </div>
            ) : trades.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No hay operaciones activas.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-gray-400 border-b border-white/10 text-sm">
                                <th className="py-3 px-4">Fecha</th>
                                <th className="py-3 px-4">Ticker</th>
                                <th className="py-3 px-4">Precio Entrada</th>
                                <th className="py-3 px-4">Score Original</th>
                                <th className="py-3 px-4">Estado Actual (IA)</th>
                                <th className="py-3 px-4 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trades.map((trade) => (
                                <tr key={trade.id} className="text-gray-200 border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="py-3 px-4 text-sm text-gray-400">
                                        {new Date(trade.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="py-3 px-4 font-mono font-bold text-accent">
                                        {trade.ticker}
                                    </td>
                                    <td className="py-3 px-4 font-mono">
                                        ${trade.entry_price.toLocaleString()}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-400">
                                        {trade.initial_score?.toFixed(2)}
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="bg-black/30 p-2 rounded border border-white/5 inline-block min-w-[120px] text-center">
                                            {getSignal(trade.latest_sentiment_score)}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <button
                                            onClick={() => handleCloseTrade(trade.id)}
                                            className="text-gray-400 hover:text-red-400 transition-colors p-2 hover:bg-white/5 rounded"
                                            title="Cerrar Operación"
                                        >
                                            <XCircle size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default PaperTradingPanel;
