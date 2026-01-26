
import React, { useEffect, useState } from 'react';
import { Newspaper, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface NewsArticle {
    id: number;
    title: string;
    summary: string;
    url: string;
    published_at: string;
    source: string;
    sentiment?: string;
}

interface IntelligenceHubProps {
    onViewAllClick?: () => void;
}

const IntelligenceHub: React.FC<IntelligenceHubProps> = ({ onViewAllClick }) => {
    const [news, setNews] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                // Fetch from public.news table
                const { data, error } = await supabase
                    .from('news')
                    .select('*')
                    .order('published_at', { ascending: false })
                    .limit(3);

                if (error) {
                    console.error('Error fetching news:', error);
                    setNews([]);
                } else if (data) {
                    setNews(data);
                }
            } catch (error) {
                console.error("Error fetching intelligence:", error);
                setNews([]);
            } finally {
                setLoading(false);
            }
        };

        fetchNews();
        const interval = setInterval(fetchNews, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 60) return `Hace ${diffMins}m`;
        if (diffHours < 24) return `Hace ${diffHours}h`;
        return `Hace ${diffDays}d`;
    };

    return (
        <div className="glass-panel rounded-xl border border-white/10 p-4 h-full flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                <Newspaper size={100} />
            </div>

            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase flex items-center gap-2">
                    <Newspaper size={14} /> Intelligence Feed
                </h3>
                {onViewAllClick && (
                    <button
                        onClick={onViewAllClick}
                        className="text-xs text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
                    >
                        Ver todas <ExternalLink size={12} />
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2 opacity-60">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent"></div>
                        <p className="text-xs">⏳ Cargando noticias...</p>
                    </div>
                ) : news.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2 opacity-60">
                        <Newspaper size={32} className="opacity-30" />
                        <p className="text-xs">No hay noticias disponibles</p>
                    </div>
                ) : (
                    news.map((article) => (
                        <div
                            key={article.id}
                            onClick={onViewAllClick}
                            className="p-3 rounded-lg bg-black/20 border border-white/5 hover:border-accent/30 transition-all group cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] text-accent border border-accent/20 px-1.5 py-0.5 rounded bg-accent/5 uppercase font-bold tracking-wider">
                                    {article.source || 'NEWS'}
                                </span>
                                <span className="text-[10px] text-gray-500">
                                    {formatDate(article.published_at)}
                                </span>
                            </div>
                            <h4 className="text-sm font-medium text-gray-200 mt-2 leading-snug group-hover:text-white transition-colors line-clamp-2">
                                {article.title}
                            </h4>
                            <p className="text-[11px] text-gray-500 mt-2 line-clamp-2">
                                {article.summary}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default IntelligenceHub;
