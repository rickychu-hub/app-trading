import React, { useState } from 'react';
import { FlaskConical, TrendingUp, Activity, AlertTriangle, Play, LineChart, Settings2, Target, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { backtestEngine, type BacktestResult } from '../../services/backtestEngine';
import { binanceService } from '../../services/binancePriceService';
import { useStrategyStore } from '../../store/strategyStore';

interface MetricCardProps {
    label: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon: Icon, color }) => (
    <div className="bg-[#0b1d16] p-4 rounded-xl border border-white/5 relative overflow-hidden group hover:border-accent/30 transition-all">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Icon size={32} className={color} />
        </div>
        <p className="text-gray-400 text-xs mb-1">{label}</p>
        <p className={`text-xl font-bold ${color.replace('text-', '') === 'text-white' ? 'text-white' : color}`}>
            {value}
        </p>
    </div>
);

const AnalyticsPanel: React.FC = () => {
    const [isBacktesting, setIsBacktesting] = useState(false);
    const [result, setResult] = useState<BacktestResult | null>(null);

    // Data Params
    const [symbol, setSymbol] = useState('BTCUSDT');
    const [timeframe, setTimeframe] = useState('4h');

    // Strategy Params via Store
    const store = useStrategyStore();

    const handleRunBacktest = async () => {
        setIsBacktesting(true);
        try {
            // Fetch Real Data
            const candles = await binanceService.fetchHistoricalCandles(symbol, timeframe, 500);

            // Run Backtest
            const backtestResult = backtestEngine.runBacktest(candles, {
                initialCapital: 10000,
                riskPerTrade: 0.02,
                strategy: store.strategy,
                emaFast: store.emaFast,
                emaSlow: store.emaSlow,
                rsiPeriod: store.rsiPeriod,
                rsiThreshold: store.rsiThreshold,
                bollingerPeriod: store.bollingerPeriod,
                bollingerStd: store.bollingerStd,
                stopLossPct: store.stopLossPct / 100,
                takeProfitPct: store.takeProfitPct / 100
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
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-accent to-emerald-400 bg-clip-text text-transparent mb-2">
                    Laboratorio de Estrategias Pro
                </h1>
                <p className="text-gray-400">
                    Optimización algorítmica con datos reales de Binance.
                </p>
            </div>

            {/* Controls Container */}
            <div className="bg-[#0b1d16] p-6 rounded-2xl border border-white/5 shadow-xl grid lg:grid-cols-3 gap-8">

                {/* 1. Data Selection */}
                <div className="space-y-4">
                    <h3 className="text-white font-semibold flex items-center gap-2">
                        <LineChart size={18} className="text-accent" /> Datos de Mercado
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Symbol</label>
                            <select value={symbol} onChange={e => setSymbol(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-accent">
                                <option value="BTCUSDT">BTC/USDT</option>
                                <option value="ETHUSDT">ETH/USDT</option>
                                <option value="BNBUSDT">BNB/USDT</option>
                                <option value="SOLUSDT">SOL/USDT</option>
                                <option value="XRPUSDT">XRP/USDT</option>
                                <option value="ADAUSDT">ADA/USDT</option>
                                <option value="DOGEUSDT">DOGE/USDT</option>
                                <option value="DOTUSDT">DOT/USDT</option>
                                <option value="TRXUSDT">TRX/USDT</option>
                                <option value="LINKUSDT">LINK/USDT</option>
                                <option value="MATICUSDT">MATIC/USDT</option>
                                <option value="AVAXUSDT">AVAX/USDT</option>
                                <option value="LTCUSDT">LTC/USDT</option>
                                <option value="BCHUSDT">BCH/USDT</option>
                                <option value="ATOMUSDT">ATOM/USDT</option>
                                <option value="UNIUSDT">UNI/USDT</option>
                                <option value="XLMUSDT">XLM/USDT</option>
                                <option value="NEARUSDT">NEAR/USDT</option>
                                <option value="APTUSDT">APT/USDT</option>
                                <option value="SHIBUSDT">SHIB/USDT</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Timeframe</label>
                            <select value={timeframe} onChange={e => setTimeframe(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white outline-none focus:border-accent">
                                <option value="15m">15m</option>
                                <option value="1h">1h</option>
                                <option value="4h">4h</option>
                                <option value="1d">1d</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 2. Strategy Config */}
                <div className="space-y-4 lg:col-span-2">
                    <div className="flex justify-between items-center">
                        <h3 className="text-white font-semibold flex items-center gap-2">
                            <Settings2 size={18} className="text-purple-400" /> Lógica de Estrategia
                        </h3>
                        <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
                            <button
                                onClick={() => store.setStrategy('TREND_FOLLOWING')}
                                className={`px-3 py-1 text-xs rounded transition-all ${store.strategy === 'TREND_FOLLOWING' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-500 hover:text-white'}`}
                            >Trend Follower</button>
                            <button
                                onClick={() => store.setStrategy('MEAN_REVERSION')}
                                className={`px-3 py-1 text-xs rounded transition-all ${store.strategy === 'MEAN_REVERSION' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500 hover:text-white'}`}
                            >Mean Reversion</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {store.strategy === 'TREND_FOLLOWING' ? (
                            <>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">EMA Fast</label>
                                    <input type="number" value={store.emaFast} onChange={e => store.setParams({ emaFast: parseInt(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white font-mono text-sm focus:border-purple-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">EMA Slow</label>
                                    <input type="number" value={store.emaSlow} onChange={e => store.setParams({ emaSlow: parseInt(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white font-mono text-sm focus:border-purple-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">RSI Period</label>
                                    <input type="number" value={store.rsiPeriod} onChange={e => store.setParams({ rsiPeriod: parseInt(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white font-mono text-sm focus:border-purple-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">RSI Filter ({'>'})</label>
                                    <input type="number" value={store.rsiThreshold} onChange={e => store.setParams({ rsiThreshold: parseInt(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white font-mono text-sm focus:border-purple-500 outline-none" />
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">BB Period</label>
                                    <input type="number" value={store.bollingerPeriod} onChange={e => store.setParams({ bollingerPeriod: parseInt(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white font-mono text-sm focus:border-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Std Dev</label>
                                    <input type="number" value={store.bollingerStd} onChange={e => store.setParams({ bollingerStd: parseFloat(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white font-mono text-sm focus:border-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">RSI Period</label>
                                    <input type="number" value={store.rsiPeriod} onChange={e => store.setParams({ rsiPeriod: parseInt(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white font-mono text-sm focus:border-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">RSI Filter ({'<'})</label>
                                    <input type="number" value={store.rsiThreshold} onChange={e => store.setParams({ rsiThreshold: parseInt(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white font-mono text-sm focus:border-blue-500 outline-none" />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* 3. Risk Management */}
                <div className="lg:col-span-3 border-t border-white/5 pt-4 grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Stop Loss %</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-xs text-red-500 font-bold">SL</span>
                                <input type="number" value={store.stopLossPct} onChange={e => store.setParams({ stopLossPct: parseFloat(e.target.value) })} className="w-full bg-red-500/10 border border-red-500/20 rounded-lg pl-8 p-2 text-white font-mono text-sm focus:border-red-500 outline-none" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Take Profit %</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-xs text-green-500 font-bold">TP</span>
                                <input type="number" value={store.takeProfitPct} onChange={e => store.setParams({ takeProfitPct: parseFloat(e.target.value) })} className="w-full bg-green-500/10 border border-green-500/20 rounded-lg pl-8 p-2 text-white font-mono text-sm focus:border-green-500 outline-none" />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleRunBacktest}
                        disabled={isBacktesting}
                        className="w-full bg-accent hover:bg-accent/90 text-black px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(132,204,22,0.3)] hover:shadow-[0_0_30px_rgba(132,204,22,0.5)] flex items-center justify-center gap-2 h-[42px]"
                    >
                        {isBacktesting ? <Activity className="animate-spin" /> : <Play size={20} />}
                        {isBacktesting ? 'Optimizando...' : 'Ejecutar Estrategia'}
                    </button>

                    <div className="text-xs text-gray-500 text-center md:text-right">
                        Capital Inicial: $10,000 | Fees: 0.1% | Slippage: 0.05%
                    </div>
                </div>
            </div>

            {/* Results Grid */}
            {result && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <MetricCard label="Total Trades" value={result.totalTrades} icon={Activity} color="text-blue-400" />
                    <MetricCard label="Win Rate" value={`${result.winRate.toFixed(1)}%`} icon={FlaskConical} color={result.winRate >= 50 ? "text-green-400" : "text-red-400"} />
                    <MetricCard label="Net P&L" value={`$${result.netPnL.toLocaleString()}`} icon={TrendingUp} color={result.netPnL >= 0 ? "text-accent" : "text-red-500"} />
                    <MetricCard label="Max Drawdown" value={`${result.maxDrawdown.toFixed(2)}%`} icon={AlertTriangle} color="text-orange-400" />
                    <MetricCard label="Profit Factor" value={result.profitFactor.toFixed(2)} icon={Target} color="text-cyan-400" />
                    <MetricCard label="Avg Trade" value={`$${result.avgTrade.toFixed(2)}`} icon={Zap} color={result.avgTrade >= 0 ? "text-green-400" : "text-red-400"} />
                </div>
            )}

            {/* Equity Curve Chart */}
            {result && (
                <div className="bg-[#0b1d16] p-6 rounded-2xl border border-white/5 h-[400px]">
                    <h3 className="text-gray-400 text-sm mb-4 flex items-center gap-2">
                        <LineChart size={16} /> Curva de Equidad
                    </h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={result.equityCurve}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#84cc16" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#84cc16" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis
                                dataKey="time"
                                stroke="#6b7280"
                                tick={{ fill: '#6b7280', fontSize: 12 }}
                                tickFormatter={(val) => new Date(val).toLocaleDateString()}
                            />
                            <YAxis
                                stroke="#6b7280"
                                tick={{ fill: '#6b7280', fontSize: 12 }}
                                domain={['auto', 'auto']}
                                tickFormatter={(val) => `$${val}`}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0b1d16', borderColor: '#ffffff20', color: '#fff' }}
                                itemStyle={{ color: '#84cc16' }}
                                labelFormatter={(label) => new Date(label).toLocaleString()}
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
