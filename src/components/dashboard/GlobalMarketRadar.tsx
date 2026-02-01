import React, { useState, useEffect } from 'react';
import { Search, Zap, ShieldCheck } from 'lucide-react';

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
    const [status, setStatus] = useState<'ok' | 'debug_fallback' | 'empty'>('ok');
    const [search, setSearch] = useState('');
    const capitalBase = 10000;

    const fetchRadar = async () => {
        try {
            const resp = await fetch('/api/market-radar');
            const result = await resp.json();

            console.log(`📡 [RADAR DEBUG] API Received: ${result.data?.length || 0} assets. Status: ${result.status}`);

            if (result.status === 'debug_fallback' || (result.data && result.data.length > 0)) {
                setOpportunities(result.data);
                setStatus(result.status);
            } else {
                setOpportunities([]);
                setStatus('empty');
            }
        } catch (error) {
            console.error("❌ [RADAR ERROR] Fetch failed:", error);
            setStatus('empty');
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

    const executeManualTrade = async (symbol: string, price: number) => {
        const qty = calculatePositionSize(price);
        const amount = capitalBase * 0.05;

        if (!window.confirm(`¿Confirmar inversión en ${symbol}?\nInversión: $${amount.toFixed(2)}`)) return;

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
                alert(`🚀 Inversión ejecutada para ${symbol}`);
            }
        } catch (e) {
            console.error("Trade Error", e);
        }
    };

    const filtered = opportunities.filter(o =>
        o.symbol.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="glass-card p-6 rounded-2xl border border-white/10 bg-[#0b1d16]/50 backdrop-blur-xl h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Zap className="text-accent" size={20} />
                        TOP 10 RADAR OPPORTUNITIES
                    </h2>
                    <p className="text-sm text-gray-400 font-mono tracking-tighter">
                        {status === 'debug_fallback' ? (
                            <span className="text-orange-400 animate-pulse">⚠️ Analizando mercado: Filtros actuales muy estrictos (Mostrando Top Volumen)</span>
                        ) : (
                            "Ranking Neural Alpha: RSI(1H) + Sentimiento de Mercado"
                        )}
                    </p>
                </div>

                <div className="relative flex-grow md:flex-grow-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Filtrar ranking..."
                        className="pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:border-accent outline-none transition-all w-full md:w-48"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left">
                    <thead className="sticky top-0 bg-[#0b1d16] z-10 border-b border-white/5">
                        <tr className="text-gray-500 text-[10px] uppercase tracking-wider">
                            <th className="pb-3 pl-2">#</th>
                            <th className="pb-3">Activo</th>
                            <th className="pb-3 text-right">Precio</th>
                            <th className="pb-3 text-center">RSI</th>
                            <th className="pb-3 text-center">IA</th>
                            <th className="pb-3 text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="py-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent"></div>
                                        <p className="text-sm text-gray-400 font-medium tracking-widest">Buscando oportunidades...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-12 text-center text-gray-500 text-sm italic">
                                    Ninguna oportunidad detectada. Intente relajando los términos de búsqueda.
                                </td>
                            </tr>
                        ) : filtered.map((op, idx) => (
                            <tr key={op.symbol} className={`hover:bg-white/5 transition-colors group ${op.rsi < 45 ? 'bg-accent/5' : ''}`}>
                                <td className="py-3 pl-2">
                                    <span className={`text-[10px] font-bold ${idx < 3 ? 'text-accent' : 'text-gray-600'}`}>
                                        {idx + 1}
                                    </span>
                                </td>
                                <td className="py-3">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-7 h-7 rounded bg-black/40 border border-white/10 flex items-center justify-center font-bold text-[10px] ${idx < 3 ? 'text-accent' : 'text-white'}`}>
                                            {op.symbol.replace('USDT', '')}
                                        </div>
                                        <span className="font-bold text-white text-xs">{op.symbol}</span>
                                    </div>
                                </td>
                                <td className="py-3 text-right font-mono text-[11px] text-white">
                                    ${op.price < 1 ? op.price.toFixed(5) : op.price.toLocaleString()}
                                </td>
                                <td className="py-3 text-center">
                                    <span className={`text-xs font-mono font-bold ${op.rsi < 45 ? 'text-green-400' : 'text-gray-500'}`}>
                                        {op.rsi.toFixed(0)}
                                    </span>
                                </td>
                                <td className="py-3 text-center">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border border-white/10 ${op.sentiment_score > 0.2 ? 'text-accent bg-accent/5' :
                                            op.sentiment_score < -0.2 ? 'text-red-500 bg-red-500/5' :
                                                'text-gray-600'
                                        }`}>
                                        {op.sentiment_score > 0 ? '+' : ''}{op.sentiment_score.toFixed(1)}
                                    </span>
                                </td>
                                <td className="py-3 text-right">
                                    <button
                                        onClick={() => executeManualTrade(op.symbol, op.price)}
                                        className="px-3 py-1 bg-accent/10 hover:bg-accent text-accent hover:text-black font-bold rounded text-[10px] transition-all uppercase tracking-tighter"
                                    >
                                        Invertir
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="text-accent" size={14} />
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Modo Alpha v2.0</span>
                </div>
                <div className="text-[10px] text-gray-400 font-mono">
                    Ref: $10,000 | Límite: $500
                </div>
            </div>
        </div>
    );
};

export default GlobalMarketRadar;
