import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

import MobileHeader from './MobileHeader';

interface LayoutProps {
    children: React.ReactNode;
    activeView: 'news' | 'market' | 'portfolio' | 'journal' | 'settings' | 'analytics';
    onViewChange: (view: 'news' | 'market' | 'portfolio' | 'journal' | 'settings' | 'analytics') => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, onViewChange }) => {
    return (
        <div className="min-h-screen bg-background text-white font-sans antialiased selection:bg-accent/30 selection:text-white">
            {/* Desktop Navigation */}
            <div className="hidden md:block">
                <Sidebar activeView={activeView} onViewChange={onViewChange} />
                <Topbar />
            </div>

            {/* Mobile Navigation */}
            <MobileHeader activeView={activeView} onViewChange={onViewChange} />

            <main className="md:pl-20 md:pt-16 min-h-screen">
                <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in space-y-4 md:space-y-0">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
