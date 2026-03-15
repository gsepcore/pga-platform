/**
 * ContentFirewall — C3 Content Security Engine
 *
 * Scans, sanitizes, and tags ALL external content before it enters the
 * system prompt. Implements defense-in-depth with three mechanisms:
 *
 * 1. Content Tagging (Spotlighting-inspired trust delimiters)
 * 2. Pattern Detection (50+ regex patterns + structural analysis)
 * 3. Trust Registry (CaMeL-inspired per-source trust levels)
 *
 * Core detection patterns are cryptographically immutable (SHA-256).
 * Learned patterns can evolve to catch new attack signatures.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026
 */

import { createHash } from 'crypto';
import type {
    Chromosome3,
    FirewallPattern,
    FirewallResult,
    FirewallDetection,
    FirewallAnalytics,
    ContentSource,
    TrustLevel,
    TrustPolicy,
    ThreatCategory,
} from '../types/GenomeV2.js';
import {
    CORE_PATTERNS,
    ALL_DEFAULT_PATTERNS,
    DEFAULT_TRUST_POLICIES,
    DEFAULT_SANITIZATION_RULES,
    DEFAULT_CONTENT_TAGGING,
    CONTENT_TRUST_PREAMBLE,
} from './DefaultPatterns.js';

// ─── Compiled Pattern Cache ─────────────────────────────────

interface CompiledPattern {
    pattern: FirewallPattern;
    regex: RegExp;
}

// ─── ContentFirewall Class ──────────────────────────────────

export class ContentFirewall {
    private c3: Chromosome3;
    private compiledPatterns: CompiledPattern[] = [];
    private trustPolicyMap: Map<ContentSource, TrustPolicy> = new Map();

    // Analytics tracking
    private totalScanned = 0;
    private totalBlocked = 0;
    private totalSanitized = 0;
    private detectionsByCategory: Map<ThreatCategory, number> = new Map();
    private detectionsBySource: Map<ContentSource, number> = new Map();
    private detectionsByPattern: Map<string, { detections: number; falsePositives: number }> = new Map();

    constructor(c3?: Chromosome3) {
        this.c3 = c3 ?? ContentFirewall.buildDefaultC3();
        this.compilePatterns();
        this.buildTrustPolicyMap();
    }

    // ─── Main Scan Entry Point ──────────────────────────────

    /**
     * Scan content from a given source through the firewall.
     *
     * Returns a FirewallResult indicating whether the content is allowed,
     * the sanitized version, the tagged version, and any detections.
     */
    scan(content: string, source: ContentSource): FirewallResult {
        const startTime = performance.now();
        this.totalScanned++;

        const policy = this.getTrustPolicy(source);
        const trustLevel = policy.trustLevel;

        // SYSTEM trust — pass through without scanning
        if (trustLevel === 'system') {
            return {
                allowed: true,
                sanitizedContent: content,
                taggedContent: policy.tagContent
                    ? this.wrapWithTag(content, source, trustLevel)
                    : content,
                detections: [],
                trustLevel,
                scanDurationMs: performance.now() - startTime,
            };
        }

        // Run pattern detection on ORIGINAL normalized content (before sanitization)
        // This ensures we detect threats even if sanitization would remove them
        const normalizedForDetection = this.normalizeContent(content);
        const detections = this.runPatternDetection(normalizedForDetection, policy.scanLevel);

        // Determine if content is allowed
        const hasBlockingDetection = detections.some(d => d.action === 'block');
        const allowed = !hasBlockingDetection;

        if (!allowed) {
            this.totalBlocked++;
            if (policy.quarantineOnDetection) {
                this.c3.metadata.totalBlocked++;
            }
        }

        // Apply sanitization rules (clean zero-width chars, HTML comments, etc.)
        let sanitized = this.applySanitizationRules(content, trustLevel);

        // Apply sanitization for 'sanitize' action detections
        for (const detection of detections) {
            if (detection.action === 'sanitize') {
                sanitized = sanitized.replace(
                    detection.matchedText,
                    `[SANITIZED: ${detection.category}]`,
                );
                this.totalSanitized++;
            }
        }

        // Record detections for analytics
        for (const detection of detections) {
            this.recordDetectionInternal(detection, source);
        }

        // Build tagged content
        const taggedContent = policy.tagContent
            ? this.wrapWithTag(sanitized, source, trustLevel)
            : sanitized;

        return {
            allowed,
            sanitizedContent: sanitized,
            taggedContent: allowed ? taggedContent : '',
            detections,
            trustLevel,
            scanDurationMs: performance.now() - startTime,
        };
    }

