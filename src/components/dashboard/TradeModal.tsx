import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface TradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (ticker: string, price: string) => void;
    initialTicker: string;
}

const TradeModal: React.FC<TradeModalProps> = ({ isOpen, onClose, onConfirm, initialTicker }) => {
    const [ticker, setTicker] = useState(initialTicker);
    const [price, setPrice] = useState('');

    useEffect(() => {
        setTicker(initialTicker);
        setPrice('');
    }, [initialTicker, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(ticker, price);
    };

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
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                            placeholder="Ej: AAPL, BTC"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Precio de Entrada (Opcional)
                        </label>
                        <input
                            type="number"
                            step="any"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                            placeholder="Precio actual de mercado"
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
                            className="flex-1 px-4 py-3 rounded-lg bg-accent text-black hover:bg-accent/90 transition-colors font-bold"
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
