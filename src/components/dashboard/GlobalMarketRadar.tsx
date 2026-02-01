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

    const filtered = opportunities.filter(o =>
        o.symbol.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="glass-card p-6 rounded-2xl border border-white/10 bg-[#0b1d16]/50 backdrop-blur-xl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Zap className="text-accent" size={20} />
                        Radar Global de Oportunidades
                    </h2>
                    <p className="text-sm text-gray-400">Escaneo en tiempo real de TOP 50 Bitget/Binance</p>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar activo..."
                        className="pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:border-accent outline-none transition-all w-64"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-white/5">
                            <th className="pb-4 pl-2">Activo</th>
                            <th className="pb-4 text-right">Precio</th>
                            <th className="pb-4 text-center">RSI (1H)</th>
                            <th className="pb-4 text-center">Score IA</th>
                            <th className="pb-4 text-right">Vol 24h</th>
                            <th className="pb-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            [...Array(5)].map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={6} className="py-8 bg-white/5 rounded-lg mb-2"></td>
                                </tr>
                            ))
                        ) : filtered.map((op) => (
                            <tr key={op.symbol} className="hover:bg-white/5 transition-colors group">
                                <td className="py-4 pl-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center font-bold text-accent text-xs">
                                            {op.symbol.substring(0, 1)}
                                        </div>
                                        <span className="font-bold text-white">{op.symbol}</span>
                                    </div>
                                </td>
                                <td className="py-4 text-right font-mono text-white">
                                    ${op.price < 1 ? op.price.toFixed(6) : op.price.toLocaleString()}
                                </td>
                                <td className="py-4">
                                    <div className="flex flex-col items-center">
                                        <span className={`text-sm font-bold ${op.rsi < 30 ? 'text-green-400' : op.rsi > 70 ? 'text-red-400' : 'text-gray-300'}`}>
                                            {op.rsi.toFixed(1)}
                                        </span>
                                        <div className="w-16 h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                                            <div
                                                className={`h-full ${op.rsi < 30 ? 'bg-green-400' : op.rsi > 70 ? 'bg-red-400' : 'bg-accent'}`}
                                                style={{ width: `${op.rsi}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-4">
                                    <div className="flex flex-col items-center">
                                        <span className={`text-xs px-2 py-0.5 rounded border ${op.sentiment_score > 0.3 ? 'border-accent text-accent bg-accent/5' :
                                            op.sentiment_score < -0.3 ? 'border-red-500 text-red-500 bg-red-500/5' :
                                                'border-white/20 text-gray-400'
                                            }`}>
                                            {op.sentiment_score > 0 ? '+' : ''}{op.sentiment_score.toFixed(2)}
                                        </span>
                                    </div>
                                </td>
                                <td className="py-4 text-right text-gray-400 text-sm">
                                    ${(op.volume_24h / 1000000).toFixed(1)}M
                                </td>
                                <td className="py-4 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => executeManualTrade(op.symbol, op.price, 'LIMIT')}
                                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded text-xs transition-all flex items-center gap-1 border border-white/10"
                                        >
                                            Limit
                                        </button>
                                        <button
                                            onClick={() => executeManualTrade(op.symbol, op.price, 'MARKET')}
                                            className="px-3 py-1.5 bg-accent hover:bg-accent-light text-black font-bold rounded text-xs transition-all flex items-center gap-1"
                                        >
                                            <ShoppingCart size={12} />
                                            Market
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-accent/5 border border-accent/20 flex items-center gap-4">
                <div className="p-2 bg-accent/10 rounded-lg">
                    <ShieldCheck className="text-accent" size={24} />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-white">Risk Management Activo</h4>
                    <p className="text-xs text-gray-400">
                        Tamaño de posición limitado al 5% ($500) por trade manual. 100% de capital simulado: $10,000.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default GlobalMarketRadar;
