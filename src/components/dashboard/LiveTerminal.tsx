
import React, { useState, useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const LiveTerminal: React.FC = () => {
    const [logs, setLogs] = useState<string[]>([]);
    const [isActive, setIsActive] = useState(true);
    const endRef = useRef<HTMLDivElement>(null);

    const fetchRealLogs = async () => {
        try {
            // Get last 15 trades (Open or Closed)
            const { data } = await supabase
                .from('paper_trades')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(15);

            if (data) {
                const formattedLogs = data.map(trade => {
                    const time = new Date(trade.created_at || trade.exit_time).toLocaleTimeString();
                    if (trade.status === 'OPEN') {
                        return `[${time}] 💰 BUY EXECUTED: ${trade.ticker} @ $${trade.entry_price.toLocaleString()}`;
                    } else {
                        const pnl = trade.final_pnl || 0;
                        const pnlStr = pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`;
                        return `[${time}] 🛑 SELL EXECUTED: ${trade.ticker} (${trade.close_reason || 'Exit'}) | PnL: ${pnlStr}`;
                    }
                }).reverse();
                setLogs(formattedLogs);
            }
        } catch (e) {
            console.error("Failed to fetch real logs", e);
        }
    };

    useEffect(() => {
        fetchRealLogs();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('paper_trades_logs')
            .on('postgres_changes', { event: '*', table: 'paper_trades', schema: 'public' }, () => {
                fetchRealLogs();
            })
            .subscribe();

        const interval = setInterval(() => {
            setIsActive(prev => !prev);
        }, 3000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
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
                    <div className="h-full flex items-center justify-center text-gray-500 text-xs text-center px-4 italic">
                        "Sistema listo. Esperando primera operación manual o automática"
                    </div>
                ) : (
                    logs.map((log, i) => {
                        const isBuy = log.includes('BUY EXECUTED');
                        return (
                            <div key={i} className={`tracking-wide animate-fade-in ${isBuy ? 'text-[#39ff14] font-bold drop-shadow-[0_0_5px_rgba(57,255,20,0.5)]' : 'text-green-400/90'}`}>
                                <span className="text-gray-600 mr-2">{log.split(']')[0]}]</span>
                                <span className={isBuy ? 'text-[#39ff14]' : 'text-gray-300'}>{log.split(']')[1]}</span>
                            </div>
                        );
                    })
                )}
                <div ref={endRef} />
            </div>
        </div>
    );
};

export default LiveTerminal;
