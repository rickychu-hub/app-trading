import React from 'react';
import { LayoutDashboard, Briefcase, Settings, FileText, FlaskConical, TrendingUp, Power } from 'lucide-react';
import { useStrategyStore } from '../../store/strategyStore';

interface MobileHeaderProps {
    activeView: 'news' | 'portfolio' | 'journal' | 'settings' | 'analytics';
    onViewChange: (view: 'news' | 'portfolio' | 'journal' | 'settings' | 'analytics') => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ activeView, onViewChange }) => {
    const { isAutoTrading, setIsAutoTrading } = useStrategyStore();

    const navItems = [
        { icon: LayoutDashboard, label: "Dash", id: 'news', active: activeView === 'news' },
        { icon: Briefcase, label: "Portf", id: 'portfolio', active: activeView === 'portfolio' },
        { icon: FlaskConical, label: "Lab", id: 'analytics', active: activeView === 'analytics' },
        { icon: FileText, label: "Diario", id: 'journal', active: activeView === 'journal' },
        { icon: Settings, label: "Conf", id: 'settings', active: activeView === 'settings' },
    ];

    return (
        <header className="bg-[#0b1d16] border-b border-white/10 flex flex-col p-4 gap-4 sticky top-0 z-50 md:hidden">
            {/* Row 1: Title */}
            <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold tracking-tight text-white">
                    InvIntel<span className="text-accent">Hub</span>
                </h1>
                <div className="w-8 h-8 bg-accent rounded shadow-[0_0_10px_rgba(132,204,22,0.3)] flex items-center justify-center">
                    <span className="font-bold text-black text-sm">I</span>
                </div>
            </div>

            {/* Row 2: Navigation (Scrollja) */}
            <nav className="flex gap-2 w-full overflow-x-auto pb-1 scrollbar-hide">
                {navItems.map((item, index) => (
                    <button
                        key={index}
                        onClick={() => item.id ? onViewChange(item.id as any) : null}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-all border ${item.active
                            ? 'bg-accent/10 border-accent/30 text-accent'
                            : 'bg-white/5 border-white/5 text-gray-400'
                            }`}
                    >
                        <item.icon size={16} />
                        <span className="text-sm font-medium">{item.label}</span>
                    </button>
                ))}
            </nav>

            {/* Row 3: Status & Switch */}
            <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg border border-white/5">
                {/* Ticker Sim */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400 font-bold">BTC</span>
                        <span className="text-xs text-white font-mono">$42k</span>
                        <TrendingUp size={12} className="text-accent" />
                    </div>
                    <div className="h-3 w-px bg-white/10"></div>
                </div>

                {/* Auto-Trading Switch */}
                <button
                    onClick={() => setIsAutoTrading(!isAutoTrading)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${isAutoTrading
                        ? 'bg-green-500/20 border-green-500/50 text-green-400'
                        : 'bg-gray-800/50 border-gray-700 text-gray-400'
                        }`}
                >
                    <Power size={12} />
                    <span className="text-[10px] font-bold uppercase">{isAutoTrading ? 'ON' : 'OFF'}</span>
                    {isAutoTrading && <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                    </span>}
                </button>
            </div>
        </header>
    );
};

export default MobileHeader;
