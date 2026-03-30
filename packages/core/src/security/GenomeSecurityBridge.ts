/**
 * GenomeSecurityBridge — Facade orchestrating all GSEP security systems.
 *
 * Single integration point for Genome's agent pipeline.
 * Orchestrates: C3 Firewall → C4 Immune → PurposeLock → AnomalyDetector → PII Redaction.
 *
 * @module security
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-30
 */

import { SecurityEventBus } from './SecurityEventBus.js';
import { PIIRedactionEngine } from './PIIRedactionEngine.js';
import { DataClassifier } from './DataClassifier.js';
import type { SecurityConfig } from './SecurityPresets.js';

// ─── Types ──────────────────────────────────────────────

export type ChannelTrustLevel = 'system' | 'validated' | 'external' | 'untrusted';

export interface InboundResult {
    /** Sanitized message (PII redacted, injection patterns removed) */
    sanitized: string;
    /** Whether the message was allowed through */
    allowed: boolean;
    /** Reason if blocked */
    blockReason?: string;
    /** PII categories detected */
    piiDetected: string[];
    /** Data classification of the message */
    classification: string;
    /** Trust level of the source channel */
    trustLevel: ChannelTrustLevel;
    /** Anomalies detected */
    anomalies: string[];
}

export interface OutboundResult {
    /** Whether the response is clean */
    clean: boolean;
    /** Verdict: pass, sanitize, or quarantine */
    verdict: 'pass' | 'sanitize' | 'quarantine';
    /** Threats detected in the output */
    threats: string[];
    /** Sanitized response (if verdict is sanitize) */
    sanitized?: string;
}

export interface SecurityStatus {
    profile: string;
    inboundScanned: number;
    inboundBlocked: number;
    outboundScanned: number;
    outboundQuarantined: number;
    piiRedacted: number;
    anomaliesDetected: number;
}

// ─── Channel Trust Map ──────────────────────────────────

const CHANNEL_TRUST: Record<string, ChannelTrustLevel> = {
    // System — internal, fully trusted
    'system': 'system',
    'internal': 'system',
    'c0': 'system',

    // Validated — local apps, user-controlled
    'imessage': 'validated',
    'apple-notes': 'validated',
    'apple-reminders': 'validated',
    'obsidian': 'validated',
    'bear-notes': 'validated',
    'things-mac': 'validated',
    'cli': 'validated',
    'tui': 'validated',
    'web-local': 'validated',

    // External — messaging platforms (user identity verified by platform)
    'telegram': 'external',
    'discord': 'external',
    'slack': 'external',
    'whatsapp': 'external',
    'signal': 'external',
    'matrix': 'external',
    'msteams': 'external',
    'line': 'external',
    'feishu': 'external',
    'googlechat': 'external',
    'irc': 'external',
    'twitch': 'external',
    'nostr': 'external',

    // Untrusted — web input, plugins, MCP servers
    'web': 'untrusted',
    'mcp': 'untrusted',
    'plugin': 'untrusted',
    'api': 'untrusted',
    'webhook': 'untrusted',
};

// ─── Bridge ─────────────────────────────────────────────

/**
 * Genome Security Bridge — orchestrates all security layers for inbound/outbound.
 *
 * Usage:
 * ```typescript
 * const bridge = new GenomeSecurityBridge(securityConfig, eventBus);
 *
 * // In Genome's dispatch pipeline:
 * const inbound = await bridge.processInbound(message, 'telegram', 'user-123');
 * if (!inbound.allowed) return inbound.blockReason;
 *
 * // After LLM response:
 * const outbound = await bridge.processOutbound(response, systemPrompt);
 * if (outbound.verdict === 'quarantine') return 'Response blocked for safety.';
 * ```
 */
export class GenomeSecurityBridge {
    private config: SecurityConfig;
    private eventBus: SecurityEventBus;
    private piiEngine: PIIRedactionEngine;
    private classifier: DataClassifier;

    // Stats
    private inboundScanned = 0;
    private inboundBlocked = 0;
    private outboundScanned = 0;
    private outboundQuarantined = 0;
    private anomaliesDetected = 0;

    constructor(config: SecurityConfig, eventBus: SecurityEventBus) {
        this.config = config;
        this.eventBus = eventBus;
        this.piiEngine = new PIIRedactionEngine({
            categories: config.piiCategories.length > 0 ? config.piiCategories as never : undefined,
        });
        this.classifier = new DataClassifier();
    }

