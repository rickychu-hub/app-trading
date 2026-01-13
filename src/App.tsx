import { useState } from 'react';
import Layout from './components/layout/Layout';
import NewsIntelligencePanel from './components/dashboard/NewsIntelligencePanel';
import PaperTradingPanel from './components/dashboard/PaperTradingPanel';
import TradeModal from './components/dashboard/TradeModal';
import TradingJournalPanel from './components/dashboard/TradingJournalPanel';
import SettingsPanel from './components/dashboard/SettingsPanel';
import { supabase } from './lib/supabaseClient';
import type { NewsItem } from './data/mockData';
import { formatQuantity } from './utils/tradeUtils';

function App() {
  const [activeView, setActiveView] = useState<'news' | 'portfolio' | 'journal' | 'settings'>('news');
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
    const rawQuantity = (price > 0 && amount > 0) ? amount / price : 0;
    const quantity = parseFloat(formatQuantity(rawQuantity));

    if (!selectedNews) return;

    try {
      const { error } = await supabase.from('trades').insert([
        {
          ticker: ticker,
          entry_price: price,
          invested_amount: amount,
          quantity: quantity,
          news_id: String(selectedNews.id),
          initial_score: selectedNews.sentiment_score || 0,
          status: "OPEN"
        }
      ]);

      if (!error) {
        alert("Trade simulado guardado correctamente.");
        setIsModalOpen(false);
        setSelectedNews(null);
        setActiveView('portfolio');
      } else {
        console.error("Supabase error:", error);
        alert(`Error al guardar el trade: ${error.message}`);
      }
    } catch (error: any) {
      console.error("Unexpected error:", error);
      alert("Error inesperado al guardar el trade.");
    }
  };

  return (
    <Layout activeView={activeView} onViewChange={setActiveView}>
      <div className="mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          {activeView === 'news' ? 'Dashboard General' :
            activeView === 'portfolio' ? 'Portfolio Simulado' :
              activeView === 'journal' ? 'Diario de Trading Inteligente' :
                'Configuración'}
        </h2>
        <p className="text-gray-400">
          {activeView === 'news'
            ? 'Bienvenido a su centro de inteligencia financiera.'
            : activeView === 'portfolio'
              ? 'Gestión y seguimiento de operaciones simuladas.'
              : activeView === 'journal'
                ? 'Análisis automatizado de sus operaciones pasadas.'
                : 'Gestión de parámetros y preferencias.'}
        </p>
      </div>

      {activeView === 'news' ? (
        <NewsIntelligencePanel onSimulateTrade={handleSimulateTrade} />
      ) : activeView === 'portfolio' ? (
        <PaperTradingPanel />
      ) : activeView === 'journal' ? (
        <TradingJournalPanel />
      ) : (
        <SettingsPanel />
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
