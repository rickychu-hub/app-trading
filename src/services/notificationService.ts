export interface AlertPayload {
    event: string;
    message?: string;
    [key: string]: any;
}

class NotificationService {
    private webhookUrl: string | undefined;

    constructor() {
        this.webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
    }

    async sendAlert(payload: AlertPayload) {
        const data = {
            ...payload,
            timestamp: new Date().toISOString(),
            source: 'InvIntel-Hub'
        };

        if (this.webhookUrl) {
            try {
                // Using no-cors mode might be needed if n8n doesn't send CORS headers, 
                // but usually for webhooks we want to know if it failed.
                // However, browsers block cross-origin POSTs without CORS.
                // We'll try standard POST. If it fails due to CORS, user might need a proxy or backend.
                // For now, simple fetch.
                await fetch(this.webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                console.log('Alert sent to webhook:', data);
            } catch (error) {
                console.error('Failed to send alert to webhook:', error);
            }
        } else {
            console.log('Mock Alert (No Webhook URL configured):', data);
        }
    }
}

export const notificationService = new NotificationService();
