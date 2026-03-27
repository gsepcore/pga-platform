import { describe, it, expect } from 'vitest';
import { WeeklyReportGenerator } from '../WeeklyReportGenerator.js';
import { MetricsCollector } from '../MetricsCollector.js';

describe('WeeklyReportGenerator', () => {
    function createGenerator() {
        const metrics = new MetricsCollector({ enabled: true });
        return new WeeklyReportGenerator(metrics);
    }

    it('should generate an empty report with zero interactions', () => {
        const gen = createGenerator();
        const report = gen.generate();

        expect(report.conversations.total).toBe(0);
        expect(report.quality.trend).toBe('stable');
        expect(report.tokens.totalUsed).toBe(0);
        expect(report.roi.tokenCostUSD).toBe(0);
        expect(report.summary).toContain('GSEP Agent');
    });

    it('should track interactions and compute quality', () => {
        const gen = createGenerator();

        // Simulate interactions with improving quality
        for (let i = 0; i < 10; i++) {
            gen.recordInteraction(0.5 + i * 0.04, 200);
        }

        const report = gen.generate();
        expect(report.conversations.total).toBe(10);
        expect(report.quality.endScore).toBeGreaterThan(report.quality.startScore);
        expect(report.quality.trend).toBe('improving');
        expect(report.tokens.totalUsed).toBe(2000);
    });

    it('should detect declining quality', () => {
        const gen = createGenerator();

        for (let i = 0; i < 10; i++) {
            gen.recordInteraction(0.9 - i * 0.05, 150);
        }

        const report = gen.generate();
        expect(report.quality.trend).toBe('declining');
        expect(report.suggestions.some(s => s.includes('declining'))).toBe(true);
    });

    it('should calculate ROI', () => {
        const gen = createGenerator();

        for (let i = 0; i < 100; i++) {
            gen.recordInteraction(0.8, 300);
        }

        const report = gen.generate();
        expect(report.roi.estimatedHumanCostUSD).toBeGreaterThan(0);
        expect(report.roi.savingsUSD).toBeGreaterThan(0);
        expect(report.roi.roiMultiplier).toBeGreaterThan(1);
    });

    it('should generate human-readable summary', () => {
        const gen = createGenerator();
        gen.recordInteraction(0.8, 200);

        const report = gen.generate();
        expect(report.summary).toContain('Conversations');
        expect(report.summary).toContain('Quality');
        expect(report.summary).toContain('Cost');
    });

    it('should track week interaction count', () => {
        const gen = createGenerator();
        gen.recordInteraction(0.8, 200);
        gen.recordInteraction(0.7, 150);

        expect(gen.getWeekInteractionCount()).toBe(2);
    });

    it('should keep report history', () => {
        const gen = createGenerator();
        gen.recordInteraction(0.8, 200);

        gen.generate();
        gen.generate();

        expect(gen.getHistory().length).toBe(2);
    });
});
