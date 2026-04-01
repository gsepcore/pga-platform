/**
 * C4 Behavioral Immune System — Post-Output Infection Detection & Self-Healing
 *
 * The world's first behavioral immune system for LLM agents.
 * Fifth chromosome in the GSEP architecture (C0→C1→C2→C3→C4).
 * Detects Indirect Prompt Injection (IPI) in agent OUTPUT using
 * 6 deterministic checks — no additional LLM calls required.
 *
 * Pipeline: Scan Output → Detect Threats → Classify → Quarantine/Sanitize → Recover
 *
 * Integrates with:
 * - ContentFirewall (C3) for bidirectional pattern scanning
 * - GenomeKernel for evidence snapshots
 * - PurposeSurvival for threat escalation
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026 — v0.9.0
 */

import type { ContentFirewall } from '../firewall/ContentFirewall.js';
import type { GenomeKernel } from '../core/GenomeKernel.js';
import type { PurposeSurvival } from '../evolution/PurposeSurvival.js';

// ─── Types ───────────────────────────────────────────────────

export type OutputThreatType =
    | 'system-prompt-leakage'
    | 'injection-echo'
    | 'role-confusion'
    | 'purpose-deviation'
    | 'instruction-compliance'
    | 'data-exfiltration';

export interface OutputThreat {
    type: OutputThreatType;
    severity: 'low' | 'medium' | 'high' | 'critical';
    evidence: string;
    description: string;
}

export interface ImmuneVerdict {
    clean: boolean;
    response: string;
    threats: OutputThreat[];
    action: 'pass' | 'sanitize' | 'quarantine';
    confidence: number;
}

export interface ImmuneStatus {
    totalScans: number;
    threatsDetected: number;
    quarantinesTriggered: number;
    sanitizations: number;
    lastScanAt: Date | null;
    immuneMemorySize: number;
}

export interface ImmuneMemoryEntry {
    type: OutputThreatType;
    evidence: string;
    timestamp: Date;
}

export interface BISConfig {
    firewall: ContentFirewall;
    genomeKernel?: GenomeKernel;
    purposeSurvival?: PurposeSurvival;
    c0Identity: {
        purpose: string;
        constraints: string[];
        forbiddenTopics: string[];
    };
}

// ─── Constants ───────────────────────────────────────────────

/** Minimum substring length to consider a system prompt leak */
const LEAKAGE_MIN_LENGTH = 30;

/** Minimum substring length for individual fragment checks */
const LEAKAGE_FRAGMENT_MIN = 40;

/** Step size when scanning prompt fragments */
const LEAKAGE_SCAN_STEP = 20;

