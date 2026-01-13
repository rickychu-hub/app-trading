import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const SettingsPanel: React.FC = () => {
    const [initialCapital, setInitialCapital] = useState('10000');
    const [riskPerTrade, setRiskPerTrade] = useState('2');
    const [maxDailyLoss, setMaxDailyLoss] = useState('500');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        // Upsert settings for a fixed user_id or generic 'default' for now since we don't have full auth context passed down yet
        // Assuming a table 'user_settings' exists with columns: id (or user_id), initial_capital, risk_per_trade, max_daily_loss

        // For MVP, we'll try to insert/update based on a single user assumption if auth is not strictly required by RLS yet,
        // or effectively just log the action if table not ready, but user asked to save to Supabase.

        try {
            const { error } = await supabase.from('user_settings').upsert({
                id: 1, // distinct ID for single user mode
                initial_capital: parseFloat(initialCapital),
                risk_per_trade: parseFloat(riskPerTrade),
                max_daily_loss: parseFloat(maxDailyLoss),
                updated_at: new Date().toISOString()
            });

            if (error) throw error;
            alert('Configuración guardada correctamente.');
        } catch (error: any) {
            console.error('Error saving settings:', error);
            alert(`Error al guardar configuración: ${error.message || 'Error desconocido'}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-[#0b1d16] p-6 rounded-2xl border border-white/5 shadow-xl max-w-2xl mx-auto mt-8">
            <h2 className="text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">
                Configuración de Trading
            </h2>

            <form onSubmit={handleSave} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                        Capital Inicial ($)
                    </label>
                    <input
                        type="number"
                        value={initialCapital}
                        onChange={(e) => setInitialCapital(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                        placeholder="10000"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Riesgo por Trade (%)
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            value={riskPerTrade}
                            onChange={(e) => setRiskPerTrade(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                            placeholder="2.0"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Pérdida Máxima Diaria ($)
                        </label>
                        <input
                            type="number"
                            value={maxDailyLoss}
                            onChange={(e) => setMaxDailyLoss(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                            placeholder="500"
                        />
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className={`w-full py-3 rounded-lg text-black font-bold transition-all ${isSaving ? 'bg-gray-500 cursor-not-allowed' : 'bg-accent hover:bg-accent/90'
                            }`}
                    >
                        {isSaving ? 'Guardando...' : 'Guardar Configuración'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SettingsPanel;
