import { useState } from 'react';
import Layout from './components/layout/Layout';
import NewsIntelligencePanel from './components/dashboard/NewsIntelligencePanel';
import PaperTradingPanel from './components/dashboard/PaperTradingPanel';
import TradeModal from './components/dashboard/TradeModal';
import TradingJournalPanel from './components/dashboard/TradingJournalPanel';
import type { NewsItem } from './data/mockData';

function App() {
  const [activeView, setActiveView] = useState<'news' | 'portfolio' | 'journal'>('news');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  const handleSimulateTrade = (item: NewsItem) => {
    setSelectedNews(item);
    setIsModalOpen(true);
  };

  const handleConfirmTrade = async (ticker: string, priceStr: string, amountStr: string) => {
    const price = priceStr ? parseFloat(priceStr) : 0;
    const amount = amountStr ? parseFloat(amountStr) : 0;

    // Calculate quantity
    const quantity = (price > 0 && amount > 0) ? amount / price : 0;

    if (!selectedNews) return;

    try {
      const response = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: ticker,
          entry_price: price,
          invested_amount: amount,
          quantity: quantity,
          news_id: String(selectedNews.id),
          initial_score: selectedNews.sentiment_score || 0,
          status: "OPEN"
        })
      });

      if (response.ok) {
        alert("Trade simulado guardado correctamente.");
        setIsModalOpen(false);
        setSelectedNews(null);
        setActiveView('portfolio');
      } else {
        alert("Error al guardar el trade.");
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión");
    }
  };

  return (
    <Layout activeView={activeView} onViewChange={setActiveView}>
      <div className="mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          {activeView === 'news' ? 'Dashboard General' : activeView === 'portfolio' ? 'Portfolio Simulado' : 'Diario de Trading Inteligente'}
        </h2>
        <p className="text-gray-400">
          {activeView === 'news'
            ? 'Bienvenido a su centro de inteligencia financiera.'
            : activeView === 'portfolio'
              ? 'Gestión y seguimiento de operaciones simuladas.'
              : 'Análisis automatizado de sus operaciones pasadas.'}
        </p>
      </div>

      {activeView === 'news' ? (
        <NewsIntelligencePanel onSimulateTrade={handleSimulateTrade} />
      ) : activeView === 'portfolio' ? (
        <PaperTradingPanel />
      ) : (
        <TradingJournalPanel />
      )}

      <TradeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmTrade}
        initialTicker={selectedNews && selectedNews.empresas && selectedNews.empresas.length > 0 ? selectedNews.empresas[0] : ""}
      />
    </Layout>
  );
}

export default App;
