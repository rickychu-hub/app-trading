import React, { useState, useEffect } from 'react';
import { Target, RefreshCw, Copy } from 'lucide-react';
import { binanceService } from '../../services/binancePriceService';
import { analysisService } from '../../services/analysisService';
import { useBotStore } from '../../store/botStore';

interface MarketOpportunity {
    ticker: string;
    price: number;
    score: number;
    signal: 'BUY' | 'WAIT' | 'SELL';
    trendStrength: number;
    rsi: number;
}

const TOP_ASSETS = [
    'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'SHIB', 'DOT',
    'LINK', 'TRX', 'MATIC', 'BCH', 'NEAR', 'UNI', 'LTC', 'APT', 'ICP', 'RNDR',
    'HBAR', 'FIL', 'ATOM', 'ARB', 'STX', 'IMX', 'KAS', 'VET', 'XLM', 'INJ'
];

interface MarketScannerProps {
    onAutoBuy?: (ticker: string, price: number) => void;
}

const MarketScannerPanel: React.FC<MarketScannerProps> = ({ onAutoBuy }) => {
    const [opportunities, setOpportunities] = useState<MarketOpportunity[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [isFullAuto, setIsFullAuto] = useState(false);
    const { toggleAsset, selectedAssets } = useBotStore();

    const calculateOpportunityScore = (rsi: number, emaFast: number, emaSlow: number): { score: number, signal: 'BUY' | 'WAIT' | 'SELL', strength: number } => {
        let score = 50; // Base Score
        let signal: 'BUY' | 'WAIT' | 'SELL' = 'WAIT';

        // 1. Trend Strength (EMA Spread)
        const spread = emaFast - emaSlow;
        const trendStrength = (spread / emaSlow) * 1000; // Normalized strength score

        if (spread > 0) {
            score += Math.min(30, trendStrength * 10); // Up to +30 points for strong uptrend
        } else {
            score -= Math.min(30, Math.abs(trendStrength) * 10); // Down to -30 points for downtrend
        }

        // 2. Momentum (RSI)
        if (rsi >= 50 && rsi <= 70) {
            score += 20; // Sweet spot for trend following
        } else if (rsi > 70) {
            score -= 10; // Overbought risk
        } else if (rsi < 30) {
            score -= 20; // Oversold (could be dip buy but risky for trend following)
        }

        // Normalize Score 0-100
        score = Math.max(0, Math.min(100, score));

        // Signal Logic
        if (score >= 75) signal = 'BUY';
        else if (score <= 25) signal = 'SELL';

        return { score, signal, strength: trendStrength };
    };

    const scanMarket = async () => {
        setIsScanning(true);
        const results: MarketOpportunity[] = [];

        try {
            // We scan sequentially to avoid rate limits or overwhelming the browser
            for (const ticker of TOP_ASSETS) {
                try {
                    const candles = await binanceService.fetchHistoricalCandles(`${ticker}USDT`, '1h', 50);
                    if (candles.length === 0) continue;

                    const i = candles.length - 1;
                    const price = candles[i].close;

                    // Calc Indicators
                    const rsiSeries = analysisService.generateRSISeries(candles, 14);
                    const fastSeries = analysisService.generateEMASeries(candles, 9);
                    const slowSeries = analysisService.generateEMASeries(candles, 21);

                    const rsi = rsiSeries[i] || 50;
                    const emaFast = fastSeries[i] || price;
                    const emaSlow = slowSeries[i] || price;

                    const { score, signal, strength } = calculateOpportunityScore(rsi, emaFast, emaSlow);

                    results.push({
                        ticker,
                        price,
                        score: Math.round(score),
                        signal,
                        trendStrength: strength,
                        rsi
                    });

                } catch (e) {
                    console.error(`Failed to scan ${ticker}`, e);
                }
            }

            // Sort by Score Descending
            results.sort((a, b) => b.score - a.score);
            setOpportunities(results);

            // AUTO-BUY LOGIC (The Selector)
            if (isFullAuto && onAutoBuy) {
                const bestOpp = results[0];
                if (bestOpp && bestOpp.score > 80 && bestOpp.signal === 'BUY') {
                    // Check if not already in portfolio (simplified check via selectedAssets map or relying on App.tsx to deduce)
                    // Ideally we check activeTrades but MarketScanner doesn't know them.
                    // We just trigger onAutoBuy, App.tsx should validate dups.
                    console.log(`🤖 [THE SELECTOR] Oportunidad detectada en ${bestOpp.ticker}. Ejecutando auto-compra...`);
                    onAutoBuy(bestOpp.ticker, bestOpp.price);
                }
            }

        } catch (error) {
            console.error("Market Scan failed", error);
        } finally {
            setIsScanning(false);
        }
    };

    // Auto-scan on mount
    useEffect(() => {
        scanMarket();
        const interval = setInterval(scanMarket, 60000); // Rescan every 1 minute
        return () => clearInterval(interval);
    }, []);

    const handleCopy = (ticker: string) => {
        if (!selectedAssets.includes(ticker)) {
            toggleAsset(ticker);
        }
        // Visual feedback could be added here
    };

    return (
        <div className="glass-panel rounded-xl border border-white/10 p-6 flex flex-col h-full animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Target className="text-accent" />
                        Market Scanner (IA)
                    </h3>
                    <p className="text-xs text-gray-500">Buscando oportunidades en Top 10 Caps (1H)</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-lg border border-white/5">
                        <span className={`text-[10px] font-bold ${isFullAuto ? 'text-green-400' : 'text-gray-500'}`}>
                            {isFullAuto ? '🤖 AUTO-TRADING ON' : '🤖 AUTO OFF'}
                        </span>
                        <button
                            onClick={() => setIsFullAuto(!isFullAuto)}
                            className={`w-8 h-4 rounded-full relative transition-colors ${isFullAuto ? 'bg-green-500' : 'bg-gray-600'}`}
                        >
                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isFullAuto ? 'left-4.5' : 'left-0.5'}`}></div>
                        </button>
                    </div>
                    <button
                        onClick={scanMarket}
                        disabled={isScanning}
                        className={`p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors ${isScanning ? 'animate-spin' : ''}`}
                    >
                        <RefreshCw size={16} className="text-gray-400" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto rounded-lg bg-black/20 border border-white/5">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#0b1d16] z-10">
                        <tr className="text-gray-500 text-[10px] uppercase tracking-wider border-b border-white/10">
                            <th className="p-3">Asset</th>
                            <th className="p-3 text-right">Price</th>
                            <th className="p-3 text-center">Score</th>
                            <th className="p-3 text-center">Signal</th>
                            <th className="p-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {opportunities.length === 0 && !isScanning && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500 text-xs">
                                    No opportunities found or scan failed.
                                </td>
                            </tr>
                        )}
                        {opportunities.length === 0 && isScanning && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500 text-xs">
                                    Scanning market...
                                </td>
                            </tr>
                        )}
                        {opportunities.map((opp) => (
                            <tr key={opp.ticker} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                <td className="p-3">
                                    <span className="font-bold text-white">{opp.ticker}</span>
                                    <span className="block text-[10px] text-gray-500">RSI: {opp.rsi.toFixed(0)}</span>
                                </td>
                                <td className="p-3 text-right font-mono text-xs text-gray-300">
                                    ${opp.price.toLocaleString()}
                                </td>
                                <td className="p-3 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${opp.score >= 70 ? 'bg-accent' : opp.score <= 30 ? 'bg-red-500' : 'bg-yellow-500'}`}
                                                style={{ width: `${opp.score}%` }}
                                            ></div>
                                        </div>
                                        <span className={`text-xs font-bold ${opp.score >= 70 ? 'text-accent' : opp.score <= 30 ? 'text-red-500' : 'text-yellow-500'}`}>
                                            {opp.score}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-3 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${opp.signal === 'BUY' ? 'bg-accent/20 text-accent' :
                                        opp.signal === 'SELL' ? 'bg-red-500/20 text-red-500' :
                                            'bg-gray-500/10 text-gray-500'
                                        }`}>
                                        {opp.signal}
                                    </span>
                                </td>
                                <td className="p-3 text-right">
                                    <button
                                        onClick={() => handleCopy(opp.ticker)}
                                        className="text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded transition-colors"
                                        title="Copiar al Dashboard"
                                    >
                                        <Copy size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MarketScannerPanel;
