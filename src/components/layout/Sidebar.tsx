import React from 'react';
import { LayoutDashboard, Briefcase, Settings, FileText } from 'lucide-react';

interface SidebarProps {
    activeView: 'news' | 'portfolio' | 'journal' | 'settings';
    onViewChange: (view: 'news' | 'portfolio' | 'journal' | 'settings') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
    const navItems = [
        { icon: LayoutDashboard, label: "Dashboard", id: 'news', active: activeView === 'news' },
        { icon: Briefcase, label: "Portfolio", id: 'portfolio', active: activeView === 'portfolio' },
        { icon: FileText, label: "Diario", id: 'journal', active: activeView === 'journal' },
        { icon: Settings, label: "Config", id: 'settings', active: activeView === 'settings' },
    ];

    return (
        <aside className="fixed left-0 top-0 h-screen w-20 bg-[#0b1d16]/95 backdrop-blur-xl border-r border-white/10 flex flex-col items-center py-8 z-50">
            <div className="mb-12">
                <div className="w-10 h-10 bg-accent rounded-lg shadow-[0_0_15px_rgba(132,204,22,0.5)] flex items-center justify-center">
                    <span className="font-bold text-black text-xl">I</span>
                </div>
            </div>

            <nav className="flex flex-col gap-8 w-full">
                {navItems.map((item, index) => (
                    <button
                        key={index}
                        onClick={() => item.id && (item.id === 'news' || item.id === 'portfolio' || item.id === 'journal' || item.id === 'settings') ? onViewChange(item.id as 'news' | 'portfolio' | 'journal' | 'settings') : null}
                        className={`w-full flex items-center justify-center py-3 border-l-2 transition-all duration-300 group ${item.active
                            ? 'border-accent text-accent bg-accent/10'
                            : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <item.icon size={24} className={`transition-transform duration-300 ${item.active ? 'scale-110' : 'group-hover:scale-110'}`} />
                    </button>
                ))}
            </nav>
        </aside>
    );
};

export default Sidebar;
