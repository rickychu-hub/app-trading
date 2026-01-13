import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { NewsItem } from '../../data/mockData';

interface NewsCardProps {
    item: NewsItem;
    onSimulateTrade: (item: NewsItem) => void;
}

const NewsCard: React.FC<NewsCardProps> = ({ item, onSimulateTrade }) => {
    const getSentimentStyles = (sentimiento: string) => {
        switch (sentimiento) {
            case 'Positivo':
                return {
                    border: 'border-accent',
                    icon: <TrendingUp className="text-accent" />,
                    badge: 'bg-accent/10 text-accent',
                    glow: 'shadow-[0_0_20px_rgba(132,204,22,0.1)]'
                };
            case 'Negativo':
                return {
                    border: 'border-red-500',
                    icon: <TrendingDown className="text-red-500" />,
                    badge: 'bg-red-500/10 text-red-500',
                    glow: 'shadow-[0_0_20px_rgba(239,68,68,0.1)]'
                };
            default:
                return {
                    border: 'border-gray-500',
                    icon: <Minus className="text-gray-400" />,
                    badge: 'bg-gray-500/10 text-gray-400',
                    glow: ''
                };
        }
    };

    const getCategoryColor = (cat?: string) => {
        switch (cat) {
            case 'Crypto': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
            case 'Forex': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'Stock': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
            default: return 'bg-white/5 text-gray-400 border-white/10';
        }
    };

    const styles = getSentimentStyles(item.sentimiento);

    const handleSimulateTrade = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click
        onSimulateTrade(item);
    };

    return (
        <div className={`glass-card p-6 rounded-xl border ${styles.border} ${styles.glow} relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 flex flex-col`}>
            <div className="flex justify-between items-start mb-4">
                <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 ${styles.badge}`}>
                        {styles.icon}
                        {item.sentimiento.toUpperCase()}
                    </span>
                    {item.category && (
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getCategoryColor(item.category)}`}>
                            {item.category}
                        </span>
                    )}
                </div>
                {item.sentiment_score !== undefined && (
                    <div className={`flex items-center gap-1 text-xs font-mono px-2 py-1 rounded bg-black/50 ${item.sentiment_score > 0.2 ? 'text-green-400' :
                        item.sentiment_score < -0.2 ? 'text-red-400' : 'text-gray-400'
                        }`}>
                        SCORE: {item.sentiment_score.toFixed(2)}
                    </div>
                )}
                )}
            </div>

            <a href={item.enlace} target="_blank" rel="noopener noreferrer" className="block mb-2 group-hover:text-accent transition-colors">
                <h3 className="text-lg font-bold text-white leading-tight">
                    {item.titulo}
                </h3>
            </a>

            <p className="text-sm text-gray-400 mb-6 leading-relaxed flex-grow">
                {item.resumen}
            </p>

            <div className="flex justify-between items-end mt-4">
                {item.empresas.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {item.empresas.map((empresa, idx) => (
                            <span key={idx} className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded border border-white/5">
                                {empresa}
                            </span>
                        ))}
                    </div>
                ) : <div></div>}

                <button
                    onClick={handleSimulateTrade}
                    className="ml-4 px-3 py-1.5 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 rounded text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer z-10"
                >
                    <TrendingUp size={14} /> Simular Trade
                </button>
            </div>

            {/* Decorative gradient blob */}
            <div className={`absolute -right-10 -bottom-10 w-32 h-32 rounded-full blur-3xl opacity-10 ${item.sentimiento === 'Positivo' ? 'bg-accent' :
                item.sentimiento === 'Negativo' ? 'bg-red-500' : 'bg-gray-500'
                }`}></div>
        </div>
    );
};

export default NewsCard;
