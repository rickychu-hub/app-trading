import React from 'react';
import NewsCard from './NewsCard';
import { mockNews } from '../../data/mockData';
import { Loader2 } from 'lucide-react';

const NewsIntelligencePanel: React.FC = () => {
    const [news, setNews] = React.useState(mockNews);
    const [loading, setLoading] = React.useState(false); // Start false to show initial mocks, or true if we want blank slate. Let's use mocks as initial state or fallback.

    React.useEffect(() => {
        const fetchNews = async () => {
            setLoading(true);
            try {
                const response = await fetch("/api/news");
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.length > 0) {
                        setNews(data);
                    }
                }
            } catch (error) {
                console.error("Error fetching news:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchNews();
    }, []);

    return (
        <div className="glass-panel rounded-2xl p-8 border border-white/10">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        News Intelligence <span className="text-accent text-sm bg-accent/10 px-2 py-1 rounded border border-accent/20">LIVE</span>
                    </h2>
                    <p className="text-gray-400 mt-1">Análisis de sentimiento en tiempo real del mercado global.</p>
                </div>
                <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                    <Loader2 className={`text-accent ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {news.map((item, index) => (
                    <NewsCard key={index} item={item} />
                ))}
            </div>
        </div>
    );
};

export default NewsIntelligencePanel;
