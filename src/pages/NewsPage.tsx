
import React, { useEffect, useState } from 'react';
import { Newspaper, ExternalLink, Calendar, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface NewsArticle {
    id: number;
    title: string;
    summary: string;
    url: string;
    published_at: string;
    source: string;
    sentiment?: string;
}

const NewsPage: React.FC = () => {
    const [news, setNews] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const { data, error } = await supabase
                    .from('news')
                    .select('*')
                    .order('published_at', { ascending: false });

                if (error) {
                    console.error('Error fetching news:', error);
                    setNews([]);
                } else if (data) {
                    setNews(data);
                }
            } catch (error) {
                console.error("Error fetching news:", error);
                setNews([]);
            } finally {
                setLoading(false);
            }
        };

        fetchNews();
    }, []);

    const totalPages = Math.ceil(news.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentNews = news.slice(startIndex, startIndex + itemsPerPage);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-4 md:space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent flex items-center gap-2 md:gap-3">
                        <Newspaper size={24} className="md:w-8 md:h-8 text-accent" />
                        Centro de Noticias
                    </h2>
                    <p className="text-gray-400 mt-1 md:mt-2 text-sm md:text-base">
                        Últimas noticias financieras y análisis de mercado
                    </p>
                </div>
                <div className="text-left md:text-right">
                    <div className="text-xs md:text-sm text-gray-500">Total de noticias</div>
                    <div className="text-xl md:text-2xl font-bold text-white">{news.length}</div>
                </div>
            </div>

            {/* News List */}
            <div className="space-y-3 md:space-y-4">
                {loading ? (
                    <div className="glass-panel rounded-xl border border-white/10 p-8 md:p-12 flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-2 border-accent border-t-transparent mb-4"></div>
                        <p className="text-gray-500 text-sm md:text-base">Cargando noticias...</p>
                    </div>
                ) : currentNews.length === 0 ? (
                    <div className="glass-panel rounded-xl border border-white/10 p-8 md:p-12 flex flex-col items-center justify-center">
                        <Newspaper size={40} className="md:w-12 md:h-12 text-gray-600 mb-4" />
                        <p className="text-gray-500 text-sm md:text-base">No hay noticias disponibles</p>
                    </div>
                ) : (
                    currentNews.map((article) => (
                        <div
                            key={article.id}
                            className="glass-panel rounded-xl border border-white/10 p-4 md:p-6 transition-all hover:border-accent/50"
                        >
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4">
                                <div className="flex-1">
                                    {/* Source and Date */}
                                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2 md:mb-3">
                                        <span className="text-[10px] md:text-xs text-accent border border-accent/20 px-2 py-1 rounded bg-accent/5 uppercase font-bold">
                                            {article.source || 'News'}
                                        </span>
                                        <span className="text-[10px] md:text-xs text-gray-500 flex items-center gap-1">
                                            <Calendar size={12} />
                                            {formatDate(article.published_at)}
                                        </span>
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3 leading-tight">
                                        {article.title}
                                    </h3>

                                    {/* Summary */}
                                    <p className="text-gray-400 text-sm leading-relaxed mb-3 md:mb-4">
                                        {article.summary}
                                    </p>

                                    {/* Read More Link */}
                                    {article.url && (
                                        <a
                                            href={article.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-xs md:text-sm text-accent hover:text-accent/80 transition-colors"
                                        >
                                            Leer artículo completo <ExternalLink size={14} />
                                        </a>
                                    )}
                                </div>

                                {/* Sentiment Indicator (if available) */}
                                {article.sentiment && (
                                    <div className="flex flex-row md:flex-col items-center gap-2 px-3 md:px-4 py-2 md:py-3 bg-black/20 rounded-lg border border-white/5 self-start">
                                        <TrendingUp size={18} className="md:w-5 md:h-5 text-green-400" />
                                        <span className="text-[10px] md:text-xs text-gray-500">Sentiment</span>
                                        <span className="text-xs md:text-sm font-bold text-green-400">{article.sentiment}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 md:mt-8">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 md:px-4 py-2 text-sm md:text-base rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                    >
                        Anterior
                    </button>
                    <span className="text-gray-400 text-xs md:text-sm px-2">
                        Página {currentPage} de {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 md:px-4 py-2 text-sm md:text-base rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                    >
                        Siguiente
                    </button>
                </div>
            )}
        </div>
    );
};

export default NewsPage;
