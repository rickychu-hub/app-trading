
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface PortfolioStats {
    cashBalance: number;        // Dinero USDT libre
    investedCapital: number;    // Valor actual de posiciones abiertas
    totalEquity: number;        // cashBalance + investedCapital
    dailyPnL: number;          // PnL realizado + no realizado del día
    dailyPnLPercent: number;   // Porcentaje del PnL diario
    dailyNetPnL: number;       // PnL después de impuestos/comisiones
}

export const usePortfolio = () => {
    const [stats, setStats] = useState<PortfolioStats>({
        cashBalance: 0,
        investedCapital: 0,
        totalEquity: 0,
        dailyPnL: 0,
        dailyPnLPercent: 0,
        dailyNetPnL: 0
    });
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            // 1. Get Cash Balance from daily_balances (current_balance)
            const { data: dailyData } = await supabase
                .from('daily_balances')
                .select('*')
                .eq('date', todayStr)
                .single();

            let cashBalance = 10000; // Default fallback
            let startBalance = 10000;

            if (dailyData) {
                // current_balance represents the total equity at this moment
                // We'll use it as our baseline
                cashBalance = dailyData.current_balance || 10000;
                startBalance = dailyData.start_balance || 10000;
            }

            // 2. Get Open Positions (to calculate invested capital)
            const { data: openTrades } = await supabase
                .from('paper_trades')
                .select('ticker, invested_amount, quantity, entry_price')
                .eq('status', 'OPEN');

            // For now, we'll use invested_amount as the "cost basis"
            // In a real scenario, we'd fetch current prices and multiply by quantity
            // But without live price feeds, we use the cost
            const investedCapital = openTrades
                ? openTrades.reduce((sum, t) => sum + (t.invested_amount || 0), 0)
                : 0;

            // 3. Calculate Realized PnL (Closed Trades Today)
            const { data: closedTrades } = await supabase
                .from('paper_trades')
                .select('final_pnl, net_profit')
                .eq('status', 'CLOSED')
                .gte('exit_time', startOfDay.toISOString());

            const realizedPnL = closedTrades
                ? closedTrades.reduce((sum, t) => sum + (t.final_pnl || 0), 0)
                : 0;

            const realizedNetPnL = closedTrades
                ? closedTrades.reduce((sum, t) => sum + (t.net_profit || (t.final_pnl || 0)), 0)
                : 0;

            // 4. Calculate Total Equity
            // CRITICAL FIX: The issue is that cashBalance from daily_balances already includes everything
            // So we should NOT add investedCapital on top of it
            // Instead: totalEquity = current_balance (which is the true total)
            // And: cashBalance (free cash) = totalEquity - investedCapital

            const totalEquity = cashBalance; // This is already the total from daily_balances
            const freeCash = Math.max(0, totalEquity - investedCapital);

            // 5. Daily PnL = Realized PnL from closed trades
            // (Unrealized would require live prices which we don't have in this simple version)
            const dailyPnL = realizedPnL;
            const dailyNetPnL = realizedNetPnL;
            const dailyPnLPercent = startBalance > 0 ? (dailyPnL / startBalance) * 100 : 0;

            setStats({
                cashBalance: freeCash,
                investedCapital: investedCapital,
                totalEquity: totalEquity,
                dailyPnL: dailyPnL,
                dailyPnLPercent: dailyPnLPercent,
                dailyNetPnL: dailyNetPnL
            });
        } catch (error) {
            console.error("Error fetching portfolio stats:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    return { stats, loading, refetch: fetchStats };
};
