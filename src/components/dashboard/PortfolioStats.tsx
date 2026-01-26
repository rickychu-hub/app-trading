import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';

interface PortfolioStatsProps {
    investedCapital: number;
    currentValue: number;
    dailyPnL?: number;
    botStatus?: 'ACTIVE' | 'STOPPED_RISK' | 'STOPPED_PROFIT';
}

const PortfolioStats: React.FC<PortfolioStatsProps> = ({
    investedCapital,
    currentValue,
    dailyPnL = 0,
    botStatus = 'ACTIVE'
}) => {
    const totalPnL = currentValue - investedCapital;
    const totalPnLPercent = investedCapital > 0 ? (totalPnL / investedCapital) * 100 : 0;
    const isProfitable = totalPnL >= 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* 1. Estado del Bot */}
            <div className={`glass-card p-6 rounded-xl border relative overflow-hidden group ${botStatus === 'ACTIVE' ? 'border-green-500/30' : 'border-red-500/30'}`}>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-gray-400 text-sm font-medium">Estado del Bot</p>
                        <h3 className={`text-xl font-bold mt-1 font-mono ${botStatus === 'ACTIVE' ? 'text-green-400' : 'text-red-400'}`}>
                            {botStatus === 'ACTIVE' ? 'ACTIVO' : botStatus === 'STOPPED_RISK' ? 'FRENADO (RIESGO)' : 'GRAN DÍA (PROFIT)'}
                        </h3>
                    </div>
                    <div className={`p-3 rounded-lg border ${botStatus === 'ACTIVE' ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                        <Activity className={botStatus === 'ACTIVE' ? 'text-green-500' : 'text-red-500'} size={24} />
                    </div>
                </div>
            </div>

            {/* 2. Capital Disponible */}
            <div className="glass-card p-6 rounded-xl border border-white/10 relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-gray-400 text-sm font-medium">Capital Disponible</p>
                        <h3 className="text-3xl font-bold text-white mt-1 font-mono">
                            ${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                        <span className="text-xs text-gray-500">Total Equity</span>
                    </div>
                    <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                        <DollarSign className="text-blue-500" size={24} />
                    </div>
                </div>
            </div>

            {/* 3. PnL Diario */}
            <div className={`glass-card p-6 rounded-xl border ${dailyPnL >= 0 ? 'border-accent/30' : 'border-red-500/30'} relative overflow-hidden group`}>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-gray-400 text-sm font-medium">PnL Hoy (24h)</p>
                        <div className="flex items-end gap-3 mt-1">
                            <h3 className={`text-3xl font-bold font-mono ${dailyPnL >= 0 ? 'text-accent' : 'text-red-500'}`}>
                                {dailyPnL >= 0 ? '+' : ''}{dailyPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </h3>
                        </div>
                    </div>
                    <div className={`${dailyPnL >= 0 ? 'bg-accent/10 border-accent/20' : 'bg-red-500/10 border-red-500/20'} p-3 rounded-lg border`}>
                        {dailyPnL >= 0 ? <TrendingUp className="text-accent" size={24} /> : <TrendingDown className="text-red-500" size={24} />}
                    </div>
                </div>
            </div>

            {/* 4. Total PnL (Legacy) */}
            <div className="glass-card p-6 rounded-xl border border-white/10 relative overflow-hidden group opacity-80">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-gray-400 text-sm font-medium">PnL Total Op.</p>
                        <h3 className={`text-2xl font-bold mt-1 font-mono ${totalPnL >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                            {totalPnL >= 0 ? '+' : ''}{totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </h3>
                    </div>
                </div>
            </div>
        </div>
    );

};

export default PortfolioStats;
