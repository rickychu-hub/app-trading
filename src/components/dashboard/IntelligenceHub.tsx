
import React, { useEffect, useState } from 'react';
import { Newspaper } from 'lucide-react';
import { type NewsItem, mockNews } from '../../data/mockData';

const IntelligenceHub: React.FC = () => {
    const [news, setNews] = useState<NewsItem[]>([]);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const response = await fetch('/api/news');
                if (response.ok) {
                    setNews(await response.json());
                } else {
                    setNews(mockNews.slice(0, 5));
                }
            } catch {
                setNews(mockNews.slice(0, 5));
            }
        };
        fetchNews();
    }, []);

    return (
        <div className="glass-panel rounded-xl border border-white/10 p-4 h-full flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                <Newspaper size={100} />
            </div>

            <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                <Newspaper size={14} /> Gemini Intelligence Feed
            </h3>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                {news.map((item, i) => (
                    <div key={i} className="p-3 rounded-lg bg-black/20 border border-white/5 hover:border-accent/30 transition-all group">
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] text-accent border border-accent/20 px-1.5 py-0.5 rounded bg-accent/5 uppercase font-bold tracking-wider">
                                {item.empresas ? item.empresas[0] : 'MARKET'}
                            </span>
                            <span className={`text-[10px] font-bold ${item.sentimiento === 'Positivo' ? 'text-green-400' : 'text-red-400'}`}>
                                {item.sentiment_score ? (item.sentiment_score * 10).toFixed(1) : 0}/10
                            </span>
                        </div>
                        <h4 className="text-sm font-medium text-gray-200 mt-2 leading-snug group-hover:text-white transition-colors">
                            {item.titulo}
                        </h4>
                        <p className="text-[11px] text-gray-500 mt-2 line-clamp-2">
                            {item.resumen}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default IntelligenceHub;
