import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, Activity, Wallet, Cpu } from 'lucide-react';


interface MarketStatusHeaderProps {
    cashBalance: number;
    investedCapital: number;
    totalEquity: number;
    dailyPnL: number;
    dailyPnLPercent: number;
    loading?: boolean;
}

const MarketStatusHeader: React.FC<MarketStatusHeaderProps> = ({
    cashBalance,
    investedCapital,
    totalEquity,
    dailyPnL,
    dailyPnLPercent,
    loading = false
}) => {
    const isPositive = dailyPnL >= 0;
    const exposurePercent = totalEquity > 0 ? (investedCapital / totalEquity) * 100 : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {/* 1. Total Equity */}
            <div className="glass-panel p-4 rounded-xl border border-white/10 flex items-center gap-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <DollarSign size={80} />
                </div>
                <div className="p-3 bg-accent/10 rounded-lg text-accent">
                    <Wallet size={24} />
                </div>
                <div>
                    <p className="text-gray-400 text-xs font-bold uppercase">Capital Total</p>
                    <h3 className="text-2xl font-bold text-white tracking-tight">
                        {loading ? '...' : `$${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    </h3>
                </div>
            </div>

            {/* 2. Daily PnL */}
            <div className="glass-panel p-4 rounded-xl border border-white/10 flex items-center gap-4 relative overflow-hidden">
                <div className="p-3 rounded-lg bg-white/5">
                    {isPositive ? <TrendingUp size={24} className="text-green-500" /> : <TrendingDown size={24} className="text-red-500" />}
                </div>
                <div>
                    <p className="text-gray-400 text-xs font-bold uppercase">PnL Hoy</p>
                    <div className="flex items-end gap-2">
                        <h3 className={`text-2xl font-bold tracking-tight ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                            {loading ? '...' : `${isPositive ? '+' : ''}$${dailyPnL.toLocaleString()}`}
                        </h3>
                        {!loading && (
                            <span className={`text-xs mb-1 font-bold ${isPositive ? 'text-green-500/80' : 'text-red-500/80'}`}>
                                ({isPositive ? '+' : ''}{dailyPnLPercent.toFixed(2)}%)
                            </span>
                        )}
                    </div>
                </div>
            </div>


            {/* 3. Exposure / Allocation */}
            <div className="glass-panel p-4 rounded-xl border border-white/10 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                        <Activity size={20} />
                    </div>
                    <p className="text-gray-400 text-xs font-bold uppercase">Exposición</p>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Liquidez: <span className="text-white font-bold">${loading ? '...' : cashBalance.toLocaleString()}</span></span>
                        <span className="text-gray-400">Invertido: <span className="text-accent font-bold">${loading ? '...' : investedCapital.toLocaleString()}</span></span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-800/50 rounded-full h-2 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-accent to-blue-500 transition-all duration-500"
                            style={{ width: `${Math.min(exposurePercent, 100)}%` }}
                        />
                    </div>

                    <div className="text-center">
                        <span className="text-[10px] text-gray-500">
                            {loading ? '...' : `${exposurePercent.toFixed(1)}% en mercado`}
                        </span>
                    </div>
                </div>
            </div>

            {/* 4. AI Status */}
            <div className="glass-panel p-4 rounded-xl border border-white/10 flex items-center gap-4">
                <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400 animate-pulse">
                    <Cpu size={24} />
                </div>
                <div>
                    <p className="text-gray-400 text-xs font-bold uppercase">IA Neural Core</p>
                    <div className="flex items-center gap-2">
                        <span className="text-white font-bold">NewsAuditor</span>
                        <span className="flex h-2 w-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]"></span>
                    </div>
                    <p className="text-[10px] text-gray-500">Gemini 1.5 Flash Online</p>
                </div>
            </div>
        </div>
    );
};

export default MarketStatusHeader;
