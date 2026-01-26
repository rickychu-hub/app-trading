import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileHeader from './MobileHeader';
import { Menu, X } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
    activeView: 'news' | 'market' | 'portfolio' | 'journal' | 'settings' | 'analytics' | 'newspage';
    onViewChange: (view: 'news' | 'market' | 'portfolio' | 'journal' | 'settings' | 'analytics' | 'newspage') => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, onViewChange }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleViewChange = (view: typeof activeView) => {
        onViewChange(view);
        setIsMobileMenuOpen(false); // Close menu after selection
    };

    return (
        <div className="min-h-screen bg-background text-white font-sans antialiased selection:bg-accent/30 selection:text-white">
            {/* Desktop Sidebar - Always visible on md+ */}
            <div className="hidden md:block">
                <Sidebar activeView={activeView} onViewChange={onViewChange} />
                <Topbar />
            </div>

            {/* Mobile Hamburger Button */}
            <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden fixed top-4 left-4 z-50 p-3 bg-accent rounded-lg shadow-lg hover:bg-accent/90 transition-colors"
            >
                <Menu size={24} className="text-black" />
            </button>

            {/* Mobile Drawer Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-fade-in"
                    onClick={() => setIsMobileMenuOpen(false)}
                >
                    {/* Mobile Sidebar Drawer */}
                    <div
                        className="fixed left-0 top-0 h-full w-64 bg-[#0b1d16] border-r border-white/10 shadow-2xl animate-slide-in-left"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X size={24} className="text-white" />
                        </button>

                        {/* Logo */}
                        <div className="p-6 border-b border-white/10">
                            <div className="w-12 h-12 bg-accent rounded-lg shadow-[0_0_15px_rgba(132,204,22,0.5)] flex items-center justify-center">
                                <span className="font-bold text-black text-2xl">I</span>
                            </div>
                            <h2 className="mt-3 text-lg font-bold text-white">Intelligence</h2>
                            <p className="text-xs text-gray-500">Trading Platform</p>
                        </div>

                        {/* Mobile Navigation */}
                        <Sidebar activeView={activeView} onViewChange={handleViewChange} isMobile={true} />
                    </div>
                </div>
            )}

            {/* Mobile Header */}
            <MobileHeader activeView={activeView} onViewChange={onViewChange} />

            <main className="md:pl-20 md:pt-16 pt-16 min-h-screen">
                <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in space-y-4 md:space-y-0">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
