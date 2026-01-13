import React, { useState } from 'react';
import { FlaskConical, TrendingUp, Activity, AlertTriangle, Play, Calendar, LineChart } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { backtestEngine, type BacktestResult } from '../../services/backtestEngine';
import { binanceService } from '../../services/binancePriceService';

const AnalyticsPanel: React.FC = () => {
    const [isBacktesting, setIsBacktesting] = useState(false);
    const [result, setResult] = useState<BacktestResult | null>(null);
    const [symbol, setSymbol] = useState('BTCUSDT');
    const [timeframe, setTimeframe] = useState('4h');

    const handleRunBacktest = async () => {
        setIsBacktesting(true);
        try {
            // Fetch Real Data
            const candles = await binanceService.fetchHistoricalCandles(symbol, timeframe, 500); // 500 candles
            // Run Backtest
            const backtestResult = backtestEngine.runBacktest(candles, {
                initialCapital: 10000,
                riskPerTrade: 0.02,
                smaLengthFast: 5,
                smaLengthSlow: 15
            });
            setResult(backtestResult);
        } catch (error) {
            console.error("Backtest failed:", error);
            alert("Error running backtest. Check console.");
        } finally {
            setIsBacktesting(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-accent to-emerald-400 bg-clip-text text-transparent mb-2">
                    Laboratorio de Estrategias
                </h1>
                <p className="text-gray-400">
                    Valide matemáticamente sus ideas con datos reales de Binance.
                </p>
            </div>

            {/* Controls */}
            <div className="bg-[#0b1d16] p-6 rounded-2xl border border-white/5 shadow-xl">
                <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
                    <div className="flex flex-wrap gap-4 items-center">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1 ml-1">Symbol</label>
                            <div className="relative">
                                <LineChart className="absolute left-3 top-3 text-gray-500" size={16} />
                                <select
                                    value={symbol}
                                    onChange={(e) => setSymbol(e.target.value)}
                                    className="bg-black/40 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white focus:border-accent outline-none appearance-none min-w-[140px]"
                                >
                                    <option value="BTCUSDT">BTC/USDT</option>
                                    <option value="ETHUSDT">ETH/USDT</option>
                                    <option value="SOLUSDT">SOL/USDT</option>
                                    <option value="BNBUSDT">BNB/USDT</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs text-gray-400 mb-1 ml-1">Timeframe</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 text-gray-500" size={16} />
                                <select
                                    value={timeframe}
                                    onChange={(e) => setTimeframe(e.target.value)}
                                    className="bg-black/40 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white focus:border-accent outline-none appearance-none min-w-[140px]"
                                >
                                    <option value="15m">15 Minutes</option>
                                    <option value="1h">1 Hour</option>
                                    <option value="4h">4 Hours</option>
                                    <option value="1d">1 Day</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleRunBacktest}
                        disabled={isBacktesting}
                        className="w-full md:w-auto flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-black px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(132,204,22,0.3)] hover:shadow-[0_0_30px_rgba(132,204,22,0.5)]"
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

            {/* Equity Curve Chart */}
            {result && (
                <div className="bg-[#0b1d16] p-6 rounded-2xl border border-white/5 h-[400px]">
                    <h3 className="text-lg font-bold text-white mb-4">Curva de Equidad</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={result.equityCurve}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#84cc16" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#84cc16" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                            <XAxis
                                dataKey="time"
                                stroke="#6b7280"
                                tick={{ fill: '#6b7280', fontSize: 12 }}
                                tickFormatter={(val) => val.split(' ')[0]}
                            />
                            <YAxis
                                stroke="#6b7280"
                                tick={{ fill: '#6b7280', fontSize: 12 }}
                                domain={['auto', 'auto']}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0b1d16', borderColor: '#ffffff20', color: '#fff' }}
                                itemStyle={{ color: '#84cc16' }}
                                formatter={(value: number | undefined) => [`$${(value || 0).toFixed(2)}`, 'Equity']}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#84cc16"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorValue)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

export default AnalyticsPanel;
