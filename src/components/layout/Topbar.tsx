import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { usePortfolioEquity } from '../../hooks/usePortfolioEquity';

const Topbar: React.FC = () => {
    const { totalEquity, pnl } = usePortfolioEquity();
    const pnlPercent = totalEquity > 0 ? (pnl / (totalEquity - pnl)) * 100 : 0; // approximate if invested not avail directly here, but we have pnl

    return (
        <header className="fixed top-0 left-20 right-0 h-16 bg-[#0b1d16]/80 backdrop-blur-md border-b border-white/10 flex items-center px-8 z-40 justify-between">
            <div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                    InvIntel<span className="text-accent">Hub</span>
                </h1>
            </div>

            {/* Real-time Equity Ticker */}
            <div className="flex items-center gap-6 overflow-hidden">
                <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-400">Equity Total</span>
                    <span className="text-white font-mono text-lg font-bold">
                        ${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className={`flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${pnl >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {pnl >= 0 ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                        {pnl >= 0 ? '+' : ''}{pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({pnlPercent.toFixed(2)}%)
                    </span>
                </div>
            </div>
        </header>
    );
};

export default Topbar;
