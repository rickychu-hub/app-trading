
import React, { useEffect, useState } from 'react';
import { Newspaper } from 'lucide-react';
import { type NewsItem } from '../../data/mockData';

import { supabase } from '../../lib/supabaseClient';

const IntelligenceHub: React.FC = () => {
    const [news, setNews] = useState<NewsItem[]>([]);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                // Fetch recent news attached to trades
                const { data } = await supabase
                    .from('paper_trades')
                    .select('news_id, news_summary, news_sentiment_score, ticker, created_at')
                    .not('news_summary', 'is', null)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (data && data.length > 0) {
                    const mappedNews: NewsItem[] = data.map((item: any) => ({
                        id: item.news_id || Math.random(),
                        titulo: `Market Update: ${item.ticker}`,
                        resumen: item.news_summary,
                        enlace: '#',
                        fecha: item.created_at,
                        empresas: [item.ticker],
                        sentiment_score: item.news_sentiment_score,
                        sentimiento: item.news_sentiment_score > 0 ? 'Positivo' : 'Negativo'
                    }));
                    setNews(mappedNews);
                } else {
                    setNews([]);
                }
            } catch (error) {
                console.error("Error fetching intelligence:", error);
                setNews([]);
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
                {news.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2 opacity-60">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent"></div>
                        <p className="text-xs">⏳ Esperando análisis de Gemini...</p>
                    </div>
                ) : (
                    news.map((item, i) => (
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
                    ))
                )}
            </div>
        </div>
    );
};

export default IntelligenceHub;
