
import React from 'react';
import MarketStatusHeader from './MarketStatusHeader';
import MarketOverview from './MarketOverview';
import GlobalMarketRadar from './GlobalMarketRadar';
import LiveTerminal from './LiveTerminal';

interface ExecutiveDashboardProps {
    cashBalance: number;
    investedCapital: number;
    totalEquity: number;
    dailyPnL: number;
    dailyPnLPercent: number;
    dailyNetPnL: number;
    loading?: boolean;
    onViewAllNews?: () => void;
}

const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
    cashBalance,
    investedCapital,
    totalEquity,
    dailyPnL,
    dailyPnLPercent,
    dailyNetPnL,
    loading = false
}) => {
    return (
        <div className="space-y-6 animate-fade-in">
            {/* 1. KEY METRICS HEADER */}
            <MarketStatusHeader
                cashBalance={cashBalance}
                investedCapital={investedCapital}
                totalEquity={totalEquity}
                dailyPnL={dailyPnL}
                dailyPnLPercent={dailyPnLPercent}
                dailyNetPnL={dailyNetPnL}
                loading={loading}
            />

            {/* 2. BENTO GRID - Mobile: Column, Desktop: Grid */}
            <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 lg:gap-6">

                {/* MARKET OVERVIEW - Mobile: Order 1, Desktop: Left (1 Col) */}
                <div className="w-full lg:col-span-1 h-[400px] lg:h-[600px]">
                    <MarketOverview />
                </div>

                {/* GLOBAL MARKET RADAR - Mobile: Order 2, Desktop: Center (2 Cols) */}
                <div className="w-full lg:col-span-2 h-[500px] lg:h-[600px] overflow-hidden">
                    <GlobalMarketRadar />
                </div>

                {/* LIVE TERMINAL - Mobile: Order 3, Desktop: Right (1 Col) */}
                <div className="w-full lg:col-span-1 h-[300px] lg:h-[600px]">
                    <LiveTerminal />
                </div>
            </div>
        </div>
    );
};

export default ExecutiveDashboard;
