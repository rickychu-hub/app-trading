import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface AssetDetailModalProps {
    ticker: string;
    isOpen: boolean;
    onClose: () => void;
}

declare global {
    interface Window {
        TradingView: any;
    }
}

const AssetDetailModal: React.FC<AssetDetailModalProps> = ({ ticker, isOpen, onClose }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen || !ticker || !containerRef.current) return;

        // Clean previous widget if necessary (though React key usually handles this, specific cleanup might be needed)
        containerRef.current.innerHTML = "";

        const script = document.createElement('script');
        script.src = "https://s3.tradingview.com/tv.js";
        script.async = true;
        script.onload = () => {
            if (window.TradingView) {
                // Determine symbol format
                // Simple heuristic: If it's a known stock (mostly letters, no numbers usually), use as is or NASDAQ/NYSE.
                // For crypto, usually append USDT or USD. 
                // We'll try a safe default for now: BINANCE:{ticker}USDT for crypto-like, or NASDAQ:{ticker} for others?
                // Actually simplified: Just {ticker}USD for crypto usually works on TV smart search, 
                // or we can pass just the ticker and TV tries to find it.
                // Let's try to detect if it's likely crypto (from our known list) or assume based on user input.

                const cleanTicker = ticker.replace('$', '').toUpperCase();
                const isCrypto = ['BTC', 'ETH', 'SOL', 'AVAX', 'DOT', 'DOGE', 'SHIB', 'MATIC', 'LINK', 'UNI'].includes(cleanTicker);
                const symbol = isCrypto ? `BINANCE:${cleanTicker}USDT` : cleanTicker;

                new window.TradingView.widget({
                    "width": "100%",
                    "height": "100%",
                    "symbol": symbol,
                    "interval": "D",
                    "timezone": "Etc/UTC",
                    "theme": "dark",
                    "style": "1",
                    "locale": "en",
                    "enable_publishing": false,
                    "allow_symbol_change": true,
                    "container_id": "tradingview_widget",
                    "hide_side_toolbar": false,
                    "toolbar_bg": "#0b1d16"
                });
            }
        };
        containerRef.current.appendChild(script);

    }, [isOpen, ticker]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-[#0b1d16] border border-white/10 rounded-2xl w-full max-w-6xl h-[80vh] shadow-2xl relative flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        Análisis Técnico <span className="text-accent">{ticker}</span>
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors bg-white/5 p-2 rounded-lg"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-grow relative bg-[#131722]" id="tradingview_widget" ref={containerRef}>
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                        Cargando gráfico...
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssetDetailModal;
