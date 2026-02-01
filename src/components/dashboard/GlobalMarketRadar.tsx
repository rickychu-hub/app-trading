import React, { useState, useEffect } from 'react';
import { Search, Zap, ShieldCheck } from 'lucide-react';

interface MarketOpportunity {
    symbol: string;
    price: number;
    rsi: number;
    volume_24h: number;
    sentiment_score: number;
    sentiment_label?: string;
}

const GlobalMarketRadar: React.FC = () => {
    const [opportunities, setOpportunities] = useState<MarketOpportunity[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<'ok' | 'debug_fallback' | 'empty' | 'error'>('ok');
    const [search, setSearch] = useState('');

    const fetchRadar = async () => {
        try {
            const resp = await fetch('/api/market-radar');
            const result = await resp.json();

            console.log(`📡 [RADAR DEBUG] Recibidos: ${result.data?.length || 0} activos. Status: ${result.status}`);

            if (result.data && result.data.length > 0) {
                setOpportunities(result.data);
                setStatus(result.status);
            } else {
                setOpportunities([]);
                setStatus(result.status === 'error' ? 'error' : 'empty');
            }
        } catch (error) {
            console.error("❌ [RADAR ERROR]:", error);
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRadar();
        const interval = setInterval(fetchRadar, 60000); // 1 min sync
        return () => clearInterval(interval);
    }, []);


    const executeManualTrade = async (ticker: string, price: number) => {
        const amount = 500; // AS REQUESTED: $500 per manual trade
        const qty = amount / price;

        if (!window.confirm(`¿Confirmar inversión inmediata en ${ticker}?\nInversión Estimada: $${amount.toFixed(2)}`)) return;

        try {
            const resp = await fetch('/api/trades', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticker: ticker.replace('USDT', ''),
                    entry_price: price,
                    invested_amount: amount,
                    quantity: qty,
                    status: 'OPEN'
                })
            });

            if (resp.ok) {
                alert(`🚀 ORDEN EJECUTADA: Posición abierta en ${ticker}`);
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
                        DETECTOR TOP 10 ALPHA
                    </h2>
                    <p className="text-sm text-gray-400 font-mono tracking-tighter">
                        {status === 'debug_fallback' ? (
                            <span className="text-orange-400 animate-pulse">⚠️ Analizando mercado: Filtros estrictos (Mostrando Top Volumen)</span>
                        ) : status === 'error' ? (
                            <span className="text-red-400">❌ Error de conexión con el scanner de Bitget</span>
                        ) : (
                            "Escaneando 50 activos en Bitget Real-Time"
                        )}
                    </p>
                </div>

                <div className="relative flex-grow md:flex-grow-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Filtrar activos..."
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
                            <th className="pb-3 pl-2">RANKING</th>
                            <th className="pb-3">ACTIVO</th>
                            <th className="pb-3 text-right">PRECIO</th>
                            <th className="pb-3 text-center">RSI</th>
                            <th className="pb-3 text-center">IA NEURAL</th>
                            <th className="pb-3 text-right">ACCIÓN</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="py-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent"></div>
                                        <p className="text-sm text-accent font-bold tracking-widest animate-pulse">ESCANEANDO BITGET...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-12 text-center text-gray-500 text-sm italic">
                                    No hay datos disponibles en este momento.
                                </td>
                            </tr>
                        ) : filtered.map((op, idx) => {
                            const isGoldOpportunity = op.rsi < 35 && op.sentiment_score > 0.3;
                            const isVetoAlert = op.rsi < 35 && op.sentiment_score < -0.3;

                            return (
                                <tr key={op.symbol} className={`hover:bg-white/5 transition-all group border-l-2 ${isGoldOpportunity ? 'border-l-yellow-500 bg-yellow-500/5 shadow-[inset_0_0_20px_rgba(234,179,8,0.05)]' : 'border-l-transparent'} ${op.rsi < 45 && !isGoldOpportunity ? 'bg-accent/5' : ''}`}>
                                    <td className="py-3 pl-2">
                                        <span className={`text-[10px] font-bold ${idx < 3 ? 'text-accent' : 'text-gray-600'}`}>
                                            # {idx + 1}
                                        </span>
                                    </td>
                                    <td className="py-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-8 h-8 rounded bg-black/40 border border-white/10 flex items-center justify-center font-bold text-[10px] ${idx < 3 ? 'text-accent border-accent/30 shadow-[0_0_10px_rgba(132,204,22,0.1)]' : 'text-white'}`}>
                                                {op.symbol.replace('USDT', '')}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white text-xs flex items-center gap-1">
                                                    {op.symbol}
                                                    {isGoldOpportunity && (
                                                        <span className="px-1.5 py-0.5 bg-yellow-500 text-black text-[8px] font-black rounded animate-pulse">
                                                            GOLDEN
                                                        </span>
                                                    )}
                                                    {isVetoAlert && (
                                                        <span title="Neural Veto Recommended" className="text-red-500 animate-bounce">
                                                            ⚠️
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
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
                                        <div className="flex flex-col items-center">
                                            <span className={`text-[9px] uppercase font-bold mb-0.5 ${op.sentiment_label === 'Real-Time Bitget' ? 'text-accent' : 'text-gray-600'}`}>
                                                {op.sentiment_label}
                                            </span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border border-white/10 ${op.sentiment_score > 0.2 ? 'text-accent bg-accent/5 border-accent/20' :
                                                op.sentiment_score < -0.2 ? 'text-red-500 bg-red-500/5 border-red-500/20' :
                                                    'text-gray-600'
                                                }`}>
                                                {op.sentiment_score > 0 ? '+' : ''}{op.sentiment_score.toFixed(1)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-3 text-right">
                                        <button
                                            onClick={() => executeManualTrade(op.symbol, op.price)}
                                            className={`px-4 py-1.5 font-extrabold rounded text-[10px] transition-all uppercase tracking-tighter ${isGoldOpportunity ? 'bg-yellow-500 hover:bg-white text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 'bg-accent hover:bg-white text-black'}`}
                                        >
                                            INVERTIR
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="text-accent" size={14} />
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Botón Manual: Ejecución Directa de Mercado</span>
                </div>
                <div className="text-[10px] text-gray-600 font-mono italic">
                    Risk Limit: 5% ($500) per order
                </div>
            </div>
        </div>
    );
};

export default GlobalMarketRadar;
