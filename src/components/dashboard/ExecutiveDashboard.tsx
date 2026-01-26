
import React from 'react';
import MarketStatusHeader from './MarketStatusHeader';
import ScannerWidget from './ScannerWidget';
import IntelligenceHub from './IntelligenceHub';
import LiveTerminal from './LiveTerminal';

interface ExecutiveDashboardProps {
    cashBalance: number;
    investedCapital: number;
    totalEquity: number;
    dailyPnL: number;
    dailyPnLPercent: number;
    loading?: boolean;
}

const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
    cashBalance,
    investedCapital,
    totalEquity,
    dailyPnL,
    dailyPnLPercent,
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
                loading={loading}
            />

            {/* 2. BENTO GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">

                {/* LEFT: SCANNER (1 Col) */}
                <div className="lg:col-span-1 h-full">
                    <ScannerWidget />
                </div>

                {/* CENTER: INTELLIGENCE (2 Cols) */}
                <div className="lg:col-span-2 h-full">
                    <IntelligenceHub />
                </div>

                {/* RIGHT: TERMINAL (1 Col) */}
                <div className="lg:col-span-1 h-full">
                    <LiveTerminal />
                </div>
            </div>
        </div>
    );
};

export default ExecutiveDashboard;