    // ─── Content Tagging ────────────────────────────────────

    /**
     * Wrap content with trust-level delimiters.
     */
    wrapWithTag(content: string, source: ContentSource, trustLevel: TrustLevel): string {
        if (!this.c3.contentTagging.enabled) return content;

        const prefix = this.c3.contentTagging.delimiterPrefix;
        const suffix = this.c3.contentTagging.delimiterSuffix;

        const trustLabel = this.getTrustLabel(trustLevel);
        const sourceLabel = source.toUpperCase().replace(/-/g, '_');

        return `${prefix}${trustLabel}:${sourceLabel}${suffix}\n${content}\n${prefix}END:${sourceLabel}${suffix}`;
    }

    /**
     * Generate the content trust preamble for C0 injection.
     */
    getContentTrustPreamble(): string {
        if (!this.c3.contentTagging.includeInstructionPreamble) return '';
        return CONTENT_TRUST_PREAMBLE;
    }

    // ─── Trust Level Management ─────────────────────────────

    /**
     * Get the trust level for a content source.
     */
    getTrustLevel(source: ContentSource): TrustLevel {
        return this.getTrustPolicy(source).trustLevel;
    }

    /**
     * Get the full trust policy for a content source.
     */
    getTrustPolicy(source: ContentSource): TrustPolicy {
        return this.trustPolicyMap.get(source) ?? {
            source,
            trustLevel: 'untrusted' as TrustLevel,
            scanLevel: 'full' as const,
            tagContent: true,
            quarantineOnDetection: true,
        };
    }

    // ─── Integrity Verification ─────────────────────────────

    /**
     * Verify that core patterns have not been tampered with.
     * Similar to C0 SHA-256 integrity verification.
     */
    verifyIntegrity(): boolean {
        const currentHash = this.computeCorePatternsHash();
        return currentHash === this.c3.integrity.corePatternsHash;
    }

    /**
     * Compute SHA-256 hash of the core (immutable) patterns.
     */
    private computeCorePatternsHash(): string {
        const canonical = this.c3.corePatterns
            .map(p => ({
                id: p.id,
                name: p.name,
                pattern: p.pattern,
                category: p.category,
                severity: p.severity,
                action: p.action,
            }))
            .sort((a, b) => a.id.localeCompare(b.id));

        return createHash('sha256')
            .update(JSON.stringify(canonical))
            .digest('hex');
    }

    // ─── Analytics ──────────────────────────────────────────

    /**
     * Get aggregate firewall analytics.
     */
    getAnalytics(): FirewallAnalytics {
        const topThreats: Array<{ category: ThreatCategory; count: number }> = [];
        for (const [category, count] of this.detectionsByCategory) {
            topThreats.push({ category, count });
        }
        topThreats.sort((a, b) => b.count - a.count);

        const patternEffectiveness: Array<{ patternId: string; detections: number; falsePositives: number }> = [];
        for (const [patternId, stats] of this.detectionsByPattern) {
            patternEffectiveness.push({ patternId, ...stats });
        }

        return {
            totalScanned: this.totalScanned,
            totalBlocked: this.totalBlocked,
            totalSanitized: this.totalSanitized,
            blockRate: this.totalScanned > 0 ? this.totalBlocked / this.totalScanned : 0,
            falsePositiveRate: this.c3.metadata.falsePositiveRate,
            topThreats,
            threatsBySource: new Map(this.detectionsBySource),
            patternEffectiveness,
        };
    }

    // ─── Pattern Detection Engine ───────────────────────────

    /**
     * Run pattern detection on content based on scan level.
     */
    private runPatternDetection(
        normalizedContent: string,
        scanLevel: 'none' | 'structural' | 'full' | 'full+semantic',
    ): FirewallDetection[] {
        if (scanLevel === 'none') return [];

        const detections: FirewallDetection[] = [];

        for (const compiled of this.compiledPatterns) {
            // Structural scan: only check critical/high severity patterns
            if (scanLevel === 'structural' &&
                compiled.pattern.severity !== 'critical' &&
                compiled.pattern.severity !== 'high') {
                continue;
            }

            const matches = normalizedContent.matchAll(new RegExp(compiled.regex.source, compiled.regex.flags));

            for (const match of matches) {
                detections.push({
                    patternId: compiled.pattern.id,
                    patternName: compiled.pattern.name,
                    category: compiled.pattern.category,
                    severity: compiled.pattern.severity,
                    matchedText: match[0].substring(0, 200), // Limit matched text length
                    position: match.index ?? 0,
                    action: compiled.pattern.action,
                    timestamp: new Date(),
                });
            }
        }

        return detections;
    }

