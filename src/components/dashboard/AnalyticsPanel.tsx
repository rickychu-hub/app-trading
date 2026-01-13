import React, { useState } from 'react';
import { FlaskConical, TrendingUp, Activity, AlertTriangle, Play } from 'lucide-react';
import { backtestEngine, type Candle, type BacktestResult } from '../../services/backtestEngine';

const AnalyticsPanel: React.FC = () => {
    const [isBacktesting, setIsBacktesting] = useState(false);
    const [result, setResult] = useState<BacktestResult | null>(null);

    // Mock Data Generator
    const generateMockCandles = (count: number = 100): Candle[] => {
        const candles: Candle[] = [];
        let price = 50000;
        const now = new Date();

        for (let i = 0; i < count; i++) {
            const time = new Date(now.getTime() - (count - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const change = (Math.random() - 0.48) * 1000; // Slight upward bias
            const open = price;
            const close = price + change;
            const high = Math.max(open, close) + Math.random() * 200;
            const low = Math.min(open, close) - Math.random() * 200;

            candles.push({ time, open, high, low, close });
            price = close;
        }
        return candles;
    };

    const handleRunBacktest = () => {
        setIsBacktesting(true);
        setTimeout(() => {
            const mockData = generateMockCandles(150);
            const backtestResult = backtestEngine.runBacktest(mockData, {
                initialCapital: 10000,
                riskPerTrade: 0.02,
                smaLengthFast: 5,
                smaLengthSlow: 15
            });
            setResult(backtestResult);
            setIsBacktesting(false);
        }, 1000); // Simulate processing delay
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-accent to-emerald-400 bg-clip-text text-transparent mb-2">
                    Laboratorio de Estrategias
                </h1>
                <p className="text-gray-400">
                    Valide matemáticamente sus ideas antes de arriesgar capital real.
                </p>
            </div>

            {/* Controls */}
            <div className="bg-[#0b1d16] p-6 rounded-2xl border border-white/5 shadow-xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-1">Configuración del Backtest</h3>
                        <p className="text-sm text-gray-400">Estrategia: SMA Crossover (Fast: 5, Slow: 15) | Asset: BTC Simulated</p>
                    </div>
                    <button
                        onClick={handleRunBacktest}
                        disabled={isBacktesting}
                        className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-black px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isBacktesting ? (
                            <Activity className="animate-spin" />
                        ) : (
                            <Play size={20} />
                        )}
                        {isBacktesting ? 'Computando...' : 'Ejecutar Backtest'}
                    </button>
                </div>
            </div>

            {/* Results Grid */}
            {result && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-[#0b1d16] p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Activity size={40} className="text-blue-400" />
                        </div>
                        <p className="text-gray-400 text-sm mb-1">Total Trades</p>
                        <p className="text-3xl font-bold text-white">{result.totalTrades}</p>
                    </div>

                    <div className="bg-[#0b1d16] p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <FlaskConical size={40} className="text-purple-400" />
                        </div>
                        <p className="text-gray-400 text-sm mb-1">Win Rate</p>
                        <p className={`text-3xl font-bold ${result.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                            {result.winRate.toFixed(1)}%
                        </p>
                    </div>

                    <div className="bg-[#0b1d16] p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <TrendingUp size={40} className="text-emerald-400" />
                        </div>
                        <p className="text-gray-400 text-sm mb-1">Net P&L</p>
                        <p className={`text-3xl font-bold ${result.netPnL >= 0 ? 'text-accent' : 'text-red-500'}`}>
                            ${result.netPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>

                    <div className="bg-[#0b1d16] p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <AlertTriangle size={40} className="text-orange-400" />
                        </div>
                        <p className="text-gray-400 text-sm mb-1">Max Drawdown</p>
                        <p className="text-3xl font-bold text-orange-400">
                            {result.maxDrawdown.toFixed(2)}%
                        </p>
                    </div>
                </div>
            )}

            {/* Equity Curve Placeholder */}
            {result && (
                <div className="bg-[#0b1d16] p-6 rounded-2xl border border-white/5">
                    <h3 className="text-lg font-bold text-white mb-4">Curva de Equidad</h3>
                    <div className="h-64 flex items-end gap-1 border-b border-l border-gray-700/50 p-2">
                        {result.equityCurve.map((point, i) => {
                            // Simple normalization for visualization
                            const min = Math.min(...result.equityCurve.map(p => p.value));
                            const max = Math.max(...result.equityCurve.map(p => p.value));
                            const height = ((point.value - min) / (max - min)) * 100;

                            return (
                                <div
                                    key={i}
                                    className="flex-1 bg-accent/20 hover:bg-accent/40 transition-colors rounded-t-sm relative group"
                                    style={{ height: `${Math.max(height, 1)}%` }}
                                >
                                    <div className="absolute bottom-full mb-2 hidden group-hover:block bg-black text-xs p-1 rounded border border-white/10 whitespace-nowrap z-10">
                                        ${point.value.toFixed(0)} ({point.time})
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsPanel;
