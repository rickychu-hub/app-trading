import React, { useEffect, useState } from 'react';
import NewsCard from './NewsCard';
import { Loader2, RefreshCw } from 'lucide-react';
import { type NewsItem, mockNews } from '../../data/mockData';

interface NewsIntelligencePanelProps {
    onSimulateTrade: (item: NewsItem) => void;
}

const NewsIntelligencePanel: React.FC<NewsIntelligencePanelProps> = ({ onSimulateTrade }) => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchNews = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/news');
            if (response.ok) {
                const data = await response.json();
                setNews(data);
                setLastUpdated(new Date());
            } else {
                console.error("Failed to fetch news");
                // Fallback to mock data if API fails
                setNews(mockNews);
            }
        } catch (error) {
            console.error("Error fetching news:", error);
            setNews(mockNews);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();

        // Refresh every 5 minutes
        const interval = setInterval(fetchNews, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-8">
            <div className="glass-panel rounded-2xl p-8 border border-white/10">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            News Intelligence <span className="text-accent text-sm bg-accent/10 px-2 py-1 rounded border border-accent/20">LIVE Gemini 2.0</span>
                        </h2>
                        <p className="text-gray-400 mt-1">
                            Análisis de sentimiento en tiempo real del mercado global.
                            {lastUpdated && <span className="text-xs text-gray-500 ml-2">Actualizado: {lastUpdated.toLocaleTimeString()}</span>}
                        </p>
                    </div>
                    <button
                        onClick={fetchNews}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors border border-white/10"
                        title="Actualizar noticias"
                    >
                        <RefreshCw size={20} className={`text-accent ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {loading && news.length === 0 ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-12 h-12 text-accent animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {news.map((item, index) => (
                            <NewsCard key={item.id || index} item={item} onSimulateTrade={onSimulateTrade} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewsIntelligencePanel;
