import React, { useState, useEffect } from 'react';
import { X, Circle } from 'lucide-react';
import { usePriceStore } from '../../store/priceStore';

interface TradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (ticker: string, price: string, amount: string) => void;
    initialTicker: string;
}

const TradeModal: React.FC<TradeModalProps> = ({ isOpen, onClose, onConfirm, initialTicker }) => {
    const [ticker, setTicker] = useState(initialTicker);
    const [amount, setAmount] = useState('');

    // Store integration
    const { getPrice, subscribeToSymbol, unsubscribeFromSymbol, connectionStatus } = usePriceStore();

    // Get real-time price (returns undefined if not yet connected/received)
    const rawPrice = getPrice(ticker);
    const price = rawPrice ? rawPrice.toString() : '';

    useEffect(() => {
        setTicker(initialTicker);
        setAmount('');

        if (initialTicker && isOpen) {
            subscribeToSymbol(initialTicker);
        }

        // Cleanup: unsubscribe when modal closes or ticker changes (optional, but good practice)
        return () => {
            if (initialTicker) {
                unsubscribeFromSymbol(initialTicker);
            }
        };
    }, [initialTicker, isOpen]);

    // Handle ticker change manually
    useEffect(() => {
        if (ticker) {
            subscribeToSymbol(ticker);
        }
    }, [ticker]);

    if (!isOpen) return null;

    if (!isOpen) return null;

    const handleTickerBlur = () => {
        // No manual fetch needed, useEffect handles subscription
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(ticker, price, amount);
    };

    const isFormValid = ticker.length > 0 && parseFloat(price) > 0 && parseFloat(amount) > 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#0b1d16] border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                <h2 className="text-2xl font-bold text-white mb-6">Simular Trade</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Ticker / Activo
                        </label>
                        <input
                            type="text"
                            value={ticker}
                            onChange={(e) => setTicker(e.target.value)}
                            onBlur={handleTickerBlur}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors uppercase"
                            placeholder="Ej: BTC, ETH"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                            Precio de Entrada ($)
                            {connectionStatus === 'connected' ? (
                                <span className="flex items-center text-xs text-green-400 gap-1 bg-green-400/10 px-2 py-0.5 rounded-full">
                                    <Circle size={8} fill="currentColor" className="animate-pulse" /> Live
                                </span>
                            ) : (
                                <span className="text-xs text-yellow-500">Conectando...</span>
                            )}
                        </label>
                        <input
                            type="number"
                            step="any"
                            value={price}
                            readOnly
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors cursor-not-allowed opacity-80"
                            placeholder="Esperando datos..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Capital a Invertir ($)
                        </label>
                        <input
                            type="number"
                            step="any"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                            placeholder="Ej: 1000"
                            required
                        />
                    </div>

                    <div className="flex gap-4 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 transition-colors font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!isFormValid}
                            className={`flex-1 px-4 py-3 rounded-lg text-black font-bold transition-all ${isFormValid
                                ? 'bg-accent hover:bg-accent/90'
                                : 'bg-gray-600 cursor-not-allowed opacity-50'
                                }`}
                        >
                            Confirmar Orden
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TradeModal;
