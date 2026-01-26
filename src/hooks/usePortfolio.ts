
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
            const todayStr = new Date().toISOString().split('T')[0];
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            // 1. Get Daily Snapshot to find Start Balance
            // If no entry for today, we assume 10000 or fetch from previous day?
            // For simplicity, let's assume 10000 if not found, or try to get the latest balance entry
            let startBalance = 10000;

            const { data: dailyData } = await supabase
                .from('daily_balances')
                .select('*')
                .eq('date', todayStr)
                .single();

            if (dailyData && dailyData.start_balance) {
                startBalance = dailyData.start_balance;
            }

            // 2. Calculate Daily Realized PnL (Closed Trades Today)
            const { data: closedTrades } = await supabase
                .from('paper_trades')
                .select('final_pnl, exit_time')
                .eq('status', 'CLOSED')
                .gte('exit_time', startOfDay.toISOString());

            const realizedPnL = closedTrades
                ? closedTrades.reduce((sum, t) => sum + (t.final_pnl || 0), 0)
                : 0;

            // 3. Get Invested Amount (Open Positions)
            const { data: openTrades } = await supabase
                .from('paper_trades')
                .select('invested_amount')
                .eq('status', 'OPEN');

            const invested = openTrades
                ? openTrades.reduce((sum, t) => sum + (t.invested_amount || 0), 0)
                : 0;

            // 4. Calculate Final Metrics
            // Total Equity = Start Balance + Realized PnL + (Unrealized PnL - NOT calculated here to match user request "suma operaciones cerradas")
            // If we want accurate Total Equity we need Unrealized too, but without live prices for all assets, we stick to Realized for the "Balance" view + Invested cost.
            const currentEquity = startBalance + realizedPnL;
            const available = Math.max(0, currentEquity - invested);
            const pnlPercent = startBalance > 0 ? (realizedPnL / startBalance) * 100 : 0;

            setStats({
                totalEquity: currentEquity,
                dailyPnL: realizedPnL,
                dailyPnLPercent: pnlPercent,
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
        const interval = setInterval(fetchStats, 5000); // Poll every 5s for faster updates
        return () => clearInterval(interval);
    }, []);

    return { stats, loading, refetch: fetchStats };
};
