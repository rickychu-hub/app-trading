import React, { useState, useEffect } from 'react';
import { Activity, Power, Plus, Trash2 } from 'lucide-react';
import { useStrategyStore } from '../../store/strategyStore';
import { useBotStore } from '../../store/botStore';
import { useBinancePrices } from '../../hooks/useBinancePrices';
import StrategyUnit from './StrategyUnit';
import BotActivityPanel from './BotActivityPanel';

interface StrategyMonitorProps {
    onExecuteTrade?: (side: 'BUY' | 'SELL', price: number, reason: string, ticker: string, amount: number) => Promise<void>;
}

const StrategyMonitor: React.FC<StrategyMonitorProps> = ({ onExecuteTrade }) => {
    const { isAutoTrading, setIsAutoTrading, strategy } = useStrategyStore();
    const { selectedAssets, toggleAsset, clearLogs } = useBotStore();
    const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
    const [newAsset, setNewAsset] = useState('');
    const [activeTrades, setActiveTrades] = useState<any[]>([]);

    // Centralized Price Fetching
    const livePrices = useBinancePrices(selectedAssets);

    const fetchActiveTrades = async () => {
        try {
            const res = await fetch('/api/trades?status=OPEN');
            if (res.ok) {
                const data = await res.json();
                setActiveTrades(data);
            }
        } catch (e) {
            console.error("Failed to fetch active trades", e);
        }
    };

    useEffect(() => {
        fetchActiveTrades();
        const interval = setInterval(fetchActiveTrades, 5000); // Poll every 5s for sync
        return () => clearInterval(interval);
    }, []);

    const mermaidGraph = `
graph TD
  A[Input Precios] --> B{Filtro EMA 9/21}
  B -- Cruce Alcista --> C{Filtro RSI > 50}
  B -- Cruce Bajista --> D[Espera]
  C -- SI --> E[Decisión: COMPRA]
  C -- NO --> D
  E --> F[Ejecución]
  style A fill:#222,stroke:#fff,color:#fff
  style B fill:#333,stroke:#F59E0B,color:#fff
  style C fill:#333,stroke:#10B981,color:#fff
  style E fill:#10B981,stroke:#fff,color:#000
  style F fill:#3B82F6,stroke:#fff,color:#fff
`;

    // Simple btoa wrapper for browser environment
    const getMermaidUrl = (code: string) => {
        try {
            return `https://mermaid.ink/img/${btoa(code)}`;
        } catch (e) {
            return '';
        }
    };

    const handleAddAsset = (e: React.FormEvent) => {
        e.preventDefault();
        if (newAsset && !selectedAssets.includes(newAsset.toUpperCase())) {
            toggleAsset(newAsset);
            setNewAsset('');
        }
    };

    const handleTradeExecuted = () => {
        setTimeout(fetchActiveTrades, 500); // Quick refresh after action
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Strategy Control & Assets (2/3 width on desktop) */}
            <div className="lg:col-span-2 space-y-6">

                {/* Control Bar */}
                <div className="glass-panel p-4 rounded-xl border border-white/10 flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isAutoTrading ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-400'}`}>
                            <Activity size={20} className={isAutoTrading ? "animate-pulse" : ""} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">Auto-Trader Engine</h3>
                            <p className="text-xs text-gray-500">{strategy} Strategy</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* View Toggler */}
                        <div className="flex bg-black/40 rounded-lg p-1 border border-white/5 mr-2">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}
                            >
                                Monitor
                            </button>
                            <button
                                onClick={() => setViewMode('map')}
                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${viewMode === 'map' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}
                            >
                                Mapa Visual
                            </button>
                        </div>

                        <form onSubmit={handleAddAsset} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newAsset}
                                onChange={(e) => setNewAsset(e.target.value.toUpperCase())}
                                placeholder="BTC..."
                                className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent w-20"
                            />
                            <button type="submit" className="bg-white/5 hover:bg-white/10 p-1.5 rounded-lg text-gray-300 transition-colors">
                                <Plus size={16} />
                            </button>
                        </form>

                        <div className="h-6 w-px bg-white/10"></div>

                        <button
                            onClick={() => setIsAutoTrading(!isAutoTrading)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-bold ${isAutoTrading
                                ? 'bg-green-500 text-black hover:bg-green-400 shadow-[0_0_15px_rgba(74,222,128,0.3)]'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
                                }`}
                        >
                            <Power size={18} />
                            {isAutoTrading ? 'RUNNING' : 'STOPPED'}
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedAssets.map(ticker => {
                            // Find active trade for this ticker
                            // Normalize ticker matching
                            const activeTrade = activeTrades.find(t =>
                                t.ticker.replace(/[^A-Z0-9]/gi, '').toUpperCase() === ticker.toUpperCase()
                            );

                            return (
                                <StrategyUnit
                                    key={ticker}
                                    ticker={ticker}
                                    currentPrice={livePrices[ticker] || livePrices[`${ticker}USDT`]}
                                    activeTrade={activeTrade}
                                    onExecuteTrade={async (side, price, reason, t, amount) => {
                                        if (onExecuteTrade) {
                                            await onExecuteTrade(side, price, reason, t, amount);
                                            handleTradeExecuted();
                                        }
                                    }}
                                    onRefresh={fetchActiveTrades}
                                />
                            );
                        })}
                        {selectedAssets.length === 0 && (
                            <div className="col-span-full py-12 text-center text-gray-500 border border-dashed border-white/10 rounded-xl">
                                No assets selected. Add a ticker to start monitoring.
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="glass-panel p-8 rounded-xl border border-white/10 flex flex-col items-center justify-center min-h-[400px] animate-fade-in relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50"></div>
                        <h3 className="text-xl font-bold text-white mb-6">Lógica de Decisión: {strategy}</h3>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5 w-full flex justify-center">
                            <img
                                src={getMermaidUrl(mermaidGraph)}
                                alt="Strategy Logic Flow"
                                className="max-w-full opacity-90 hover:opacity-100 transition-opacity filter hue-rotate-180 invert"
                            />
                        </div>
                        <p className="mt-6 text-sm text-gray-400 max-w-lg text-center">
                            El bot analiza precios en tiempo real buscando cruces de medias móviles (EMA 9/21). Si el RSI valida la tendencia ({'>'}50 para compra), ejecuta la orden instantáneamente.
                        </p>
                    </div>
                )}
            </div>

            {/* Right Column: Live Logs */}
            <div className="lg:col-span-1">
                <BotActivityPanel />

                <div className="mt-4 flex justify-end">
                    <button
                        onClick={clearLogs}
                        className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition-colors"
                    >
                        <Trash2 size={12} /> Clear Logs
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StrategyMonitor;
