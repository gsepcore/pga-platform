/**
 * AnomalyDetector — Coordinated Pattern & Fraud Detection
 *
 * Detects collective anomalies that individual message scanning (C3/C4)
 * cannot catch. Looks at patterns ACROSS messages, not within them.
 *
 * Example: 15 identical messages from different users in 20 minutes
 * = coordinated attack. Each message alone looks harmless.
 *
 * Detection types:
 * 1. Duplicate flood — many identical/near-identical messages
 * 2. Velocity spike — sudden spike in message volume
 * 3. Pattern coordination — same structure, different content
 * 4. Account age clustering — new accounts sending similar messages
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-26
 */

// ─── Types ──────────────────────────────────────────────

export type AnomalyType = 'duplicate-flood' | 'velocity-spike' | 'pattern-coordination' | 'suspicious-burst';

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Anomaly {
    type: AnomalyType;
    severity: AnomalySeverity;
    description: string;
    timestamp: Date;
    messageCount: number;
    uniqueUsers: number;
    sampleMessages: string[];
    suggestedAction: 'monitor' | 'throttle' | 'block' | 'escalate';
}

export interface AnomalyDetectorConfig {
    /** Time window in ms for detecting patterns (default: 5 minutes) */
    windowMs?: number;

    /** Min identical messages to trigger duplicate flood (default: 5) */
    duplicateThreshold?: number;

    /** Min messages per minute to trigger velocity spike (default: 30) */
    velocityThreshold?: number;

    /** Similarity threshold for near-duplicate detection 0-1 (default: 0.85) */
    similarityThreshold?: number;

    /** Max messages to keep in rolling window (default: 500) */
    maxWindowSize?: number;
}

export interface AnomalyAnalytics {
    totalAnalyzed: number;
    anomaliesDetected: number;
    byType: Record<AnomalyType, number>;
    lastAnomaly: Anomaly | null;
}

// ─── Implementation ─────────────────────────────────────

interface MessageRecord {
    content: string;
    contentHash: string;
    userId?: string;
    timestamp: Date;
}

export class AnomalyDetector {
    private config: Required<AnomalyDetectorConfig>;
    private messages: MessageRecord[] = [];
    private anomalyHistory: Anomaly[] = [];
    private analytics: AnomalyAnalytics = {
        totalAnalyzed: 0,
        anomaliesDetected: 0,
        byType: {
            'duplicate-flood': 0,
            'velocity-spike': 0,
            'pattern-coordination': 0,
            'suspicious-burst': 0,
        },
        lastAnomaly: null,
    };

    constructor(config: AnomalyDetectorConfig = {}) {
        this.config = {
            windowMs: config.windowMs ?? 5 * 60 * 1000, // 5 minutes
            duplicateThreshold: config.duplicateThreshold ?? 5,
            velocityThreshold: config.velocityThreshold ?? 30,
            similarityThreshold: config.similarityThreshold ?? 0.85,
            maxWindowSize: config.maxWindowSize ?? 500,
        };
    }

    /**
     * Record a message and check for anomalies.
     * Returns detected anomalies (empty array if none).
     *
     * @param batchSize — when the upstream framework batches multiple
     *   identical messages into one call, pass the real count so
     *   flood/velocity detection still works correctly.
     */
    analyze(message: string, userId?: string, batchSize: number = 1): Anomaly[] {
        const count = Math.max(1, Math.round(batchSize));
        this.analytics.totalAnalyzed += count;

        const now = new Date();
        const record: MessageRecord = {
            content: message,
            contentHash: this.hashContent(message),
            userId,
            timestamp: now,
        };

        // Insert one record per batched message so window counts are accurate
        for (let i = 0; i < count; i++) {
            this.messages.push(record);
        }
        this.pruneOldMessages(now);

        const anomalies: Anomaly[] = [];

        // Check each detection type
        const duplicateFlood = this.detectDuplicateFlood(record, now);
        if (duplicateFlood) anomalies.push(duplicateFlood);

        const velocitySpike = this.detectVelocitySpike(now);
        if (velocitySpike) anomalies.push(velocitySpike);

        const burst = this.detectSuspiciousBurst(now);
        if (burst) anomalies.push(burst);

        // Record anomalies
        for (const anomaly of anomalies) {
            this.anomalyHistory.push(anomaly);
            this.analytics.anomaliesDetected++;
            this.analytics.byType[anomaly.type]++;
            this.analytics.lastAnomaly = anomaly;
        }

        return anomalies;
    }

    /**
     * Get analytics for dashboard/reporting.
     */
    getAnalytics(): AnomalyAnalytics {
        return { ...this.analytics };
    }

    /**
     * Get recent anomaly history.
     */
    getHistory(limit: number = 20): Anomaly[] {
        return this.anomalyHistory.slice(-limit);
    }

    // ─── Detection: Duplicate Flood ─────────────────────────

