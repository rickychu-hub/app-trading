
import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Activity } from 'lucide-react';

const LiveTerminal: React.FC = () => {
    const [logs, setLogs] = useState<string[]>([]);
    const [isActive, setIsActive] = useState(true);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Critical events only - filter out noise
        const criticalEvents = [
            "💰 BUY EXECUTED: ETHUSDT @ $2,450.00",
            "🛑 SELL EXECUTED: BTCUSDT (Trailing Stop Hit)",
            "🐻 Bearish Trend Detected: Market Cooling",
            "🐂 Bullish Trend Confirmed: BTC Rising",
            "🛡️ Stop Loss Triggered: SOLUSDT -2.5%",
            "⚠️ Risk Limit Reached: Trading Paused",
            "✅ Trade Closed: +$125.50 Profit",
            "👑 BTC Dumping: All Buys Frozen"
        ];

        const interval = setInterval(() => {
            // Simulate critical events (in production, this would come from WebSocket/API)
            if (Math.random() > 0.7) { // 30% chance of event
                const timestamp = new Date().toLocaleTimeString();
                const event = criticalEvents[Math.floor(Math.random() * criticalEvents.length)];
                setLogs(prev => [...prev.slice(-15), `[${timestamp}] ${event}`]); // Keep last 15 events
            }

            // Toggle activity indicator
            setIsActive(prev => !prev);
        }, 4000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className="glass-panel rounded-xl border border-white/10 p-4 h-full flex flex-col bg-[#050a08]">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-500 uppercase flex items-center gap-2">
                    <Terminal size={14} /> System Logs
                </h3>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-600">Sistema:</span>
                    <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-green-500/50'} transition-all duration-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]`}></span>
                        <span className="text-[10px] text-green-500 font-medium">Trabajando...</span>
                    </div>
                </div>
            </div>

            {/* Fixed height container with scroll */}
            <div className="h-[300px] overflow-y-auto custom-scrollbar font-mono text-[10px] space-y-1.5 p-2">
                {logs.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-600 text-xs">
                        <Activity size={16} className="mr-2 animate-pulse" />
                        Esperando eventos críticos...
                    </div>
                ) : (
                    logs.map((log, i) => (
                        <div key={i} className="text-green-400/90 tracking-wide animate-fade-in">
                            <span className="text-gray-600 mr-2">{log.split(']')[0]}]</span>
                            <span className="text-gray-300">{log.split(']')[1]}</span>
                        </div>
                    ))
                )}
                <div ref={endRef} />
            </div>
        </div>
    );
};

export default LiveTerminal;
