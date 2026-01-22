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
    // 1. Los Reyes
    'BTC', 'ETH', 'BNB', 'SOL', 'XRP',
    // 2. L1 Alts
    'ADA', 'AVAX', 'DOT', 'NEAR', 'SUI', 'APT', 'TRX', 'MATIC',
    // 3. AI
    'FET', 'RNDR', 'TAO', 'ICP',
    // 4. DeFi
    'LINK', 'UNI', 'AAVE', 'OP', 'ARB', 'TIA', 'INJ',
    // 5. Memes
    'DOGE', 'SHIB', 'PEPE', 'WIF'
];

interface MarketScannerProps {
    onAutoBuy?: (ticker: string, price: number) => void;
}

const MarketScannerPanel: React.FC<MarketScannerProps> = ({ onAutoBuy }) => {
    const [opportunities, setOpportunities] = useState<MarketOpportunity[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    // Initialize from LocalStorage
    const [isFullAuto, setIsFullAuto] = useState(() => {
        const saved = localStorage.getItem('isAutoTrading');
        return saved === 'true';
    });
    const { toggleAsset, selectedAssets } = useBotStore();

    // Persist Change
    const handleToggleAuto = () => {
        const newValue = !isFullAuto;
        setIsFullAuto(newValue);
        localStorage.setItem('isAutoTrading', String(newValue));
        if (newValue) {
            console.log("🔄 Auto-Trading Activado");
        }
    };

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

            // Sort by RSI Ascending (Lowest RSI first - Potential Dips)
            results.sort((a, b) => a.rsi - b.rsi);
            setOpportunities(results);

            // AUTO-BUY LOGIC (The Selector)
            if (isFullAuto && onAutoBuy) {
                // Look for deepest dip with confirmation
                const bestOpp = results.find(r => r.rsi < 30 && r.signal !== 'SELL');
                if (bestOpp && bestOpp.score > 60) {
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

    // Auto-scan on mount and when Auto state changes (to capture new closure)
    useEffect(() => {
        if (isFullAuto) {
            console.log("🔄 Auto-Trading reanudado automáticamente (Loop Activo)");
        }
        scanMarket();
        const interval = setInterval(scanMarket, 60000); // Rescan every 1 minute
        return () => clearInterval(interval);
    }, [isFullAuto]);

    const handleCopy = (ticker: string) => {
        if (!selectedAssets.includes(ticker)) {
            toggleAsset(ticker);
        }
        // Visual feedback could be added here
    };

    return (
        <div className="glass-panel rounded-xl border border-white/10 p-4 flex flex-col h-full animate-fade-in max-h-[600px]">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Target className="text-accent" size={18} />
                        Oportunidades (RSI)
                    </h3>
                    <p className="text-[10px] text-gray-500">Ordenado por RSI (Menor a Mayor)</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-black/40 p-1 rounded-lg border border-white/5">
                        <button
                            onClick={handleToggleAuto}
                            className={`w-8 h-4 rounded-full relative transition-colors ${isFullAuto ? 'bg-green-500' : 'bg-gray-600'}`}
                            title="Auto Trading Toggle"
                        >
                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isFullAuto ? 'left-4.5' : 'left-0.5'}`}></div>
                        </button>
                    </div>
                    <button
                        onClick={scanMarket}
                        disabled={isScanning}
                        className={`p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors ${isScanning ? 'animate-spin' : ''}`}
                    >
                        <RefreshCw size={14} className="text-gray-400" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#0b1d16] z-10 shadow-sm shadow-black/50">
                        <tr className="text-gray-500 text-[9px] uppercase tracking-wider border-b border-white/10">
                            <th className="p-2">Asset</th>
                            <th className="p-2 text-right">RSI (14)</th>
                            <th className="p-2 text-right">Price</th>
                            <th className="p-2 text-center">Score</th>
                            <th className="p-2 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs">
                        {opportunities.length === 0 && !isScanning && (
                            <tr>
                                <td colSpan={5} className="p-4 text-center text-gray-500 text-xs">
                                    No opportunities found.
                                </td>
                            </tr>
                        )}
                        {opportunities.length === 0 && isScanning && (
                            <tr>
                                <td colSpan={5} className="p-4 text-center text-gray-500 text-xs">
                                    Scanning market...
                                </td>
                            </tr>
                        )}
                        {opportunities.map((opp) => {
                            // RSI Color Logic
                            let rsiColor = "text-gray-400";
                            let rowBg = "hover:bg-white/5";

                            if (opp.rsi < 30) {
                                rsiColor = "text-green-400 font-bold animate-pulse";
                                rowBg = "bg-green-500/5 hover:bg-green-500/10";
                            } else if (opp.rsi > 70) {
                                rsiColor = "text-red-400 font-bold";
                                rowBg = "bg-red-500/5 hover:bg-red-500/10";
                            }

                            return (
                                <tr key={opp.ticker} className={`border-b border-white/5 transition-colors group ${rowBg}`}>
                                    <td className="p-2">
                                        <span className="font-bold text-white">{opp.ticker}</span>
                                    </td>
                                    <td className={`p-2 text-right font-mono ${rsiColor}`}>
                                        {opp.rsi.toFixed(1)}
                                    </td>
                                    <td className="p-2 text-right font-mono text-gray-400">
                                        ${opp.price < 1 ? opp.price.toFixed(4) : opp.price.toLocaleString()}
                                    </td>
                                    <td className="p-2 text-center">
                                        <span className={`text-[10px] font-bold ${opp.score >= 70 ? 'text-accent' : opp.score <= 30 ? 'text-red-500' : 'text-gray-500'}`}>
                                            {opp.score}
                                        </span>
                                    </td>
                                    <td className="p-2 text-right">
                                        <button
                                            onClick={() => handleCopy(opp.ticker)}
                                            className="text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 p-1 rounded transition-colors"
                                            title="Ver Gráfico"
                                        >
                                            <Copy size={12} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MarketScannerPanel;
