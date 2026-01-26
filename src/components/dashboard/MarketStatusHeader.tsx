import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, Activity, Wallet, Cpu } from 'lucide-react';


interface MarketStatusHeaderProps {
    totalEquity: number;
    dailyPnL: number;
    dailyPnLPercent: number;
    invested: number;
    available: number;
}

const MarketStatusHeader: React.FC<MarketStatusHeaderProps> = ({
    totalEquity,
    dailyPnL,
    dailyPnLPercent,
    invested,
    available
}) => {
    // Internal state removed, using props


    const isPositive = dailyPnL >= 0;

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
                        ${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </h3>
                </div>
            </div>

            {/* 2. Daily PnL */}
            <div className="glass-panel p-4 rounded-xl border border-white/10 flex items-center gap-4 relative overflow-hidden">
                <div className="p-3 rounded-lg bg-white/5">
                    {isPositive ? <TrendingUp size={24} className="text-green-500" /> : <TrendingDown size={24} className="text-red-500" />}
                </div>
                <div>
                    <p className="text-gray-400 text-xs font-bold uppercase">PnL Diario</p>
                    <div className="flex items-end gap-2">
                        <h3 className={`text-2xl font-bold tracking-tight ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                            {isPositive ? '+' : ''}${dailyPnL.toLocaleString()}
                        </h3>
                        <span className={`text-xs mb-1 font-bold ${isPositive ? 'text-green-500/80' : 'text-red-500/80'}`}>
                            ({isPositive ? '+' : ''}{dailyPnLPercent.toFixed(2)}%)
                        </span>
                    </div>
                </div>
            </div>

            {/* 3. Availability */}
            <div className="glass-panel p-4 rounded-xl border border-white/10 flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                    <Activity size={24} />
                </div>
                <div>
                    <p className="text-gray-400 text-xs font-bold uppercase">Liquidez</p>
                    <div className="flex flex-col">
                        <span className="text-white font-bold">${available.toLocaleString()} <span className="text-gray-500 text-xs font-normal">Disp.</span></span>
                        <span className="text-gray-400 text-xs">${invested.toLocaleString()} <span className="text-gray-600">Inv.</span></span>
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
