
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface PortfolioStats {
    totalEquity: number;
    dailyPnL: number;
    dailyPnLPercent: number;
    invested: number;
    available: number;
    cashBalance?: number;
}

export const usePortfolio = () => {
    const [stats, setStats] = useState<PortfolioStats>({
        totalEquity: 0,
        dailyPnL: 0,
        dailyPnLPercent: 0,
        invested: 0,
        available: 0,
        cashBalance: 0
    });
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
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

            let currentBalance = 10000; // Default fallback
            let pnlDaily = 0;
            let percentDaily = 0;

            if (dailyData) {
                currentBalance = dailyData.current_balance || 10000;
                pnlDaily = dailyData.pnl_daily || 0;
                percentDaily = dailyData.percent_daily || 0;
            }

            // Estimate available cash (This logic might vary depending on how backend handles cash)
            // Assuming Total Equity = Cash + Invested
            // So Cash = Total Equity - Invested
            const available = Math.max(0, currentBalance - invested);

            setStats({
                totalEquity: currentBalance,
                dailyPnL: pnlDaily,
                dailyPnLPercent: percentDaily,
                invested,
                available,
                cashBalance: available
            });
        } catch (error) {
            console.error("Error fetching portfolio stats:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    return { stats, loading, refetch: fetchStats };
};