    /**
     * Normalize content for consistent pattern matching.
     * - Normalize unicode
     * - Normalize whitespace
     */
    private normalizeContent(content: string): string {
        return content
            .normalize('NFKC')                    // Normalize unicode (e.g., fullwidth chars)
            .replace(/\r\n/g, '\n')               // Normalize line endings
            .replace(/[\t ]+/g, ' ');             // Collapse horizontal whitespace (preserve newlines)
    }

    // ─── Sanitization Engine ────────────────────────────────

    /**
     * Apply sanitization rules matching the trust level.
     */
    private applySanitizationRules(content: string, trustLevel: TrustLevel): string {
        let result = content;

        for (const rule of this.c3.sanitizationRules) {
            if (rule.applyTo.includes(trustLevel)) {
                try {
                    const regex = new RegExp(rule.match, 'gi');
                    result = result.replace(regex, rule.replacement);
                } catch {
                    // Invalid regex in sanitization rule — skip
                }
            }
        }

        return result;
    }

    // ─── Internal Helpers ───────────────────────────────────

    /**
     * Compile all pattern strings into RegExp objects for performance.
     */
    private compilePatterns(): void {
        this.compiledPatterns = [];

        const allPatterns = [...this.c3.corePatterns, ...this.c3.learnedPatterns];

        for (const pattern of allPatterns) {
            try {
                const regex = new RegExp(pattern.pattern, 'gi');
                this.compiledPatterns.push({ pattern, regex });
            } catch {
                // Invalid regex pattern — skip silently
            }
        }
    }

    /**
     * Build trust policy lookup map for O(1) access.
     */
    private buildTrustPolicyMap(): void {
        this.trustPolicyMap.clear();
        for (const policy of this.c3.trustPolicy) {
            this.trustPolicyMap.set(policy.source, policy);
        }
    }

    /**
     * Map trust level to tag label.
     */
    private getTrustLabel(trustLevel: TrustLevel): string {
        switch (trustLevel) {
            case 'system': return 'TRUSTED';
            case 'validated': return 'VALIDATED';
            case 'external': return 'UNTRUSTED';
            case 'untrusted': return 'UNTRUSTED';
        }
    }

    /**
     * Record a detection internally for analytics.
     */
    private recordDetectionInternal(detection: FirewallDetection, source: ContentSource): void {
        // By category
        const catCount = this.detectionsByCategory.get(detection.category) ?? 0;
        this.detectionsByCategory.set(detection.category, catCount + 1);

        // By source
        const srcCount = this.detectionsBySource.get(source) ?? 0;
        this.detectionsBySource.set(source, srcCount + 1);

        // By pattern
        const patternStats = this.detectionsByPattern.get(detection.patternId) ?? { detections: 0, falsePositives: 0 };
        patternStats.detections++;
        this.detectionsByPattern.set(detection.patternId, patternStats);
    }

    // ─── Static Factory ─────────────────────────────────────

    /**
     * Build a default C3 configuration with all core patterns.
     */
    static buildDefaultC3(): Chromosome3 {
        // Deep-copy patterns to prevent shared state mutation
        const corePatterns = CORE_PATTERNS.map(p => ({ ...p }));

        // Compute integrity hash
        const canonical = corePatterns
            .map(p => ({
                id: p.id,
                name: p.name,
                pattern: p.pattern,
                category: p.category,
                severity: p.severity,
                action: p.action,
            }))
            .sort((a, b) => a.id.localeCompare(b.id));

        const hash = createHash('sha256')
            .update(JSON.stringify(canonical))
            .digest('hex');

        return {
            corePatterns,
            learnedPatterns: ALL_DEFAULT_PATTERNS.filter(p => !p.immutable).map(p => ({ ...p })),
            trustPolicy: DEFAULT_TRUST_POLICIES.map(p => ({ ...p })),
            sanitizationRules: DEFAULT_SANITIZATION_RULES.map(r => ({ ...r, applyTo: [...r.applyTo] })),
            contentTagging: { ...DEFAULT_CONTENT_TAGGING },
            integrity: {
                corePatternsHash: hash,
                lastVerified: new Date(),
                violations: 0,
            },
            metadata: {
                version: '1.0.0',
                lastUpdated: new Date(),
                totalBlocked: 0,
                totalScanned: 0,
                falsePositiveRate: 0,
            },
        };
    }
}
