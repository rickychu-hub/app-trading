export interface Candle {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

export interface BacktestParams {
    initialCapital: number;
    riskPerTrade: number; // Percentage (e.g., 0.02 for 2%)
    smaLengthFast: number;
    smaLengthSlow: number;
}

export interface Trade {
    entryTime: string;
    exitTime: string;
    type: 'LONG' | 'SHORT';
    entryPrice: number;
    exitPrice: number;
    quantity: number;
    pnl: number;
    status: 'CLOSED';
}

export interface BacktestResult {
    totalTrades: number;
    winRate: number;
    netPnL: number;
    maxDrawdown: number;
    finalCapital: number;
    equityCurve: { time: string; value: number }[];
    trades: Trade[];
}

export class BacktestEngine {
    private feeRate = 0.001; // 0.1%
    private slippage = 0.0005; // 0.05%

    runBacktest(candles: Candle[], params: BacktestParams): BacktestResult {
        let capital = params.initialCapital;
        const equityCurve = [{ time: candles[0].time, value: capital }];
        const trades: Trade[] = [];
        let activeTrade: {
            entryTime: string;
            type: 'LONG' | 'SHORT';
            entryPrice: number;
            quantity: number;
        } | null = null;

        // Simple utility to calculate SMA
        const calculateSMA = (data: Candle[], index: number, length: number): number | null => {
            if (index < length - 1) return null;
            let sum = 0;
            for (let i = 0; i < length; i++) {
                sum += data[index - i].close;
            }
            return sum / length;
        };

        // Iterate through candles (Event-Driven)
        // We stop at candles.length - 1 because we need i+1 for execution
        for (let i = 0; i < candles.length - 1; i++) {
            const nextCandle = candles[i + 1];

            // 1. Calculate Indicators (using data 0 to i)
            const smaFast = calculateSMA(candles, i, params.smaLengthFast);
            const smaSlow = calculateSMA(candles, i, params.smaLengthSlow);
            const prevSmaFast = calculateSMA(candles, i - 1, params.smaLengthFast);
            const prevSmaSlow = calculateSMA(candles, i - 1, params.smaLengthSlow);

            // 2. Check for Signals (Golden Cross / Death Cross)
            let signal: 'BUY' | 'SELL' | 'NONE' = 'NONE';

            if (activeTrade && activeTrade.type === 'LONG') {
                // Exit logic: Simple Death Cross or stop loss/take profit (here just reversal)
                if (smaFast && smaSlow && prevSmaFast && prevSmaSlow) {
                    if (prevSmaFast >= prevSmaSlow && smaFast < smaSlow) {
                        signal = 'SELL'; // Close Long
                    }
                }
            } else if (!activeTrade) {
                // Entry logic: Golden Cross
                if (smaFast && smaSlow && prevSmaFast && prevSmaSlow) {
                    if (prevSmaFast <= prevSmaSlow && smaFast > smaSlow) {
                        signal = 'BUY'; // Open Long
                    }
                }
            }

            // 3. Execution at Open of i+1
            // Price increases for Buy (worse), decreases for Sell (worse)

            if (signal === 'SELL' && activeTrade) {
                // EXECUTE SELL (Close Trade)
                const exitPrice = nextCandle.open * (1 - this.slippage);
                const exitFee = (exitPrice * activeTrade.quantity) * this.feeRate;

                // Usually tracking capital:
                // Capital already reduced by Entry Cost + Entry Fee?
                // Or Capital is just cash?

                // Let's assume margin trading style or simulated wallet:
                // PnL calculated properly:
                // Entry Cost = entryPrice * qty
                // Entry Fee = Entry Cost * feeRate
                // Exit Cost = exitPrice * qty
                // Exit Fee = Exit Cost * feeRate
                // PnL = (Exit Cost - Entry Cost) - (Entry Fee + Exit Fee)

                const entryCost = activeTrade.entryPrice * activeTrade.quantity;
                const entryFee = entryCost * this.feeRate;

                const totalPnl = (exitPrice * activeTrade.quantity - entryCost) - (entryFee + exitFee);

                capital += totalPnl;

                trades.push({
                    entryTime: activeTrade.entryTime,
                    exitTime: nextCandle.time,
                    type: 'LONG',
                    entryPrice: activeTrade.entryPrice,
                    exitPrice: exitPrice,
                    quantity: activeTrade.quantity,
                    pnl: totalPnl,
                    status: 'CLOSED'
                });

                activeTrade = null;

            } else if (signal === 'BUY' && !activeTrade) {
                // EXECUTE BUY (Open Trade)
                const entryPrice = nextCandle.open * (1 + this.slippage);

                // Simple sizing: Invest X amount or Risk X amount?
                // Let's assume we invest chunk of capital for simplicity or use risk to define size via stop loss.
                // Prompt doesn't specify stop loss, so let's invest fixed % of capital or use risk as position size?
                // "Risk per Trade" usually implies Stop Loss. Without SL, risk calc is vague.
                // I'll assume we invest logic: Position Size = Capital * 0.9 (keep some cash) or just fixed 1 unit?
                const investAmount = capital * 0.9;
                const quantity = investAmount / entryPrice; // Raw quantity

                activeTrade = {
                    entryTime: nextCandle.time,
                    type: 'LONG',
                    entryPrice: entryPrice,
                    quantity: quantity
                };

                // Note: We don't deduct capital yet, effectively fully invested.
                // PnL added/subtracted on exit.
            }

            // Track Equity (Mark to Market)
            let currentEquity = capital;
            if (activeTrade) {
                // Unrealized PnL
                const currentPrice = nextCandle.close; // Approximate MTM at close of bar
                const entryCost = activeTrade.entryPrice * activeTrade.quantity;
                const floatingValue = currentPrice * activeTrade.quantity;
                const floatingPnl = floatingValue - entryCost;
                // Don't forget fees would be paid too if closed now
                // Ignore frictional costs for daily equity curve for simplicity? No, let's look roughly right.
                currentEquity += floatingPnl;
            }
            equityCurve.push({ time: nextCandle.time, value: currentEquity });
        }

        // Calculate Stats
        const winningTrades = trades.filter(t => t.pnl > 0).length;
        const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;
        const netPnL = capital - params.initialCapital;

        let maxDrawdown = 0;
        let peakCapital = params.initialCapital;

        for (const point of equityCurve) {
            if (point.value > peakCapital) {
                peakCapital = point.value;
            }
            const drawdown = (peakCapital - point.value) / peakCapital * 100;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        }

        return {
            totalTrades: trades.length,
            winRate,
            netPnL,
            maxDrawdown,
            finalCapital: capital,
            equityCurve,
            trades
        };
    }
}

export const backtestEngine = new BacktestEngine();
