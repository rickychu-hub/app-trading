import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, TrendingUp, TrendingDown, BookOpen, BrainCircuit } from 'lucide-react';

interface JournalEntry {
    id: number;
    ticker: string;
    closeDate: string;
    pnl: number;
    pnlPercent: number;
    newsTitle: string;
    newsScore: number;
    analysis: string;
    type: 'WIN' | 'LOSS';
}

const MOCK_JOURNAL_DATA: JournalEntry[] = [
    {
        id: 1,
        ticker: 'SOL',
        closeDate: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
        pnl: 150.40,
        pnlPercent: 12.5,
        newsTitle: "Solana Supera Resistencia Clave tras Actualización de Red",
        newsScore: 0.85,
        analysis: "✅ Ejecución Exitosa: La entrada basada en la noticia 'Solana Supera Resistencia Clave...' fue correcta. El momentum del mercado acompañó la operación y se respetó el Take Profit.",
        type: 'WIN'
    },
    {
        id: 2,
        ticker: 'BTC',
        closeDate: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
        pnl: -45.20,
        pnlPercent: -3.2,
        newsTitle: "Rumores de Regulación Crypto en EEUU Generan Incertidumbre",
        newsScore: -0.4,
        analysis: "⚠️ Lección Aprendida: A pesar de la señal técnica inicial, los 'Rumores de Regulación...' cambiaron el sentimiento rápidamente. El Stop Loss protegió el capital mayor.",
        type: 'LOSS'
    },
    {
        id: 3,
        ticker: 'ETH',
        closeDate: new Date(Date.now() - 86400000 * 10).toISOString(),
        pnl: 320.00,
        pnlPercent: 8.4,
        newsTitle: "BlackRock Insinúa Nuevo ETF de Ethereum al Contado",
        newsScore: 0.92,
        analysis: "✅ Ejecución Exitosa: Captura perfecta de catalizador fundamental. La noticia de BlackRock generó un flujo institucional que se aprovechó correctamente.",
        type: 'WIN'
    }
];

const TradingJournalPanel: React.FC = () => {
    const [entries, setEntries] = useState<JournalEntry[]>([]);

    useEffect(() => {
        // Here we would fetch closed trades from DB and generate analysis
        // For now, we use the mock data as requested
        setEntries(MOCK_JOURNAL_DATA);
    }, []);

    return (
        <div className="mt-8 space-y-8 animate-fade-in">
            {/* Header / Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6 rounded-2xl border border-white/10 flex items-center gap-4">
                    <div className="p-3 bg-accent/10 rounded-xl text-accent">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">Operaciones Analizadas</p>
                        <p className="text-2xl font-bold text-white">{entries.length}</p>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl border border-white/10 flex items-center gap-4">
                    <div className="p-3 bg-green-500/10 rounded-xl text-green-400">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">Win Rate</p>
                        <p className="text-2xl font-bold text-white">
                            {((entries.filter(e => e.type === 'WIN').length / entries.length) * 100).toFixed(0)}%
                        </p>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl border border-white/10 flex items-center gap-4">
                    <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                        <BrainCircuit size={24} />
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">Insights IA</p>
                        <p className="text-2xl font-bold text-white">Activo</p>
                    </div>
                </div>
            </div>

            {/* Timeline */}
            <div className="glass-panel rounded-2xl p-8 border border-white/10">
                <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-2">
                    Historial de Análisis <span className="text-xs bg-white/10 px-2 py-1 rounded font-normal text-gray-400">AI Generated</span>
                </h2>

                <div className="relative border-l-2 border-white/10 ml-4 space-y-12">
                    {entries.map((entry) => (
                        <div key={entry.id} className="relative pl-8">
                            {/* Dot */}
                            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-[#0b1d16] ${entry.type === 'WIN' ? 'bg-green-500' : 'bg-red-500'
                                }`} />

                            <div className="flex flex-col gap-4">
                                {/* Header */}
                                <div className="flex flex-wrap items-center gap-4">
                                    <span className="text-sm text-gray-400 flex items-center gap-2">
                                        <Calendar size={14} />
                                        {new Date(entry.closeDate).toLocaleDateString()}
                                    </span>
                                    <h3 className={`text-lg font-bold flex items-center gap-2 ${entry.type === 'WIN' ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                        {entry.type === 'WIN' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                        {entry.type === 'WIN' ? 'Ganancia' : 'Pérdida'} en {entry.ticker}: {entry.pnl >= 0 ? '+' : ''}{entry.pnlPercent}%
                                        <span className="text-gray-500 text-sm font-mono ml-1">
                                            (${entry.pnl})
                                        </span>
                                    </h3>
                                </div>

                                {/* Content Card */}
                                <div className="bg-white/5 rounded-xl p-6 border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="mb-4">
                                        <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Contexto de Entrada</p>
                                        <p className="text-gray-300 italic">"{entry.newsTitle}" (Score: {entry.newsScore})</p>
                                    </div>

                                    <div>
                                        <p className="text-xs uppercase tracking-wider text-accent mb-1 flex items-center gap-1">
                                            <BrainCircuit size={12} /> Análisis Post-Mortem
                                        </p>
                                        <p className="text-gray-200 leading-relaxed">
                                            {entry.analysis}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TradingJournalPanel;
