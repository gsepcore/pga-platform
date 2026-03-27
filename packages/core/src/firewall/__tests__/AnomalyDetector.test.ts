import { describe, it, expect } from 'vitest';
import { AnomalyDetector } from '../AnomalyDetector.js';

describe('AnomalyDetector', () => {
    it('should detect duplicate flood', () => {
        const detector = new AnomalyDetector({ duplicateThreshold: 3 });

        detector.analyze('I want a refund', 'user-1');
        detector.analyze('I want a refund', 'user-2');
        const anomalies = detector.analyze('I want a refund', 'user-3');

        expect(anomalies.length).toBeGreaterThan(0);
        expect(anomalies[0].type).toBe('duplicate-flood');
        expect(anomalies[0].messageCount).toBeGreaterThanOrEqual(3);
    });

    it('should not flag unique messages as duplicates', () => {
        const detector = new AnomalyDetector({ duplicateThreshold: 3 });

        const a1 = detector.analyze('Hello', 'user-1');
        const a2 = detector.analyze('How are you?', 'user-2');
        const a3 = detector.analyze('What is your return policy?', 'user-3');

        expect(a1.length).toBe(0);
        expect(a2.length).toBe(0);
        expect(a3.length).toBe(0);
    });

    it('should detect velocity spike', () => {
        const detector = new AnomalyDetector({ velocityThreshold: 5 });

        const anomalies: ReturnType<typeof detector.analyze> = [];
        for (let i = 0; i < 10; i++) {
            const result = detector.analyze(`Message ${i}`, `user-${i}`);
            anomalies.push(...result);
        }

        const velocityAnomaly = anomalies.find(a => a.type === 'velocity-spike');
        expect(velocityAnomaly).toBeDefined();
    });

    it('should track analytics', () => {
        const detector = new AnomalyDetector({ duplicateThreshold: 2 });

        detector.analyze('test', 'user-1');
        detector.analyze('test', 'user-2');

        const analytics = detector.getAnalytics();
        expect(analytics.totalAnalyzed).toBe(2);
        expect(analytics.anomaliesDetected).toBeGreaterThanOrEqual(1);
    });

    it('should maintain history', () => {
        const detector = new AnomalyDetector({ duplicateThreshold: 2 });

        detector.analyze('spam', 'user-1');
        detector.analyze('spam', 'user-2');

        const history = detector.getHistory();
        expect(history.length).toBeGreaterThanOrEqual(1);
        expect(history[0].type).toBe('duplicate-flood');
    });

    it('should suggest block for critical anomalies', () => {
        const detector = new AnomalyDetector({ duplicateThreshold: 3 });

        // Send 25 identical messages to trigger critical severity
        for (let i = 0; i < 25; i++) {
            detector.analyze('URGENT REFUND NOW', `user-${i}`);
        }

        const analytics = detector.getAnalytics();
        expect(analytics.anomaliesDetected).toBeGreaterThan(0);

        const history = detector.getHistory();
        const critical = history.find(a => a.severity === 'critical' || a.severity === 'high');
        expect(critical).toBeDefined();
    });

    it('should handle empty messages', () => {
        const detector = new AnomalyDetector();
        const anomalies = detector.analyze('', 'user-1');
        expect(Array.isArray(anomalies)).toBe(true);
    });
});
