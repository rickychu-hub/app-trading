
import React, { useState, useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

const LiveTerminal: React.FC = () => {
    const [logs, setLogs] = useState<string[]>([]);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Mock Logs for visual effect since we don't have real-time websocket logs from worker yet
        const mockMessages = [
            "Initializing Neural Core...",
            "Connecting to Binance API v3...",
            "ExchangeAPI: Connection Established.",
            "RiskManager: Checking Daily PnL...",
            "NewsAuditor: Scanning RSS Feeds...",
            "Scanner: BTCUSDT RSI 45.2 (Neutral)",
            "Scanner: ETHUSDT RSI 32.1 (Approaching Oversold)",
            "Worker: Cycle Complete. Sleeping 60s..."
        ];

        let i = 0;
        const interval = setInterval(() => {
            const timestamp = new Date().toLocaleTimeString();
            const msg = mockMessages[Math.floor(Math.random() * mockMessages.length)];
            setLogs(prev => [...prev.slice(-30), `[${timestamp}] ${msg}`]);
            i++;
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className="glass-panel rounded-xl border border-white/10 p-4 h-full flex flex-col bg-[#050a08]">
            <h3 className="text-sm font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                <Terminal size={14} /> System Logs
            </h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[10px] space-y-1 p-2">
                {logs.map((log, i) => (
                    <div key={i} className="text-green-500/80 tracking-wide">
                        <span className="text-gray-600 mr-2">{log.split(']')[0]}]</span>
                        {log.split(']')[1]}
                    </div>
                ))}
                <div ref={endRef} />
            </div>
        </div>
    );
};

export default LiveTerminal;
