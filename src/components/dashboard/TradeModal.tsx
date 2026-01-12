import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getCoingeckoId } from '../../utils/crypto';

interface TradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (ticker: string, price: string, amount: string) => void;
    initialTicker: string;
}

const TradeModal: React.FC<TradeModalProps> = ({ isOpen, onClose, onConfirm, initialTicker }) => {
    const [ticker, setTicker] = useState(initialTicker);
    const [price, setPrice] = useState('');
    const [amount, setAmount] = useState('');
    const [isLoadingPrice, setIsLoadingPrice] = useState(false);

    const fetchPrice = async (tickerSymbol: string) => {
        if (!tickerSymbol) return;
        setIsLoadingPrice(true);
        const id = getCoingeckoId(tickerSymbol);
        try {
            const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
            const data = await res.json();
            if (data[id]?.usd) {
                setPrice(data[id].usd.toString());
            }
        } catch (e) {
            console.error("Error fetching price", e);
        } finally {
            setIsLoadingPrice(false);
        }
    };

    useEffect(() => {
        setTicker(initialTicker);
        setPrice('');
        setAmount('');
        if (initialTicker) {
            fetchPrice(initialTicker);
        }
    }, [initialTicker, isOpen]);

    if (!isOpen) return null;

    const handleTickerBlur = () => {
        if (ticker) {
            fetchPrice(ticker);
        }
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
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Precio de Entrada ($) {isLoadingPrice && <span className="text-xs text-accent animate-pulse ml-2">Buscando precio...</span>}
                        </label>
                        <input
                            type="number"
                            step="any"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                            placeholder="0.00"
                            required
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
