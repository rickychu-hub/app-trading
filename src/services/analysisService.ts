import type { Candle } from './backtestEngine';

export class AnalysisService {

    // --- Indicators ---

    calculateSMA(data: Candle[], index: number, length: number): number | null {
        if (index < length - 1) return null;
        let sum = 0;
        for (let i = 0; i < length; i++) {
            sum += data[index - i].close;
        }
        return sum / length;
    }

    calculateEMA(data: Candle[], index: number, length: number, prevEMA: number | null): number | null {
        if (index < 0) return null;
        const close = data[index].close;
        if (prevEMA === null) {
            // Initial SMA as first EMA
            return this.calculateSMA(data, index, length);
        }
        const multiplier = 2 / (length + 1);
        return (close - prevEMA) * multiplier + prevEMA;
    }

    // Pre-calculate EMAs for the whole series
    generateEMASeries(candles: Candle[], length: number): (number | null)[] {
        const emas: (number | null)[] = [];
        let prev: number | null = null;
        for (let i = 0; i < candles.length; i++) {
            const ema = this.calculateEMA(candles, i, length, prev);
            emas.push(ema);
            prev = ema;
        }
        return emas;
    }

    // Series RSI
    generateRSISeries(candles: Candle[], period: number): (number | null)[] {
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

        rsiSeries[period] = 100 - (100 / (1 + avgGain / (avgLoss === 0 ? 1 : avgLoss)));

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

    calculateBollingerBands(candles: Candle[], i: number, period: number, stdDevMult: number): { upper: number, lower: number, middle: number } | null {
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
}

export const analysisService = new AnalysisService();