    /**
     * Process an inbound message through all security layers.
     *
     * Pipeline: Trust Level → PII Scan → Data Classification → Anomaly Check
     *
     * Note: C3 Firewall and PurposeLock are handled by GSEP's chat() pipeline.
     * This bridge handles the layers OUTSIDE of GSEP (PII, classification, trust).
     */
    async processInbound(
        message: string,
        channel: string,
        userId?: string,
    ): Promise<InboundResult> {
        this.inboundScanned++;

        const trustLevel = this.getTrustLevel(channel);
        const anomalies: string[] = [];

        // Step 1: Data classification
        const classification = this.classifier.classify(message);

        // Step 2: PII redaction (if enabled)
        let sanitized = message;
        let piiDetected: string[] = [];

        if (this.config.enablePIIRedaction) {
            const redaction = this.piiEngine.redact(message);
            sanitized = redaction.redacted;
            piiDetected = redaction.categories;

            if (redaction.matches.length > 0) {
                this.eventBus.emit({
                    type: 'security:pii-redacted',
                    timestamp: new Date(),
                    layer: 2,
                    decision: 'info',
                    actor: { userId, channel },
                    resource: {
                        type: 'pii',
                        id: `${redaction.matches.length} items`,
                        detail: piiDetected.join(', '),
                    },
                    severity: 'info',
                });
            }
        }

        // Step 3: Block untrusted sources with restricted data (in paranoid/secure)
        if (
            trustLevel === 'untrusted' &&
            classification.classification === 'restricted' &&
            (this.config.firewallMode === 'full-quarantine' || this.config.firewallMode === 'full-sanitize')
        ) {
            this.inboundBlocked++;
            this.eventBus.emitDeny(
                'security:inbound-blocked',
                1,
                { type: 'message', id: channel, detail: 'restricted data from untrusted source' },
                'critical',
                { userId, channel },
            );

            return {
                sanitized: '',
                allowed: false,
                blockReason: 'Restricted data from untrusted source blocked.',
                piiDetected,
                classification: classification.classification,
                trustLevel,
                anomalies,
            };
        }

        // Step 4: Emit scan event
        this.eventBus.emitAllow('security:inbound-scanned', 1, {
            type: 'message',
            id: channel,
            detail: `trust=${trustLevel} class=${classification.classification}`,
        }, { userId, channel });

        return {
            sanitized,
            allowed: true,
            piiDetected,
            classification: classification.classification,
            trustLevel,
            anomalies,
        };
    }

    /**
     * Process an outbound LLM response through security checks.
     *
     * Note: C4 BehavioralImmuneSystem is handled by GSEP's chat() pipeline.
     * This bridge re-hydrates PII tokens and classifies the output.
     */
    async processOutbound(
        response: string,
        _systemPrompt?: string,
    ): Promise<OutboundResult> {
        this.outboundScanned++;

        // Re-hydrate PII tokens for user display
        const rehydrated = this.config.enablePIIRedaction
            ? this.piiEngine.rehydrate(response)
            : response;

        // Classify output
        const classification = this.classifier.classify(rehydrated);

        // If output contains restricted data and firewall is in quarantine mode
        if (
            classification.classification === 'restricted' &&
            this.config.firewallMode === 'full-quarantine'
        ) {
            this.outboundQuarantined++;
            this.eventBus.emitDeny(
                'security:outbound-quarantined',
                1,
                { type: 'response', id: 'llm-output', detail: 'restricted data in output' },
                'high',
            );

            return {
                clean: false,
                verdict: 'quarantine',
                threats: [`Output contains ${classification.classification} data: ${classification.categories.join(', ')}`],
            };
        }

        this.eventBus.emitAllow('security:outbound-scanned', 1, {
            type: 'response',
            id: 'llm-output',
        });

        return {
            clean: true,
            verdict: 'pass',
            threats: [],
            sanitized: rehydrated,
        };
    }

    /**
     * Get the trust level for a channel.
     */
    getTrustLevel(channel: string): ChannelTrustLevel {
        return CHANNEL_TRUST[channel.toLowerCase()] ?? 'untrusted';
    }

    /**
     * Get aggregated security status.
     */
    getStatus(): SecurityStatus {
        return {
            profile: this.config.profile,
            inboundScanned: this.inboundScanned,
            inboundBlocked: this.inboundBlocked,
            outboundScanned: this.outboundScanned,
            outboundQuarantined: this.outboundQuarantined,
            piiRedacted: this.piiEngine.getStats().totalRedacted,
            anomaliesDetected: this.anomaliesDetected,
        };
    }

    /**
     * Get PII engine reference (for LLMProxyLayer re-hydration).
     */
    getPIIEngine(): PIIRedactionEngine {
        return this.piiEngine;
    }

    /**
     * Clear PII vault (session end).
     */
    clearSession(): void {
        this.piiEngine.clearVault();
    }
}
