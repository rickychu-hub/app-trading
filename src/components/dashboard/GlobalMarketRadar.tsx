import React, { useState, useEffect } from 'react';
import { Search, ShoppingCart, Zap, ShieldCheck } from 'lucide-react';

interface MarketOpportunity {
    symbol: string;
    price: number;
    rsi: number;
    volume_24h: number;
    sentiment_score: number;
}

const GlobalMarketRadar: React.FC = () => {
    const [opportunities, setOpportunities] = useState<MarketOpportunity[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'oversold'>('all');
    const capitalBase = 10000;

    const fetchRadar = async () => {
        try {
            const resp = await fetch('/api/market-radar');
            const data = await resp.json();
            setOpportunities(data);
        } catch (error) {
            console.error("Radar Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRadar();
        const interval = setInterval(fetchRadar, 60000); // 1 min sync
        return () => clearInterval(interval);
    }, []);

    const calculatePositionSize = (price: number) => {
        // Risk limit: 5% of capital per manual trade
        return (capitalBase * 0.05) / price;
    };

    const executeManualTrade = async (symbol: string, price: number, type: 'MARKET' | 'LIMIT') => {
        const qty = calculatePositionSize(price);
        const amount = capitalBase * 0.05;

        if (!window.confirm(`¿Confirmar compra ${type} de ${symbol}?\nInversión: $${amount.toFixed(2)}`)) return;

        try {
            const resp = await fetch('/api/trades', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticker: symbol.replace('USDT', ''),
                    entry_price: price,
                    invested_amount: amount,
                    quantity: qty,
                    status: 'OPEN'
                })
            });

            if (resp.ok) {
                alert(`🚀 Orden ${type} enviada para ${symbol}`);
            }
        } catch (e) {
            console.error("Trade Error", e);
        }
    };

    const filtered = opportunities.filter(o => {
        const matchesSearch = o.symbol.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'all' || (filter === 'oversold' && o.rsi < 35);
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="glass-card p-6 rounded-2xl border border-white/10 bg-[#0b1d16]/50 backdrop-blur-xl h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Zap className="text-accent" size={20} />
                        RADAR ALPHA
                    </h2>
                    <p className="text-sm text-gray-400">Escaneo multimoneda con IA y RSI(1H)</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${filter === 'all' ? 'bg-accent text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                            TODOS
                        </button>
                        <button
                            onClick={() => setFilter('oversold')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${filter === 'oversold' ? 'bg-red-500/80 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            SOBREVENDIDO
                        </button>
                    </div>

                    <div className="relative flex-grow md:flex-grow-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            type="text"
                            placeholder="Filtrar ticker..."
                            className="pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:border-accent outline-none transition-all w-full md:w-48"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left">
                    <thead className="sticky top-0 bg-[#0b1d16] z-10">
                        <tr className="text-gray-500 text-[10px] uppercase tracking-wider border-b border-white/5">
                            <th className="pb-3 pl-2">Activo</th>
                            <th className="pb-3 text-right">Precio</th>
                            <th className="pb-3 text-center">RSI (1H)</th>
                            <th className="pb-3 text-center">Score IA</th>
                            <th className="pb-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            [...Array(5)].map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={5} className="py-6 bg-white/5 rounded-lg mb-2"></td>
                                </tr>
                            ))
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-12 text-center text-gray-500 text-sm">
                                    No se encontraron activos con los filtros actuales
                                </td>
                            </tr>
                        ) : filtered.map((op) => (
                            <tr key={op.symbol} className={`hover:bg-white/5 transition-colors group ${op.rsi < 35 ? 'bg-red-500/5' : ''}`}>
                                <td className="py-3 pl-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-7 h-7 rounded-sm flex items-center justify-center font-bold text-[10px] ${op.rsi < 35 ? 'bg-red-500/20 text-red-500' : 'bg-accent/10 text-accent'}`}>
                                            {op.symbol.replace('USDT', '')}
                                        </div>
                                        <span className="font-bold text-white text-sm">{op.symbol}</span>
                                    </div>
                                </td>
                                <td className="py-3 text-right font-mono text-xs text-white">
                                    ${op.price < 1 ? op.price.toFixed(5) : op.price.toLocaleString()}
                                </td>
                                <td className="py-3">
                                    <div className="flex flex-col items-center">
                                        <span className={`text-xs font-bold ${op.rsi < 35 ? 'text-red-400' : op.rsi > 70 ? 'text-accent' : 'text-gray-300'}`}>
                                            {op.rsi.toFixed(1)}
                                        </span>
                                        <div className="w-12 h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                                            <div
                                                className={`h-full ${op.rsi < 35 ? 'bg-red-400' : op.rsi > 70 ? 'bg-accent' : 'bg-gray-500'}`}
                                                style={{ width: `${op.rsi}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-3">
                                    <div className="flex flex-col items-center">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${op.sentiment_score > 0.3 ? 'border-accent text-accent bg-accent/5' :
                                                op.sentiment_score < -0.3 ? 'border-red-500 text-red-500 bg-red-500/5' :
                                                    'border-white/20 text-gray-400'
                                            }`}>
                                            {op.sentiment_score > 0 ? '+' : ''}{op.sentiment_score.toFixed(2)}
                                        </span>
                                    </div>
                                </td>
                                <td className="py-3 text-right">
                                    <div className="flex justify-end gap-1.5">
                                        <button
                                            onClick={() => executeManualTrade(op.symbol, op.price, 'MARKET')}
                                            className="px-2.5 py-1 bg-accent hover:bg-white text-black font-bold rounded text-[10px] transition-all flex items-center gap-1"
                                        >
                                            <ShoppingCart size={10} />
                                            COMPRAR
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-accent/5 border border-accent/10 flex items-center gap-3">
                <ShieldCheck className="text-accent" size={18} />
                <p className="text-[10px] text-gray-400 uppercase tracking-tight">
                    <span className="text-white font-bold">Riesgo Dinámico:</span> Límite $500 por activo. Capital Ref: $10,000
                </p>
            </div>
        </div>
    );
};

export default GlobalMarketRadar;
