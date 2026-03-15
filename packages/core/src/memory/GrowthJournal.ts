/**
 * GrowthJournal — Narrative Self-Model for Agent Growth
 *
 * Records the agent's learning journey as a narrative: lessons learned,
 * failures analyzed, skills acquired, and growth milestones. Unlike
 * PersonalNarrative (which tracks the user-agent relationship),
 * GrowthJournal tracks the agent's own cognitive development.
 *
 * Inspired by Sophia System 3's Growth Journal concept.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-12
 */

// ─── Types ──────────────────────────────────────────────

export interface JournalEntry {
    id: string;
    type: 'lesson-learned' | 'failure-analysis' | 'skill-acquired' | 'insight' | 'growth-milestone';
    content: string;
    domain: string | null;
    confidence: number;  // 0-1: how confident is the agent in this lesson
    timestamp: Date;
    context?: string;    // what triggered this entry
}

export interface GrowthMilestone {
    id: string;
    title: string;
    description: string;
    achievedAt: Date;
    metric: string;      // what metric was reached
    value: number;
}

export interface GrowthSnapshot {
    totalEntries: number;
    lessonsLearned: number;
    failuresAnalyzed: number;
    skillsAcquired: string[];
    recentInsights: string[];
    growthTrend: 'accelerating' | 'steady' | 'plateau';
    narrative: string;   // human-readable growth summary
}

// ─── Constants ──────────────────────────────────────────

const MAX_ENTRIES = 100;
const MAX_MILESTONES = 20;

// ─── GrowthJournal ──────────────────────────────────────

export class GrowthJournal {
    private entries: JournalEntry[] = [];
    private milestones: GrowthMilestone[] = [];
    private domainSuccessHistory: Map<string, { successes: number; failures: number }> = new Map();
    private consecutiveSuccesses: number = 0;
    private consecutiveFailures: number = 0;
    private totalInteractions: number = 0;

    /**
     * Record a successful interaction and extract lessons.
     */
    recordSuccess(domain: string | null, taskDescription: string, quality: number): void {
        this.totalInteractions++;
        this.consecutiveSuccesses++;
        this.consecutiveFailures = 0;

        if (domain) {
            const stats = this.domainSuccessHistory.get(domain) ?? { successes: 0, failures: 0 };
            stats.successes++;
            this.domainSuccessHistory.set(domain, stats);
        }

        // Record skill acquisition at quality thresholds
        if (quality >= 0.8 && domain) {
            const stats = this.domainSuccessHistory.get(domain);
            if (stats && stats.successes === 5) {
                this.addEntry({
                    type: 'skill-acquired',
                    content: `Developed competence in ${domain} — consistently delivering quality responses`,
                    domain,
                    confidence: 0.7,
                    context: taskDescription,
                });
            }
            if (stats && stats.successes === 20) {
                this.addEntry({
                    type: 'skill-acquired',
                    content: `Achieved mastery in ${domain} — 20 successful interactions`,
                    domain,
                    confidence: 0.9,
                    context: taskDescription,
                });
                this.addMilestone(
                    `${domain} Mastery`,
                    `Completed 20 successful ${domain} interactions`,
                    `${domain}_success_count`,
                    20,
                );
            }
        }

        // Record streak milestones
        if (this.consecutiveSuccesses === 10) {
            this.addEntry({
                type: 'growth-milestone',
                content: '10 consecutive successful interactions — entering a productive streak',
                domain,
                confidence: 0.85,
            });
            this.addMilestone(
                'Hot Streak',
                '10 consecutive successful interactions',
                'consecutive_successes',
                10,
            );
        }

        // Generate insight from high-quality interactions
        if (quality >= 0.9) {
            this.addEntry({
                type: 'insight',
                content: `High-quality response in ${domain || 'general'}: "${taskDescription.slice(0, 60)}..." — remember this approach`,
                domain,
                confidence: quality,
                context: taskDescription,
            });
        }
    }

    /**
     * Record a failure and analyze what went wrong.
     */
    recordFailure(domain: string | null, taskDescription: string, reason?: string): void {
        this.totalInteractions++;
        this.consecutiveFailures++;
        this.consecutiveSuccesses = 0;

        if (domain) {
            const stats = this.domainSuccessHistory.get(domain) ?? { successes: 0, failures: 0 };
            stats.failures++;
            this.domainSuccessHistory.set(domain, stats);
        }

        // Analyze failure
        const analysis = reason || `Struggled with ${domain || 'task'}: "${taskDescription.slice(0, 60)}..."`;
        this.addEntry({
            type: 'failure-analysis',
            content: `${analysis}. Need to improve approach for this type of task.`,
            domain,
            confidence: 0.6,
            context: taskDescription,
        });

        // Detect repeated failures in same domain
        if (domain) {
            const stats = this.domainSuccessHistory.get(domain)!;
            const total = stats.successes + stats.failures;
            const failRate = stats.failures / total;

            if (total >= 5 && failRate > 0.5) {
                this.addEntry({
                    type: 'lesson-learned',
                    content: `Persistent difficulty with ${domain} (${Math.round(failRate * 100)}% failure rate over ${total} interactions). Consider: asking more clarifying questions, breaking tasks into smaller steps, or admitting uncertainty early.`,
                    domain,
                    confidence: 0.8,
                });
            }
        }

        // Warn on losing streaks
        if (this.consecutiveFailures === 3) {
            this.addEntry({
                type: 'lesson-learned',
                content: '3 consecutive failures — slowing down, asking for clarification, and being more careful may help',
                domain,
                confidence: 0.7,
            });
        }
    }

    /**
     * Record a general lesson from an interaction.
     */
    recordLesson(lesson: string, domain: string | null, confidence: number = 0.7): void {
        this.addEntry({
            type: 'lesson-learned',
            content: lesson,
            domain,
            confidence,
        });
    }

