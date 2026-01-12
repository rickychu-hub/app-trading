import React, { useMemo } from 'react';
import { BrainCircuit, AlertTriangle, Scale, TrendingUp } from 'lucide-react';

interface Trade {
    id: number;
    ticker: string;
    entry_price: number;
    invested_amount?: number;
    quantity?: number;
    status: string;
}

interface AIPortfolioInsightsProps {
    trades: Trade[];
    currentPrices: Record<string, number>;
}

const AIPortfolioInsights: React.FC<AIPortfolioInsightsProps> = ({ trades, currentPrices }) => {

    const insight = useMemo(() => {
        const activeTrades = trades.filter(t => t.status === 'OPEN');
        if (activeTrades.length === 0) {
            return {
                type: 'neutral',
                message: "Portafolio vacío. Inicia una operación para recibir análisis.",
                icon: <BrainCircuit size={20} className="text-gray-400" />
            };
        }

        let totalInvested = 0;
        let totalCurrentValue = 0;
        let losingTrades = 0;
        let assetValueMap: Record<string, number> = {};

        activeTrades.forEach(t => {
            const invested = t.invested_amount || t.entry_price;
            const currentPrice = currentPrices[t.ticker] || t.entry_price;
            const qty = t.quantity || (t.entry_price > 0 ? invested / t.entry_price : 0);
            const currentValue = currentPrice * qty;

            totalInvested += invested;
            totalCurrentValue += currentValue;

            if (currentValue < invested) {
                losingTrades++;
            }

            assetValueMap[t.ticker] = (assetValueMap[t.ticker] || 0) + currentValue;
        });

        // Rule 1: Risk Alert (Multiple losing trades)
        if (losingTrades >= 3 && losingTrades > activeTrades.length / 2) {
            return {
                type: 'danger',
                message: "⚠️ Alerta de Riesgo: Múltiples posiciones en pérdida detectadas. Considera pausar nuevas compras y revisar stop-losses.",
                icon: <AlertTriangle size={20} className="text-red-400 animate-pulse" />
            };
        }

        // Rule 2: Diversification (Single asset dominance)
        for (const [ticker, value] of Object.entries(assetValueMap)) {
            if (totalCurrentValue > 0 && (value / totalCurrentValue) > 0.5 && activeTrades.length > 1) {
                return {
                    type: 'warning',
                    message: `⚖️ Consejo de Diversificación: Alta exposición a ${ticker} (>50% del portafolio). Sugiero rebalancear.`,
                    icon: <Scale size={20} className="text-yellow-400" />
                };
            }
        }

        // Rule 3: Positive Trend
        const totalPnL = totalCurrentValue - totalInvested;
        if (totalPnL > 0 && losingTrades === 0) {
            return {
                type: 'success',
                message: "🚀 Tendencia Fuerte: Tu estrategia está superando al mercado. Excelente momento para ajustar Stop-Loss hacia arriba (Trailing Stop).",
                icon: <TrendingUp size={20} className="text-green-400" />
            };
        }

        // Default / Neutral Positive
        if (totalPnL > 0) {
            return {
                type: 'success',
                message: "📈 Buen rendimiento general. Mantén la disciplina.",
                icon: <TrendingUp size={20} className="text-green-400" />
            };
        }

        return {
            type: 'neutral',
            message: "🤖 Analizando mercado... Mantén la cautela en condiciones volátiles.",
            icon: <BrainCircuit size={20} className="text-gray-400" />
        };

    }, [trades, currentPrices]);

    const getBorderColor = () => {
        switch (insight.type) {
            case 'danger': return 'border-red-500/50 bg-red-500/5';
            case 'warning': return 'border-yellow-500/50 bg-yellow-500/5';
            case 'success': return 'border-green-500/50 bg-green-500/5';
            default: return 'border-accent/30 bg-accent/5';
        }
    };

    return (
        <div className={`rounded-xl p-4 border ${getBorderColor()} backdrop-blur-sm shadow-lg transition-all duration-500 animate-fade-in`}>
            <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-black/40 border border-white/5 shadow-inner">
                    {insight.icon}
                </div>
                <div>
                    <h4 className="text-xs uppercase tracking-wider font-bold text-gray-400 mb-1 flex items-center gap-1">
                        AI Portfolio Analyst
                    </h4>
                    <p className="text-sm font-medium text-gray-200 leading-relaxed">
                        {insight.message}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AIPortfolioInsights;
