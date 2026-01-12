import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';

interface PortfolioStatsProps {
    investedCapital: number;
    currentValue: number;
}

const PortfolioStats: React.FC<PortfolioStatsProps> = ({ investedCapital, currentValue }) => {
    const totalPnL = currentValue - investedCapital;
    const totalPnLPercent = investedCapital > 0 ? (totalPnL / investedCapital) * 100 : 0;
    const isProfitable = totalPnL >= 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="glass-card p-6 rounded-xl border border-white/10 relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-gray-400 text-sm font-medium">Capital Invertido</p>
                        <h3 className="text-3xl font-bold text-white mt-1 font-mono">
                            ${investedCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                    </div>
                    <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                        <DollarSign className="text-blue-500" size={24} />
                    </div>
                </div>
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
            </div>

            <div className="glass-card p-6 rounded-xl border border-white/10 relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-gray-400 text-sm font-medium">Valor Actual</p>
                        <h3 className="text-3xl font-bold text-white mt-1 font-mono">
                            ${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                    </div>
                    <div className="bg-purple-500/10 p-3 rounded-lg border border-purple-500/20">
                        <Activity className="text-purple-500" size={24} />
                    </div>
                </div>
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all duration-500"></div>
            </div>

            <div className={`glass-card p-6 rounded-xl border ${isProfitable ? 'border-accent/30' : 'border-red-500/30'} relative overflow-hidden group`}>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-gray-400 text-sm font-medium">P&L Total</p>
                        <div className="flex items-end gap-3 mt-1">
                            <h3 className={`text-3xl font-bold font-mono ${isProfitable ? 'text-accent' : 'text-red-500'}`}>
                                {isProfitable ? '+' : ''}{totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h3>
                            <span className={`text-sm font-bold mb-1 px-2 py-0.5 rounded ${isProfitable ? 'bg-accent/10 text-accent' : 'bg-red-500/10 text-red-500'}`}>
                                {isProfitable ? '+' : ''}{totalPnLPercent.toFixed(2)}%
                            </span>
                        </div>
                    </div>
                    <div className={`${isProfitable ? 'bg-accent/10 border-accent/20' : 'bg-red-500/10 border-red-500/20'} p-3 rounded-lg border`}>
                        {isProfitable ? <TrendingUp className="text-accent" size={24} /> : <TrendingDown className="text-red-500" size={24} />}
                    </div>
                </div>
                <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full blur-2xl transition-all duration-500 ${isProfitable ? 'bg-accent/10 group-hover:bg-accent/20' : 'bg-red-500/10 group-hover:bg-red-500/20'}`}></div>
            </div>
        </div>
    );
};

export default PortfolioStats;
