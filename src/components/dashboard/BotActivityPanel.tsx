import React, { useRef, useEffect } from 'react';
import { ScrollText } from 'lucide-react';
import { useBotStore } from '../../store/botStore';

const BotActivityPanel: React.FC = () => {
    const { logs } = useBotStore();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="glass-panel rounded-2xl p-6 border border-white/10 h-[300px] flex flex-col">
            <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                <ScrollText className="text-accent" size={18} />
                Actividad del Bot <span className="text-xs text-gray-500 font-normal">(Live Logs)</span>
            </h3>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-white/10"
            >
                {logs.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center italic mt-10">Esperando cierre de vela para análisis...</p>
                ) : (
                    logs.map((log) => (
                        <div key={log.id} className="text-xs flex items-center gap-3 p-2 rounded bg-white/5 border border-white/5">
                            <span className="text-gray-500 font-mono">{log.timestamp}</span>
                            <span className="font-bold text-white w-16">{log.ticker}</span>

                            <div className="flex-1 flex items-center gap-4">
                                {/* Humanized Message Container */}
                                <span className="text-gray-300 font-medium text-xs flex-1">
                                    {log.decision === 'BUY' ? (
                                        <span className="text-green-400">🚀 ¡Oportunidad! {log.ticker} muestra fuerza de compra.</span>
                                    ) : log.decision === 'SELL' ? (
                                        <span className="text-red-400">💰 Cerrando {log.ticker}. Asegurando beneficios.</span>
                                    ) : log.rsi > 65 ? (
                                        <span>👀 {log.ticker} está caliente (RSI Alto). Atento...</span>
                                    ) : log.rsi < 35 ? (
                                        <span>💎 {log.ticker} en zona de rebote. Buscando entrada...</span>
                                    ) : (
                                        <span className="opacity-70">🤖 Escaneando {log.ticker}... Mercado tranquilo.</span>
                                    )}
                                </span>

                                <span className={`flex items-center gap-1 font-bold ${log.decision === 'BUY' ? 'text-green-400' :
                                    log.decision === 'SELL' ? 'text-red-400' :
                                        'text-gray-500'
                                    }`}>
                                    {log.decision}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default BotActivityPanel;
