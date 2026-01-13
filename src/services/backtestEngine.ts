export interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

export type StrategyType = 'TREND_FOLLOWING' | 'MEAN_REVERSION';

export interface BacktestParams {
    initialCapital: number;
    riskPerTrade: number; // Percentage (0.02 = 2%)
    strategy: StrategyType;
    // Strategy Params
    emaFast: number;
    emaSlow: number;
    rsiPeriod: number;
    rsiThreshold: number; // For Trend: Buy > 50? For MeanRev: Buy < 30?
    bollingerPeriod: number;
    bollingerStd: number;
    stopLossPct: number; // 0.05 = 5%
    takeProfitPct: number; // 0.10 = 10%
}

export interface Trade {
    entryTime: number;
    exitTime: number;
    type: 'LONG' | 'SHORT';
    entryPrice: number;
    exitPrice: number;
    quantity: number;
    pnl: number; // Net PnL
    status: 'CLOSED';
    exitReason: 'SIGNAL' | 'STOP_LOSS' | 'TAKE_PROFIT';
}

export interface BacktestResult {
    totalTrades: number;
    winRate: number;
    netPnL: number;
    profitFactor: number;
    avgTrade: number;
    maxDrawdown: number;
    finalCapital: number;
    equityCurve: { time: number; value: number }[];
    trades: Trade[];
}

export class BacktestEngine {
    private feeRate = 0.001; // 0.1% per side
    private slippage = 0.0005; // 0.05% per side

    // --- Indicators ---

    private calculateSMA(data: Candle[], index: number, length: number): number | null {
        if (index < length - 1) return null;
        let sum = 0;
        for (let i = 0; i < length; i++) {
            sum += data[index - i].close;
        }
        return sum / length;
    }

    private calculateEMA(data: Candle[], index: number, length: number, prevEMA: number | null): number | null {
        if (index < 0) return null;
        const close = data[index].close;
        if (prevEMA === null) {
            // Initial SMA as first EMA
            return this.calculateSMA(data, index, length);
        }
        const multiplier = 2 / (length + 1);
        return (close - prevEMA) * multiplier + prevEMA;
    }

    // Pre-calculate EMAs for the whole series to allow easier lookup
    private generateEMASeries(candles: Candle[], length: number): (number | null)[] {
        const emas: (number | null)[] = [];
        let prev: number | null = null;
        for (let i = 0; i < candles.length; i++) {
            const ema = this.calculateEMA(candles, i, length, prev);
            emas.push(ema);
            prev = ema;
        }
        return emas;
    }

    private calculateRSI(candles: Candle[], i: number, period: number): number | null {
        if (i < period) return null;
        // Simple RSI implementation (could be optimized with series)
        let gains = 0;
        let losses = 0;

        // Calculate initial average (simple)
        for (let j = i - period + 1; j <= i; j++) {
            const change = candles[j].close - candles[j - 1].close;
            if (change >= 0) gains += change;
            else losses -= change;
        }

        if (losses === 0) return 100;
        const rs = (gains / period) / (losses / period);
        return 100 - (100 / (1 + rs));
    }

    // Series RSI for efficiency/correct smoothing
    private generateRSISeries(candles: Candle[], period: number): (number | null)[] {
        const rsiSeries: (number | null)[] = new Array(candles.length).fill(null);
        if (candles.length <= period) return rsiSeries;

        let avgGain = 0;
        let avgLoss = 0;

        // First average
        for (let i = 1; i <= period; i++) {
            const change = candles[i].close - candles[i - 1].close;
            if (change > 0) avgGain += change;
            else avgLoss -= change;
        }
        avgGain /= period;
        avgLoss /= period;

        rsiSeries[period] = 100 - (100 / (1 + avgGain / (avgLoss === 0 ? 1 : avgLoss))); // Avoid div/0

        for (let i = period + 1; i < candles.length; i++) {
            const change = candles[i].close - candles[i - 1].close;
            const gain = change > 0 ? change : 0;
            const loss = change < 0 ? -change : 0;

            avgGain = (avgGain * (period - 1) + gain) / period;
            avgLoss = (avgLoss * (period - 1) + loss) / period;

            if (avgLoss === 0) {
                rsiSeries[i] = 100;
            } else {
                const rs = avgGain / avgLoss;
                rsiSeries[i] = 100 - (100 / (1 + rs));
            }
        }
        return rsiSeries;
    }

