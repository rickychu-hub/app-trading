import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { NewsItem } from '../../data/mockData';

interface NewsCardProps {
    item: NewsItem;
}

const NewsCard: React.FC<NewsCardProps> = ({ item }) => {
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

    const styles = getSentimentStyles(item.sentimiento);

    return (
        <div className={`glass-card p-6 rounded-xl border ${styles.border} ${styles.glow} relative overflow-hidden group hover:-translate-y-1`}>
            <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 ${styles.badge}`}>
                    {styles.icon}
                    {item.sentimiento.toUpperCase()}
                </span>
            </div>

            <p className="text-lg font-medium text-gray-100 mb-6 leading-relaxed">
                {item.resumen}
            </p>

            {item.empresas.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-auto">
                    {item.empresas.map((empresa, idx) => (
                        <span key={idx} className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded border border-white/5">
                            {empresa}
                        </span>
                    ))}
                </div>
            )}

            {/* Decorative gradient blob */}
            <div className={`absolute -right-10 -bottom-10 w-32 h-32 rounded-full blur-3xl opacity-10 ${item.sentimiento === 'Positivo' ? 'bg-accent' :
                item.sentimiento === 'Negativo' ? 'bg-red-500' : 'bg-gray-500'
                }`}></div>
        </div>
    );
};

export default NewsCard;
