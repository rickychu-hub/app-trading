
import React from 'react';
import MarketStatusHeader from './MarketStatusHeader';
import ScannerWidget from './ScannerWidget';
import IntelligenceHub from './IntelligenceHub';
import LiveTerminal from './LiveTerminal';

interface ExecutiveDashboardProps {
    totalEquity: number;
    dailyPnL: number;
    dailyPnLPercent: number;
    invested: number;
    available: number;
    loading?: boolean;
}

const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
    totalEquity,
    dailyPnL,
    dailyPnLPercent,
    invested,
    available,
    loading = false
}) => {
    return (
        <div className="space-y-6 animate-fade-in">
            {/* 1. KEY METRICS HEADER */}
            <MarketStatusHeader
                totalEquity={totalEquity}
                dailyPnL={dailyPnL}
                dailyPnLPercent={dailyPnLPercent}
                invested={invested}
                available={available}
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