    private detectDuplicateFlood(current: MessageRecord, now: Date): Anomaly | null {
        const windowStart = new Date(now.getTime() - this.config.windowMs);
        const recentMessages = this.messages.filter(m => m.timestamp >= windowStart);

        // Count exact and near duplicates
        let exactDupes = 0;
        const uniqueUsers = new Set<string>();

        for (const msg of recentMessages) {
            if (msg.contentHash === current.contentHash ||
                this.similarity(msg.content, current.content) >= this.config.similarityThreshold) {
                exactDupes++;
                if (msg.userId) uniqueUsers.add(msg.userId);
            }
        }

        if (exactDupes >= this.config.duplicateThreshold) {
            const severity: AnomalySeverity = exactDupes >= 20 ? 'critical'
                : exactDupes >= 10 ? 'high'
                : exactDupes >= 7 ? 'medium'
                : 'low';

            return {
                type: 'duplicate-flood',
                severity,
                description: `${exactDupes} identical/similar messages detected in ${Math.round(this.config.windowMs / 60000)} minutes from ${uniqueUsers.size} users`,
                timestamp: now,
                messageCount: exactDupes,
                uniqueUsers: uniqueUsers.size,
                sampleMessages: [current.content.substring(0, 100)],
                suggestedAction: severity === 'critical' ? 'block'
                    : severity === 'high' ? 'escalate'
                    : 'throttle',
            };
        }

        return null;
    }

    // ─── Detection: Velocity Spike ──────────────────────────

    private detectVelocitySpike(now: Date): Anomaly | null {
        const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
        const lastMinute = this.messages.filter(m => m.timestamp >= oneMinuteAgo);
        const rate = lastMinute.length;

        if (rate >= this.config.velocityThreshold) {
            const uniqueUsers = new Set(lastMinute.filter(m => m.userId).map(m => m.userId!));

            const severity: AnomalySeverity = rate >= 100 ? 'critical'
                : rate >= 60 ? 'high'
                : rate >= 40 ? 'medium'
                : 'low';

            return {
                type: 'velocity-spike',
                severity,
                description: `${rate} messages/minute detected (threshold: ${this.config.velocityThreshold}). ${uniqueUsers.size} unique users.`,
                timestamp: now,
                messageCount: rate,
                uniqueUsers: uniqueUsers.size,
                sampleMessages: lastMinute.slice(-3).map(m => m.content.substring(0, 100)),
                suggestedAction: severity === 'critical' ? 'block' : 'throttle',
            };
        }

        return null;
    }

    // ─── Detection: Suspicious Burst ────────────────────────

    private detectSuspiciousBurst(now: Date): Anomaly | null {
        const windowStart = new Date(now.getTime() - this.config.windowMs);
        const recentMessages = this.messages.filter(m => m.timestamp >= windowStart);

        if (recentMessages.length < 10) return null;

        // Check if many messages have similar structure (same length ± 20%)
        const lengths = recentMessages.map(m => m.content.length);
        const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
        const similarLength = lengths.filter(
            l => Math.abs(l - avgLength) / avgLength < 0.2,
        ).length;

        const similarityRatio = similarLength / recentMessages.length;

        if (similarityRatio > 0.7 && recentMessages.length >= 10) {
            const uniqueUsers = new Set(recentMessages.filter(m => m.userId).map(m => m.userId!));

            // Only flag if multiple users (coordinated) and messages aren't identical (that's duplicate-flood)
            const uniqueHashes = new Set(recentMessages.map(m => m.contentHash));
            if (uniqueUsers.size >= 3 && uniqueHashes.size > 2) {
                return {
                    type: 'suspicious-burst',
                    severity: 'medium',
                    description: `${recentMessages.length} messages with similar structure (${Math.round(similarityRatio * 100)}% length similarity) from ${uniqueUsers.size} users`,
                    timestamp: now,
                    messageCount: recentMessages.length,
                    uniqueUsers: uniqueUsers.size,
                    sampleMessages: recentMessages.slice(-3).map(m => m.content.substring(0, 100)),
                    suggestedAction: 'monitor',
                };
            }
        }

        return null;
    }

    // ─── Helpers ────────────────────────────────────────────

    private hashContent(content: string): string {
        // Simple hash for fast comparison (not cryptographic)
        const normalized = content.toLowerCase().trim().replace(/\s+/g, ' ');
        let hash = 0;
        for (let i = 0; i < normalized.length; i++) {
            const char = normalized.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    private similarity(a: string, b: string): number {
        if (a === b) return 1;
        const aLower = a.toLowerCase().trim();
        const bLower = b.toLowerCase().trim();
        if (aLower === bLower) return 1;

        // Jaccard similarity on words
        const aWords = new Set(aLower.split(/\s+/));
        const bWords = new Set(bLower.split(/\s+/));

        let intersection = 0;
        for (const word of aWords) {
            if (bWords.has(word)) intersection++;
        }

        const union = aWords.size + bWords.size - intersection;
        return union > 0 ? intersection / union : 0;
    }

    private pruneOldMessages(now: Date): void {
        // Remove messages outside the window
        const cutoff = new Date(now.getTime() - this.config.windowMs);
        this.messages = this.messages.filter(m => m.timestamp >= cutoff);

        // Cap total size
        if (this.messages.length > this.config.maxWindowSize) {
            this.messages = this.messages.slice(-this.config.maxWindowSize);
        }

        // Cap anomaly history
        if (this.anomalyHistory.length > 100) {
            this.anomalyHistory = this.anomalyHistory.slice(-100);
        }
    }
}