    /**
     * Get recent lessons relevant to a domain.
     */
    getLessonsForDomain(domain: string): JournalEntry[] {
        return this.entries
            .filter(e => e.domain === domain || e.domain === null)
            .filter(e => e.type === 'lesson-learned' || e.type === 'failure-analysis' || e.type === 'insight')
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 5);
    }

    /**
     * Get the overall growth snapshot.
     */
    getGrowthSnapshot(): GrowthSnapshot {
        const lessonsLearned = this.entries.filter(e => e.type === 'lesson-learned').length;
        const failuresAnalyzed = this.entries.filter(e => e.type === 'failure-analysis').length;

        const skillsAcquired = this.entries
            .filter(e => e.type === 'skill-acquired')
            .map(e => e.domain || 'general');

        const recentInsights = this.entries
            .filter(e => e.type === 'insight')
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 3)
            .map(e => e.content);

        // Determine growth trend from recent history
        const recent = this.entries.slice(-20);
        const firstHalf = recent.slice(0, 10);
        const secondHalf = recent.slice(10);
        const firstPositive = firstHalf.filter(e => e.type !== 'failure-analysis').length;
        const secondPositive = secondHalf.filter(e => e.type !== 'failure-analysis').length;

        let growthTrend: GrowthSnapshot['growthTrend'] = 'steady';
        if (secondHalf.length >= 5) {
            if (secondPositive > firstPositive + 2) growthTrend = 'accelerating';
            else if (secondPositive < firstPositive - 2) growthTrend = 'plateau';
        }

        return {
            totalEntries: this.entries.length,
            lessonsLearned,
            failuresAnalyzed,
            skillsAcquired: [...new Set(skillsAcquired)],
            recentInsights,
            growthTrend,
            narrative: this.generateNarrative(),
        };
    }

    /**
     * Get all journal entries.
     */
    getEntries(): JournalEntry[] {
        return [...this.entries];
    }

    /**
     * Get milestones.
     */
    getMilestones(): GrowthMilestone[] {
        return [...this.milestones];
    }

    /**
     * Generate a prompt section for the system prompt.
     * Injects the agent's growth history as self-knowledge.
     */
    toPromptSection(currentDomain?: string): string | null {
        if (this.entries.length === 0) return null;

        const lines: string[] = ['## Growth Journal'];

        // Domain-specific lessons
        if (currentDomain) {
            const domainLessons = this.getLessonsForDomain(currentDomain);
            if (domainLessons.length > 0) {
                lines.push(`**Past experience with ${currentDomain}:**`);
                for (const lesson of domainLessons.slice(0, 3)) {
                    lines.push(`- ${lesson.content}`);
                }
            }
        }

        // Recent insights
        const recentInsights = this.entries
            .filter(e => e.type === 'insight')
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 2);

        if (recentInsights.length > 0) {
            lines.push('**Recent learnings:**');
            for (const insight of recentInsights) {
                lines.push(`- ${insight.content}`);
            }
        }

        // Current streak awareness
        if (this.consecutiveFailures >= 2) {
            lines.push(`**Caution:** ${this.consecutiveFailures} recent failures — be extra careful and ask clarifying questions.`);
        } else if (this.consecutiveSuccesses >= 5) {
            lines.push(`**Momentum:** ${this.consecutiveSuccesses} consecutive successes — maintain this quality.`);
        }

        return lines.length > 1 ? lines.join('\n') : null;
    }

    // ── Private ──────────────────────────────────────────

    private addEntry(data: Omit<JournalEntry, 'id' | 'timestamp'>): void {
        // Avoid duplicate entries within 1 minute
        const recent = this.entries.find(e =>
            e.content === data.content &&
            Date.now() - e.timestamp.getTime() < 60_000
        );
        if (recent) return;

        this.entries.push({
            ...data,
            id: `journal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            timestamp: new Date(),
        });

        // Enforce max
        if (this.entries.length > MAX_ENTRIES) {
            // Keep highest confidence entries
            this.entries.sort((a, b) => b.confidence - a.confidence);
            this.entries = this.entries.slice(0, MAX_ENTRIES);
            // Re-sort by time
            this.entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        }
    }

    private addMilestone(title: string, description: string, metric: string, value: number): void {
        if (this.milestones.some(m => m.title === title)) return;

        this.milestones.push({
            id: `milestone_${Date.now()}`,
            title,
            description,
            achievedAt: new Date(),
            metric,
            value,
        });

        if (this.milestones.length > MAX_MILESTONES) {
            this.milestones = this.milestones.slice(-MAX_MILESTONES);
        }
    }

    private generateNarrative(): string {
        if (this.totalInteractions === 0) return '';

        const parts: string[] = [];
        const snapshot = {
            total: this.totalInteractions,
            skills: this.entries.filter(e => e.type === 'skill-acquired').length,
            lessons: this.entries.filter(e => e.type === 'lesson-learned').length,
            milestones: this.milestones.length,
        };

        parts.push(`After ${snapshot.total} interactions`);

        if (snapshot.skills > 0) {
            const domains = [...new Set(this.entries
                .filter(e => e.type === 'skill-acquired' && e.domain)
                .map(e => e.domain!))];
            parts.push(`developed skills in ${domains.slice(0, 3).join(', ')}`);
        }

        if (snapshot.lessons > 0) {
            parts.push(`learned ${snapshot.lessons} lesson${snapshot.lessons > 1 ? 's' : ''}`);
        }

        if (this.consecutiveSuccesses >= 3) {
            parts.push(`currently on a ${this.consecutiveSuccesses}-interaction winning streak`);
        }

        return parts.join(', ') + '.';
    }
}