    private calculateBollingerBands(candles: Candle[], i: number, period: number, stdDevMult: number): { upper: number, lower: number, middle: number } | null {
        const middle = this.calculateSMA(candles, i, period);
        if (middle === null) return null;

        let sumSq = 0;
        for (let j = 0; j < period; j++) {
            const val = candles[i - j].close;
            sumSq += Math.pow(val - middle, 2);
        }

        const stdDev = Math.sqrt(sumSq / period);
        return {
            middle,
            upper: middle + (stdDev * stdDevMult),
            lower: middle - (stdDev * stdDevMult)
        };
    }

    runBacktest(candles: Candle[], params: BacktestParams): BacktestResult {
        let capital = params.initialCapital;
        const equityCurve = [{ time: candles[0].time, value: capital }];
        const trades: Trade[] = [];
        let activeTrade: {
            entryTime: number;
            type: 'LONG' | 'SHORT';
            entryPrice: number;
            quantity: number;
        } | null = null;

        // Pre-calculate Series where needed for performance/correctness
        const emaFastSeries = this.generateEMASeries(candles, params.emaFast);
        const emaSlowSeries = this.generateEMASeries(candles, params.emaSlow);
        const rsiSeries = this.generateRSISeries(candles, params.rsiPeriod);

        // Iterate
        for (let i = 0; i < candles.length - 1; i++) {
            const currentCandle = candles[i]; // Signal Generation
            const nextCandle = candles[i + 1]; // Execution / Price Action

            // 1. Check End-of-Day Signals (at close of i)
            let signal: 'BUY' | 'SELL' | 'NONE' = 'NONE';

            // Get Indicators at i
            const rsi = rsiSeries[i];

            if (params.strategy === 'TREND_FOLLOWING') {
                const fast = emaFastSeries[i];
                const slow = emaSlowSeries[i];
                const prevFast = emaFastSeries[i - 1];
                const prevSlow = emaSlowSeries[i - 1];

                // Check alignment
                if (fast !== null && slow !== null && prevFast !== null && prevSlow !== null && rsi !== null) {
                    // Golden Cross + RSI Filter
                    if (prevFast <= prevSlow && fast > slow && rsi > params.rsiThreshold) {
                        signal = 'BUY';
                    }
                    // Death Cross (Exit Signal)
                    if (prevFast >= prevSlow && fast < slow) {
                        signal = 'SELL';
                    }
                }

            } else if (params.strategy === 'MEAN_REVERSION') {
                // Bollinger Bands
                const bb = this.calculateBollingerBands(candles, i, params.bollingerPeriod, params.bollingerStd);

                if (bb && rsi !== null) {
                    // Buy: Close < Lower Band (Oversold) AND RSI < Threshold (Deep oversold)
                    // Or maybe Low < Lower Band? Standard is usually Close or Low touching. 
                    // Let's use Close < Lower for stricter, or Low < Lower for loose. 
                    // User prompt: "Bollinger Bands (Comprar si toca banda inferior...)" -> Low <= Lower

                    const low = currentCandle.low;
                    const high = currentCandle.high;

                    if (low <= bb.lower && rsi < params.rsiThreshold) {
                        signal = 'BUY';
                    }

                    // Exit: High >= Upper Band
                    if (high >= bb.upper) {
                        signal = 'SELL';
                    }
                }
            }

            // 2. Handle Execution (Exit/Entry) in i+1

            // A. Check Market Exit (Signal from i) for Active Trade
            if (activeTrade && activeTrade.type === 'LONG' && signal === 'SELL') {
                // Close at Open
                const exitPrice = nextCandle.open * (1 - this.slippage);
                this.closeTrade(activeTrade, exitPrice, nextCandle.time, 'SIGNAL', trades, capital, (pnl) => capital += pnl);
                activeTrade = null;
            }

            // B. Check SL/TP (Intraday i+1) for Active Trade (if still active)
            if (activeTrade && activeTrade.type === 'LONG') {
                const stopPrice = activeTrade.entryPrice * (1 - params.stopLossPct);
                const takePrice = activeTrade.entryPrice * (1 + params.takeProfitPct);

                // Check Low for SL
                if (nextCandle.low <= stopPrice) {
                    // SL Hit. Slippage applied to Stop Price usually
                    const exitPrice = stopPrice * (1 - this.slippage);
                    this.closeTrade(activeTrade, exitPrice, nextCandle.time, 'STOP_LOSS', trades, capital, (pnl) => capital += pnl);
                    activeTrade = null;
                }
                // Check High for TP (else-if implies OCO - One Cancels Other)
                else if (nextCandle.high >= takePrice) {
                    // TP Hit
                    const exitPrice = takePrice * (1 - this.slippage);
                    this.closeTrade(activeTrade, exitPrice, nextCandle.time, 'TAKE_PROFIT', trades, capital, (pnl) => capital += pnl);
                    activeTrade = null;
                }
            }

            // C. Check Entry (Signal from i) if no active trade
            // Note: If we just closed a trade above, we don't re-enter same bar usually to avoid whipsaw, 
            // unless strategy reverses. Here we assume flat.
            if (!activeTrade && signal === 'BUY') {
                const entryPrice = nextCandle.open * (1 + this.slippage);
                const investAmount = capital * 0.9; // 90% Equity usage
                const quantity = investAmount / entryPrice;

                // Establish Trade
                activeTrade = {
                    entryTime: nextCandle.time,
                    type: 'LONG',
                    entryPrice: entryPrice,
                    quantity: quantity
                };

                // D. Check SL/TP Immediately for this NEW trade in the SAME bar (i+1)?
                // Yes, price action in i+1 could hit SL/TP after Open.
                const stopPrice = activeTrade.entryPrice * (1 - params.stopLossPct);
                const takePrice = activeTrade.entryPrice * (1 + params.takeProfitPct);

                if (nextCandle.low <= stopPrice) {
                    const exitPrice = stopPrice * (1 - this.slippage);
                    this.closeTrade(activeTrade, exitPrice, nextCandle.time, 'STOP_LOSS', trades, capital, (pnl) => capital += pnl);
                    activeTrade = null;
                } else if (nextCandle.high >= takePrice) {
                    const exitPrice = takePrice * (1 - this.slippage);
                    this.closeTrade(activeTrade, exitPrice, nextCandle.time, 'TAKE_PROFIT', trades, capital, (pnl) => capital += pnl);
                    activeTrade = null;
                }
            }

            // Update Equity Curve
            let currentEquity = capital;
            if (activeTrade) {
                // Mark to Market at Close of i+1
                const currentValue = (nextCandle.close * activeTrade.quantity);
                const openCost = activeTrade.entryPrice * activeTrade.quantity;
                const netPnl = currentValue - openCost; // Rough floating PnL (ignoring exit fees)
                currentEquity += netPnl;
            }
            equityCurve.push({ time: nextCandle.time, value: currentEquity });
        }

        // Stats
        const winningTrades = trades.filter(t => t.pnl > 0).length;
        const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;
        const netPnL = capital - params.initialCapital;

        let grossWin = 0;
        let grossLoss = 0;
        trades.forEach(t => {
            if (t.pnl > 0) grossWin += t.pnl;
            else grossLoss += Math.abs(t.pnl);
        });
        const profitFactor = grossLoss === 0 ? (grossWin > 0 ? 999 : 0) : grossWin / grossLoss;
        const avgTrade = trades.length > 0 ? netPnL / trades.length : 0;

        // Max Drawdown
        let maxDrawdown = 0;
        let peak = params.initialCapital;
        equityCurve.forEach(pt => {
            if (pt.value > peak) peak = pt.value;
            const dd = (peak - pt.value) / peak * 100;
            if (dd > maxDrawdown) maxDrawdown = dd;
        });

        return {
            totalTrades: trades.length,
            winRate,
            netPnL,
            profitFactor,
            avgTrade,
            maxDrawdown,
            finalCapital: capital,
            equityCurve,
            trades
        };
    }

    private closeTrade(
        trade: { entryPrice: number; quantity: number; entryTime: number; type: 'LONG' | 'SHORT' },
        exitPrice: number,
        exitTime: number,
        reason: Trade['exitReason'],
        trades: Trade[],
        currentCapital: number,
        updateCapital: (pnl: number) => void
    ) {
        const entryCost = trade.entryPrice * trade.quantity;
        const entryFee = entryCost * this.feeRate;

        const exitCost = exitPrice * trade.quantity;
        const exitFee = exitCost * this.feeRate;

        const grossPnl = exitCost - entryCost;
        const netPnl = grossPnl - (entryFee + exitFee);

        updateCapital(netPnl);

        trades.push({
            entryTime: trade.entryTime,
            exitTime: exitTime,
            type: trade.type,
            entryPrice: trade.entryPrice,
            exitPrice: exitPrice,
            quantity: trade.quantity,
            pnl: netPnl,
            status: 'CLOSED',
            exitReason: reason
        });
    }
}

export const backtestEngine = new BacktestEngine();
