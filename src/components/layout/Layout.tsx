import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

interface LayoutProps {
    children: React.ReactNode;
    activeView: 'news' | 'portfolio' | 'journal';
    onViewChange: (view: 'news' | 'portfolio' | 'journal') => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, onViewChange }) => {
    return (
        <div className="min-h-screen bg-background text-white font-sans antialiased selection:bg-accent/30 selection:text-white">
            <Sidebar activeView={activeView} onViewChange={onViewChange} />
            <Topbar />
            <main className="pl-20 pt-16 min-h-screen">
                <div className="p-8 max-w-7xl mx-auto animate-fade-in">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
