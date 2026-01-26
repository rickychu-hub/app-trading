
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DailyData {
    date: string;       // YYYY-MM-DD
    current_balance: number;
    pnl_daily: number;
    status: string;
}

interface Props {
    data: DailyData[];
}

const DailyPerformanceChart: React.FC<Props> = ({ data }) => {
    // Sort data chronologically just in case
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (sortedData.length === 0) {
        return <div className="h-64 flex items-center justify-center text-gray-500 text-sm">Sin datos suficientes para graficar</div>;
    }

    const startBalance = 10000; // Hardcoded base for visual reference or take first element
    const latestBalance = sortedData[sortedData.length - 1].current_balance;
    const isProfitable = latestBalance >= startBalance;

    return (
        <div className="w-full h-[300px] animate-fade-in">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={sortedData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={isProfitable ? "#10B981" : "#EF4444"} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={isProfitable ? "#10B981" : "#EF4444"} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                        dataKey="date"
                        tickFormatter={(str) => format(new Date(str), 'd MMM', { locale: es })}
                        stroke="#6B7280"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        domain={['auto', 'auto']}
                        stroke="#6B7280"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(val) => `$${val.toLocaleString()}`}
                        tickLine={false}
                        axisLine={false}
                        width={60}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', color: '#F3F4F6' }}
                        itemStyle={{ color: '#F3F4F6' }}
                        formatter={(value: number) => [`$${value.toLocaleString()}`, 'Balance Total']}
                        labelFormatter={(label) => format(new Date(label), 'EEEE, d MMMM yyyy', { locale: es })}
                    />
                    <Area
                        type="monotone"
                        dataKey="current_balance"
                        stroke={isProfitable ? "#10B981" : "#EF4444"}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorBalance)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default DailyPerformanceChart;
