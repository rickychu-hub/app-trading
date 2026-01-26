
import React, { useState, useEffect } from 'react';
import { Target } from 'lucide-react';
import { binanceService } from '../../services/binancePriceService';
import { analysisService } from '../../services/analysisService';

interface MiniOpp {
    ticker: string;
    price: number;
    rsi: number;
}

const TOP_ASSETS = ['BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'ADA', 'DOGE', 'AVAX'];

const ScannerWidget: React.FC = () => {
    const [opps, setOpps] = useState<MiniOpp[]>([]);
    const [scanning, setScanning] = useState(false);

    const scan = async () => {
        setScanning(true);
        const results: MiniOpp[] = [];
        for (const ticker of TOP_ASSETS) {
            try {
                const candles = await binanceService.fetchHistoricalCandles(`${ticker}USDT`, '1h', 30);
                if (candles.length > 0) {
                    const i = candles.length - 1;
                    const rsi = analysisService.generateRSISeries(candles, 14)[i] || 50;
                    results.push({ ticker, price: candles[i].close, rsi });
                }
            } catch (e) {
                // ignore
            }
        }
        setOpps(results.sort((a, b) => a.rsi - b.rsi));
        setScanning(false);
    };

    useEffect(() => {
        scan();
        const interval = setInterval(scan, 60000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="glass-panel rounded-xl border border-white/10 p-4 h-full flex flex-col">
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                <Target size={14} /> Radar (1H RSI)
            </h3>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                {scanning && opps.length === 0 ? (
                    <div className="text-center text-xs text-gray-500 py-4">Escaneando...</div>
                ) : (
                    opps.map(opp => (
                        <div key={opp.ticker} className="flex justify-between items-center p-2 rounded bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/5 transition-all">
                            <div>
                                <span className="font-bold text-sm text-white block">{opp.ticker}</span>
                                <span className="text-[10px] text-gray-500">${opp.price.toLocaleString()}</span>
                            </div>
                            <div className={`text-right font-mono font-bold ${opp.rsi < 30 ? 'text-green-400' : opp.rsi > 70 ? 'text-red-400' : 'text-gray-400'}`}>
                                {opp.rsi.toFixed(1)}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ScannerWidget;
