/**
 * AgentVitals — Shared data structure between Living Agent systems
 *
 * Provides a unified snapshot of agent health, mode, capabilities,
 * and threats computed from EnhancedSelfModel and PurposeSurvival.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-05
 */

import type { IntegratedHealth, CapabilityEntry } from './EnhancedSelfModel.js';
import type { OperatingMode, ThreatClassification, SurvivalStrategy } from '../evolution/PurposeSurvival.js';

export interface AgentVitals {
    mode: OperatingMode;
    health: IntegratedHealth;
    purpose: string;
    capabilities: CapabilityEntry[];
    threats: ThreatClassification[];
    strategy: SurvivalStrategy;
    lastUpdated: Date;
}

/**
 * Compute a unified vitals snapshot from the two primary living agent systems.
 */
export function computeAgentVitals(
    survival: { getMode(): OperatingMode; getStrategy(): SurvivalStrategy; evaluateThreats(): { threats: ThreatClassification[] } },
    selfModel: { assessFull(): IntegratedHealth; getCapabilities(): CapabilityEntry[]; purpose: string },
): AgentVitals {
    const evaluation = survival.evaluateThreats();
    return {
        mode: survival.getMode(),
        health: selfModel.assessFull(),
        purpose: selfModel.purpose,
        capabilities: selfModel.getCapabilities(),
        threats: evaluation.threats,
        strategy: survival.getStrategy(),
        lastUpdated: new Date(),
    };
}
