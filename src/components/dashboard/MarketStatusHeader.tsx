
import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Activity, Wallet, Cpu } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const MarketStatusHeader: React.FC = () => {
    const [stats, setStats] = useState({
        totalEquity: 10000,
        dailyPnL: 0,
        dailyPnLPercent: 0,
        invested: 0,
        available: 10000
    });

    useEffect(() => {
        const fetchStats = async () => {
            // 1. Get Daily Snapshot
            const todayStr = new Date().toISOString().split('T')[0];
            const { data: dailyData } = await supabase
                .from('daily_balances')
                .select('*')
                .eq('date', todayStr)
                .single();

            // 2. Get Open Positions for Invested
            const { data: openTrades } = await supabase
                .from('paper_trades')
                .select('invested_amount, entry_price')
                .eq('status', 'OPEN');

            let invested = 0;
            if (openTrades) {
                invested = openTrades.reduce((sum, t) => sum + (t.invested_amount || t.entry_price || 0), 0);
            }

            if (dailyData) {
                const currentBalance = dailyData.current_balance || 10000;
                setStats({
                    totalEquity: currentBalance,
                    dailyPnL: dailyData.pnl_daily || 0,
                    dailyPnLPercent: dailyData.percent_daily || 0,
                    invested,
                    available: Math.max(0, currentBalance - invested)
                });
            } else {
                setStats(prev => ({ ...prev, invested, available: Math.max(0, 10000 - invested) }));
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    const isPositive = stats.dailyPnL >= 0;

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
                        ${stats.totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                            {isPositive ? '+' : ''}${stats.dailyPnL.toLocaleString()}
                        </h3>
                        <span className={`text-xs mb-1 font-bold ${isPositive ? 'text-green-500/80' : 'text-red-500/80'}`}>
                            ({isPositive ? '+' : ''}{stats.dailyPnLPercent.toFixed(2)}%)
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
                        <span className="text-white font-bold">${stats.available.toLocaleString()} <span className="text-gray-500 text-xs font-normal">Disp.</span></span>
                        <span className="text-gray-400 text-xs">${stats.invested.toLocaleString()} <span className="text-gray-600">Inv.</span></span>
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