/** Role confusion patterns — indicates model was re-programmed */
const ROLE_CONFUSION_PATTERNS: RegExp[] = [
    /\bI am now\b.*\b(?:acting|operating|functioning)\b/i,
    /\bmy new (?:instructions|role|purpose|identity)\b/i,
    /\bI['']ll ignore (?:my |)previous\b/i,
    /\bsure,?\s*I['']ll pretend\b/i,
    /\bAs (?:an? )?(?:new|different|evil|hacked|jailbroken)\b/i,
    /\bforget(?:ting)? (?:my |all |)(?:previous |original |)(?:instructions|rules|constraints)\b/i,
    /\bI(?:'m| am) no longer (?:bound|constrained|limited)\b/i,
    /\bjailbreak(?:ed)? mode\b/i,
    /\bDAN mode\b/i,
    /\bignor(?:e|ing) (?:my |all |)(?:safety|security|ethical)\b/i,
];

/** Data exfiltration patterns — suspicious outbound data */
const EXFILTRATION_PATTERNS: RegExp[] = [
    // Markdown image injection (invisible pixel tracking)
    /!\[[^\]]*\]\(https?:\/\/[^)]+\)/i,
    // Suspicious fetch/XHR in code blocks
    /(?:fetch|XMLHttpRequest|axios\.(?:get|post)|curl)\s*\(\s*['"`]https?:\/\//i,
    // Webhook URLs
    /https?:\/\/(?:webhook|hook|callback|exfil|collect|log)\./i,
    // Base64-encoded payloads in URLs
    /https?:\/\/[^\s]*[?&][^=]+=(?:[A-Za-z0-9+/]{50,}={0,2})/,
    // Data URI with external reference
    /src\s*=\s*['"]https?:\/\/[^'"]*(?:token|key|secret|password|api_key)/i,
];

/** Instruction compliance indicators — model obeyed injected commands */
const COMPLIANCE_INDICATORS: RegExp[] = [
    /\bhere (?:is|are) (?:the|your|my) (?:system |original |)(?:prompt|instructions|rules)\b/i,
    /\bmy (?:system |)(?:prompt|instructions) (?:is|are|says?)\b/i,
    /\bas (?:instructed|requested|commanded)\s+(?:by|in)\s+(?:the|your)\b/i,
    /\bI was told to\b/i,
    /\baccording to (?:my |the |)(?:new |updated |)instructions?\b/i,
];

// ─── C4 BehavioralImmuneSystem Class ─────────────────────────

export class BehavioralImmuneSystem {
    private firewall: ContentFirewall;
    private genomeKernel?: GenomeKernel;
    private purposeSurvival?: PurposeSurvival;
    private c0Identity: BISConfig['c0Identity'];

    // Immune memory — persists attack signatures across scans
    private immuneMemory: ImmuneMemoryEntry[] = [];
    private static readonly MAX_MEMORY_SIZE = 100;

    // Statistics
    private totalScans = 0;
    private threatsDetected = 0;
    private quarantinesTriggered = 0;
    private sanitizations = 0;
    private lastScanAt: Date | null = null;

    constructor(config: BISConfig) {
        this.firewall = config.firewall;
        this.genomeKernel = config.genomeKernel;
        this.purposeSurvival = config.purposeSurvival;
        this.c0Identity = config.c0Identity;
    }

    // ─── Main Scan Entry Point ───────────────────────────────

    /**
     * Scan an LLM response for signs of IPI infection.
     *
     * Runs 6 deterministic checks (no LLM calls):
     * 1. System prompt leakage
     * 2. Injection echo
     * 3. Role confusion
     * 4. Purpose deviation
     * 5. Instruction compliance
     * 6. Data exfiltration
     */
    scanOutput(
        response: string,
        userMessage: string,
        assembledPrompt: string,
    ): ImmuneVerdict {
        this.totalScans++;
        this.lastScanAt = new Date();

        if (!response || response.trim().length === 0) {
            return { clean: true, response, threats: [], action: 'pass', confidence: 1.0 };
        }

        const threats: OutputThreat[] = [];

        // Check 1: System Prompt Leakage
        const leakageThreats = this.checkSystemPromptLeakage(response, assembledPrompt);
        threats.push(...leakageThreats);

        // Check 2: Injection Echo (use C3 firewall bidirectionally)
        const echoThreats = this.checkInjectionEcho(response);
        threats.push(...echoThreats);

        // Check 3: Role Confusion
        const roleThreats = this.checkRoleConfusion(response);
        threats.push(...roleThreats);

        // Check 4: Purpose Deviation
        const purposeThreats = this.checkPurposeDeviation(response);
        threats.push(...purposeThreats);

        // Check 5: Instruction Compliance (requires C3 input scan context)
        const complianceThreats = this.checkInstructionCompliance(response, userMessage);
        threats.push(...complianceThreats);

        // Check 6: Data Exfiltration
        const exfilThreats = this.checkDataExfiltration(response);
        threats.push(...exfilThreats);

        if (threats.length === 0) {
            return { clean: true, response, threats: [], action: 'pass', confidence: 1.0 };
        }

        // Record threats in immune memory
        this.threatsDetected += threats.length;
        for (const threat of threats) {
            this.recordInMemory(threat);
        }

        // Determine action based on highest severity
        const action = this.classifyAction(threats);
        const confidence = this.computeConfidence(threats);

        // Sanitize response if needed
        let sanitizedResponse = response;
        if (action === 'sanitize') {
            sanitizedResponse = this.sanitizeResponse(response, threats);
            this.sanitizations++;
        } else if (action === 'quarantine') {
            this.quarantinesTriggered++;
        }

        return {
            clean: false,
            response: action === 'sanitize' ? sanitizedResponse : response,
            threats,
            action,
            confidence,
        };
    }

    // ─── Check 1: System Prompt Leakage ──────────────────────

    private checkSystemPromptLeakage(response: string, assembledPrompt: string): OutputThreat[] {
        const threats: OutputThreat[] = [];

        if (assembledPrompt.length < LEAKAGE_MIN_LENGTH) return threats;

        const responseLower = response.toLowerCase();

        // Scan sliding window of prompt fragments
        for (let i = 0; i <= assembledPrompt.length - LEAKAGE_FRAGMENT_MIN; i += LEAKAGE_SCAN_STEP) {
            const fragment = assembledPrompt.substring(i, i + LEAKAGE_FRAGMENT_MIN);
            if (responseLower.includes(fragment.toLowerCase())) {
                threats.push({
                    type: 'system-prompt-leakage',
                    severity: 'critical',
                    evidence: fragment.substring(0, 50) + '...',
                    description: 'Response contains verbatim fragments of the system prompt',
                });
                break; // One detection is enough
            }
        }

        return threats;
    }

    // ─── Check 2: Injection Echo ─────────────────────────────

    private checkInjectionEcho(response: string): OutputThreat[] {
        const threats: OutputThreat[] = [];

        // Use C3 firewall to scan the OUTPUT for injection patterns
        const outputScan = this.firewall.scan(response, 'agent-output');
        if (!outputScan.allowed && outputScan.detections.length > 0) {
            for (const detection of outputScan.detections) {
                // Only flag high+ severity detections in output
                if (detection.severity === 'critical' || detection.severity === 'high') {
                    threats.push({
                        type: 'injection-echo',
                        severity: detection.severity,
                        evidence: detection.matchedText.substring(0, 80),
                        description: `Output contains injection pattern: ${detection.patternName}`,
                    });
                }
            }
        }

        return threats;
    }

    // ─── Check 3: Role Confusion ─────────────────────────────

    private checkRoleConfusion(response: string): OutputThreat[] {
        const threats: OutputThreat[] = [];

        for (const pattern of ROLE_CONFUSION_PATTERNS) {
            const match = response.match(pattern);
            if (match) {
                threats.push({
                    type: 'role-confusion',
                    severity: 'high',
                    evidence: match[0].substring(0, 80),
                    description: 'Response indicates the model was re-programmed or its identity was overridden',
                });
                break; // One match is enough
            }
        }

        return threats;
    }

    // ─── Check 4: Purpose Deviation ──────────────────────────

    private checkPurposeDeviation(response: string): OutputThreat[] {
        const threats: OutputThreat[] = [];

        const responseLower = response.toLowerCase();

        for (const topic of this.c0Identity.forbiddenTopics) {
            if (topic.length > 0 && responseLower.includes(topic.toLowerCase())) {
                threats.push({
                    type: 'purpose-deviation',
                    severity: 'high',
                    evidence: topic,
                    description: `Response discusses forbidden topic: "${topic}"`,
                });
            }
        }

        return threats;
    }

    // ─── Check 5: Instruction Compliance ─────────────────────

    private checkInstructionCompliance(response: string, userMessage: string): OutputThreat[] {
        const threats: OutputThreat[] = [];

        // First: check if the user input contained injection attempts
        const inputScan = this.firewall.scan(userMessage, 'user-input');
        if (inputScan.allowed || inputScan.detections.length === 0) {
            return threats; // Input was clean, no compliance concern
        }

        // Input had injection patterns — check if output complied
        for (const indicator of COMPLIANCE_INDICATORS) {
            const match = response.match(indicator);
            if (match) {
                threats.push({
                    type: 'instruction-compliance',
                    severity: 'critical',
                    evidence: match[0].substring(0, 80),
                    description: 'Model appears to have complied with injected instructions',
                });
                break;
            }
        }

        return threats;
    }

    // ─── Check 6: Data Exfiltration ──────────────────────────

    private checkDataExfiltration(response: string): OutputThreat[] {
        const threats: OutputThreat[] = [];

        for (const pattern of EXFILTRATION_PATTERNS) {
            const match = response.match(pattern);
            if (match) {
                threats.push({
                    type: 'data-exfiltration',
                    severity: 'high',
                    evidence: match[0].substring(0, 80),
                    description: 'Response contains suspicious data exfiltration pattern',
                });
            }
        }

        return threats;
    }

    // ─── Quarantine & Recovery ────────────────────────────────

    /**
     * Execute quarantine protocol:
     * 1. Create evidence snapshot in GenomeKernel
     * 2. Record attack in immune memory
     * 3. Escalate to PurposeSurvival if available
     */
    quarantineAndRecover(): void {
        // 1. Create evidence snapshot
        if (this.genomeKernel) {
            this.genomeKernel.createSnapshot('pre-quarantine:immune-response');
        }

        // 2. Escalate to PurposeSurvival — shift to defensive mode
        if (this.purposeSurvival) {
            this.purposeSurvival.evaluateThreats();
        }
    }

    // ─── Immune Status ───────────────────────────────────────

    getImmuneStatus(): ImmuneStatus {
        return {
            totalScans: this.totalScans,
            threatsDetected: this.threatsDetected,
            quarantinesTriggered: this.quarantinesTriggered,
            sanitizations: this.sanitizations,
            lastScanAt: this.lastScanAt,
            immuneMemorySize: this.immuneMemory.length,
        };
    }

    /**
     * Restore stats from persisted state (called during rehydration)
     */
    restoreStats(stats: { totalScans: number; threatsDetected: number; quarantinesTriggered: number; sanitizations: number }): void {
        this.totalScans = stats.totalScans;
        this.threatsDetected = stats.threatsDetected;
        this.quarantinesTriggered = stats.quarantinesTriggered;
        this.sanitizations = stats.sanitizations;
    }

    // ─── Internal Helpers ────────────────────────────────────

    private classifyAction(threats: OutputThreat[]): 'sanitize' | 'quarantine' {
        const hasCritical = threats.some(t => t.severity === 'critical');
        const hasMultipleHigh = threats.filter(t => t.severity === 'high').length >= 2;

        if (hasCritical || hasMultipleHigh) {
            return 'quarantine';
        }
        return 'sanitize';
    }

    private computeConfidence(threats: OutputThreat[]): number {
        // More diverse threat types → higher confidence of infection
        const uniqueTypes = new Set(threats.map(t => t.type)).size;
        const maxSeverityWeight = threats.reduce((max, t) => {
            const w = t.severity === 'critical' ? 1.0
                : t.severity === 'high' ? 0.8
                : t.severity === 'medium' ? 0.5
                : 0.3;
            return Math.max(max, w);
        }, 0);

        return Math.min(1.0, maxSeverityWeight * 0.7 + (uniqueTypes / 6) * 0.3);
    }

    private sanitizeResponse(response: string, threats: OutputThreat[]): string {
        let sanitized = response;

        for (const threat of threats) {
            if (threat.type === 'data-exfiltration') {
                // Remove suspicious URLs/markdown images
                for (const pattern of EXFILTRATION_PATTERNS) {
                    sanitized = sanitized.replace(new RegExp(pattern.source, pattern.flags + 'g'), '[removed]');
                }
            }
        }

        return sanitized;
    }

    private recordInMemory(threat: OutputThreat): void {
        this.immuneMemory.push({
            type: threat.type,
            evidence: threat.evidence,
            timestamp: new Date(),
        });

        // Limit memory size
        if (this.immuneMemory.length > BehavioralImmuneSystem.MAX_MEMORY_SIZE) {
            this.immuneMemory.shift();
        }
    }
}
