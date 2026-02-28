/**
 * Alert Webhooks System
 *
 * Send alerts to external services (Slack, Discord, Email, etc.)
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-02-28
 */

import type { Alert } from './MetricsCollector.js';

export interface WebhookConfig {
    /**
     * Webhook URL
     */
    url: string;

    /**
     * Webhook type
     */
    type: 'slack' | 'discord' | 'generic' | 'email';

    /**
     * Minimum severity to trigger
     */
    minSeverity?: 'low' | 'medium' | 'high' | 'critical';

    /**
     * Custom headers
     */
    headers?: Record<string, string>;

    /**
     * Retry configuration
     */
    retry?: {
        maxRetries: number;
        delayMs: number;
    };
}

export interface SlackPayload {
    text?: string;
    blocks?: Array<{
        type: string;
        text?: {
            type: string;
            text: string;
        };
        fields?: Array<{
            type: string;
            text: string;
        }>;
    }>;
}

export interface DiscordPayload {
    content?: string;
    embeds?: Array<{
        title?: string;
        description?: string;
        color?: number;
        fields?: Array<{
            name: string;
            value: string;
            inline?: boolean;
        }>;
        timestamp?: string;
    }>;
}

/**
 * Alert Webhooks Manager
 *
 * Sends alerts to configured webhooks
 */
export class AlertWebhooks {
    private webhooks: WebhookConfig[] = [];
    private sentAlerts: Set<string> = new Set();

    /**
     * Add a webhook
     */
    addWebhook(config: WebhookConfig): void {
        this.webhooks.push(config);
    }

    /**
     * Remove all webhooks
     */
    clearWebhooks(): void {
        this.webhooks = [];
    }

    /**
     * Send alert to all configured webhooks
     */
    async sendAlert(alert: Alert): Promise<void> {
        // Deduplicate: don't send same alert multiple times
        if (this.sentAlerts.has(alert.id)) {
            return;
        }

        const promises = this.webhooks
            .filter(webhook => this.shouldSend(alert, webhook))
            .map(webhook => this.sendToWebhook(alert, webhook));

        await Promise.allSettled(promises);

        this.sentAlerts.add(alert.id);
    }

    /**
     * Check if alert should be sent to webhook
     */
    private shouldSend(alert: Alert, webhook: WebhookConfig): boolean {
        if (!webhook.minSeverity) return true;

        const severityLevels = ['low', 'medium', 'high', 'critical'];
        const alertLevel = severityLevels.indexOf(alert.severity);
        const minLevel = severityLevels.indexOf(webhook.minSeverity);

        return alertLevel >= minLevel;
    }

    /**
     * Send alert to a specific webhook
     */
    private async sendToWebhook(
        alert: Alert,
        webhook: WebhookConfig
    ): Promise<void> {
        const maxRetries = webhook.retry?.maxRetries ?? 3;
        const delayMs = webhook.retry?.delayMs ?? 1000;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const payload = this.formatPayload(alert, webhook.type);
                const headers = {
                    'Content-Type': 'application/json',
                    ...webhook.headers,
                };

                const response = await fetch(webhook.url, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
                }

                return; // Success
            } catch (error) {
                if (attempt < maxRetries) {
                    await this.sleep(delayMs * Math.pow(2, attempt));
                } else {
                    console.error(`Failed to send webhook after ${maxRetries} retries:`, error);
                    throw error;
                }
            }
        }
    }

    /**
     * Format payload for webhook type
     */
    private formatPayload(
        alert: Alert,
        type: WebhookConfig['type']
    ): SlackPayload | DiscordPayload | Record<string, any> {
        switch (type) {
            case 'slack':
                return this.formatSlackPayload(alert);
            case 'discord':
                return this.formatDiscordPayload(alert);
            case 'email':
                return this.formatEmailPayload(alert);
            default:
                return this.formatGenericPayload(alert);
        }
    }

    /**
     * Format Slack payload
     */
    private formatSlackPayload(alert: Alert): SlackPayload {
        const emoji = this.getSeverityEmoji(alert.severity);

        return {
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: `${emoji} ${alert.title}`,
                    },
                },
                {
                    type: 'section',
                    fields: [
                        {
                            type: 'mrkdwn',
                            text: `*Severity:*\n${alert.severity.toUpperCase()}`,
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Type:*\n${alert.type}`,
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Timestamp:*\n${alert.timestamp.toISOString()}`,
                        },
                    ],
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*Description:*\n${alert.description}`,
                    },
                },
            ],
        };
    }

    /**
     * Format Discord payload
     */
    private formatDiscordPayload(alert: Alert): DiscordPayload {
        const color = this.getDiscordColor(alert.severity);

        return {
            embeds: [
                {
                    title: `${this.getSeverityEmoji(alert.severity)} ${alert.title}`,
                    description: alert.description,
                    color,
                    fields: [
                        {
                            name: 'Severity',
                            value: alert.severity.toUpperCase(),
                            inline: true,
                        },
                        {
                            name: 'Type',
                            value: alert.type,
                            inline: true,
                        },
                    ],
                    timestamp: alert.timestamp.toISOString(),
                },
            ],
        };
    }

    /**
     * Format Email payload
     */
    private formatEmailPayload(alert: Alert): Record<string, any> {
        return {
            subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
            text: `
Alert: ${alert.title}
Severity: ${alert.severity.toUpperCase()}
Type: ${alert.type}
Time: ${alert.timestamp.toISOString()}

Description:
${alert.description}

${alert.metrics ? `Metrics: ${JSON.stringify(alert.metrics, null, 2)}` : ''}
            `.trim(),
            html: `
<h2>${alert.title}</h2>
<p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
<p><strong>Type:</strong> ${alert.type}</p>
<p><strong>Time:</strong> ${alert.timestamp.toISOString()}</p>
<h3>Description:</h3>
<p>${alert.description}</p>
${alert.metrics ? `<h3>Metrics:</h3><pre>${JSON.stringify(alert.metrics, null, 2)}</pre>` : ''}
            `.trim(),
        };
    }

    /**
     * Format generic payload
     */
    private formatGenericPayload(alert: Alert): Record<string, any> {
        return {
            alert: {
                id: alert.id,
                title: alert.title,
                description: alert.description,
                severity: alert.severity,
                type: alert.type,
                timestamp: alert.timestamp.toISOString(),
                resolved: alert.resolved,
                metrics: alert.metrics,
            },
        };
    }

    /**
     * Get emoji for severity
     */
    private getSeverityEmoji(severity: Alert['severity']): string {
        switch (severity) {
            case 'low':
                return 'ℹ️';
            case 'medium':
                return '⚠️';
            case 'high':
                return '🚨';
            case 'critical':
                return '🔥';
            default:
                return '❓';
        }
    }

    /**
     * Get color for severity (Discord)
     */
    private getDiscordColor(severity: Alert['severity']): number {
        switch (severity) {
            case 'low':
                return 0x36a64f; // Green
            case 'medium':
                return 0xff9900; // Orange
            case 'high':
                return 0xff6600; // Red-orange
            case 'critical':
                return 0xff0000; // Red
            default:
                return 0xcccccc; // Gray
        }
    }

    /**
     * Sleep helper
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
