import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const Topbar: React.FC = () => {
    return (
        <header className="fixed top-0 left-20 right-0 h-16 bg-[#0b1d16]/80 backdrop-blur-md border-b border-white/10 flex items-center px-8 z-40 justify-between">
            <div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                    InvIntel<span className="text-accent">Hub</span>
                </h1>
            </div>

            {/* Simulated Market Ticker */}
            <div className="flex items-center gap-6 overflow-hidden">
                <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-400">BTC</span>
                    <span className="text-white font-mono">$42,394.20</span>
                    <span className="flex items-center text-accent text-xs">
                        <TrendingUp size={14} className="mr-1" /> +2.4%
                    </span>
                </div>
                <div className="h-4 w-px bg-white/10"></div>
                <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-400">S&P 500</span>
                    <span className="text-white font-mono">4,783.50</span>
                    <span className="flex items-center text-red-400 text-xs">
                        <TrendingDown size={14} className="mr-1" /> -0.4%
                    </span>
                </div>
            </div>
        </header>
    );
};

export default Topbar;
