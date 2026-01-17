import React, { useState } from 'react';
import { Activity, Power, Plus, Trash2 } from 'lucide-react';
import { useStrategyStore } from '../../store/strategyStore';
import { useBotStore } from '../../store/botStore';
import StrategyUnit from './StrategyUnit';
import BotActivityPanel from './BotActivityPanel';

interface StrategyMonitorProps {
    onExecuteTrade?: (side: 'BUY' | 'SELL', price: number, reason: string, ticker: string) => void;
}

const StrategyMonitor: React.FC<StrategyMonitorProps> = ({ onExecuteTrade }) => {
    const { isAutoTrading, setIsAutoTrading, strategy } = useStrategyStore();
    const { selectedAssets, toggleAsset, clearLogs } = useBotStore();
    const [newAsset, setNewAsset] = useState('');

    const handleAddAsset = (e: React.FormEvent) => {
        e.preventDefault();
        if (newAsset && !selectedAssets.includes(newAsset.toUpperCase())) {
            toggleAsset(newAsset);
            setNewAsset('');
        }
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
                        <form onSubmit={handleAddAsset} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newAsset}
                                onChange={(e) => setNewAsset(e.target.value.toUpperCase())}
                                placeholder="BTC, ETH..."
                                className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent w-24"
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

                {/* Strategy Units Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedAssets.map(ticker => (
                        <StrategyUnit
                            key={ticker}
                            ticker={ticker}
                            onExecuteTrade={onExecuteTrade}
                        />
                    ))}
                    {selectedAssets.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-500 border border-dashed border-white/10 rounded-xl">
                            No assets selected. Add a ticker to start monitoring.
                        </div>
                    )}
                </div>
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
