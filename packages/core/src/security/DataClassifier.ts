/**
 * DataClassifier — Automatic data classification for Genome Shield.
 *
 * Classifies text content into sensitivity levels using heuristics.
 * Drives: which LLM can see it, whether it's cached, and audit verbosity.
 *
 * @module security
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-30
 */

// ─── Types ──────────────────────────────────────────────

export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';

export interface ClassificationResult {
    classification: DataClassification;
    confidence: number;
    reasons: string[];
    categories: string[];
}

interface ClassificationRule {
    classification: DataClassification;
    category: string;
    patterns: RegExp[];
    weight: number;
}

// ─── Rules ──────────────────────────────────────────────

const RULES: ClassificationRule[] = [
    // RESTRICTED — highest sensitivity
    {
        classification: 'restricted',
        category: 'credentials',
        patterns: [
            /\b(?:sk-[A-Za-z0-9]{20,}|sk-ant-|ghp_|AKIA[A-Z0-9]{16})/,
            /(?:password|passwd|secret)\s*[:=]\s*\S+/i,
            /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/,
            /-----BEGIN CERTIFICATE-----/,
        ],
        weight: 1.0,
    },
    {
        classification: 'restricted',
        category: 'financial',
        patterns: [
            /\b(?:\d{4}[-\s]?){3}\d{1,4}\b/,  // credit cards
            /\b[A-Z]{2}\d{2}\s?[A-Z0-9]{4}(?:\s?[A-Z0-9]{4}){2,7}/,  // IBAN
            /\b(?:bank\s*account|routing\s*number|swift\s*code)\b/i,
            /\b(?:social\s*security|SSN)\s*[:=]?\s*\d/i,
        ],
        weight: 1.0,
    },
    {
        classification: 'restricted',
        category: 'health',
        patterns: [
            /\b(?:diagnosis|prescription|patient\s*id|medical\s*record|health\s*insurance)\b/i,
            /\b(?:ICD-\d{1,2}|CPT\s*code|NPI\s*number)\b/i,
            /\b(?:blood\s*type|allergy|medication|dosage)\b/i,
        ],
        weight: 0.9,
    },

    // CONFIDENTIAL
    {
        classification: 'confidential',
        category: 'personal-identity',
        patterns: [
            /\b\d{3}-\d{2}-\d{4}\b/,  // SSN
            /\b(?:passport\s*(?:number|no|#))\b/i,
            /\b(?:driver'?s?\s*license|DL\s*#)\b/i,
            /\b(?:date\s*of\s*birth|DOB)\s*[:=]?\s*\d/i,
        ],
        weight: 0.8,
    },
    {
        classification: 'confidential',
        category: 'contact-info',
        patterns: [
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,  // email
            /\+\d{1,3}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/,  // phone
            /\b\d{1,5}\s+[A-Za-z]+\s+(?:St|Ave|Blvd|Dr|Rd|Ln|Way|Ct)\b/i,  // address
        ],
        weight: 0.7,
    },
    {
        classification: 'confidential',
        category: 'legal',
        patterns: [
            /\b(?:attorney[- ]client|privileged|confidential\s*(?:and|&)\s*proprietary)\b/i,
            /\b(?:NDA|non-disclosure|trade\s*secret|patent\s*pending)\b/i,
            /\b(?:settlement|litigation|court\s*order|subpoena)\b/i,
        ],
        weight: 0.7,
    },

    // INTERNAL
    {
        classification: 'internal',
        category: 'business',
        patterns: [
            /\b(?:revenue|profit|loss|budget|forecast|Q[1-4]\s*\d{4})\b/i,
            /\b(?:employee\s*id|salary|compensation|performance\s*review)\b/i,
            /\b(?:customer\s*list|vendor\s*contract|pricing\s*sheet)\b/i,
            /\b(?:roadmap|strategy|competitive\s*analysis)\b/i,
        ],
        weight: 0.5,
    },
    {
        classification: 'internal',
        category: 'infrastructure',
        patterns: [
            /\b(?:192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)/,  // private IPs
            /\b(?:localhost|127\.0\.0\.1):\d{4,5}\b/,
            /\b(?:database\s*(?:url|host|connection)|redis:|mongodb:)/i,
            /\b(?:AWS_|AZURE_|GCP_|GOOGLE_CLOUD_)\w+/,
        ],
        weight: 0.4,
    },
];

// ─── Engine ─────────────────────────────────────────────

/**
 * Classifies text content by sensitivity level.
 *
 * Usage:
 * ```typescript
 * const classifier = new DataClassifier();
 * const result = classifier.classify('My SSN is 123-45-6789');
 * // result.classification = 'confidential'
 * // result.categories = ['personal-identity']
 * ```
 */
export class DataClassifier {
    private stats = {
        totalClassified: 0,
        byClassification: {} as Record<DataClassification, number>,
    };

    /**
     * Classify text content.
     */
    classify(text: string): ClassificationResult {
        this.stats.totalClassified++;

        let highestClassification: DataClassification = 'public';
        let highestWeight = 0;
        const reasons: string[] = [];
        const categories: string[] = [];

        const classOrder: Record<DataClassification, number> = {
            public: 0,
            internal: 1,
            confidential: 2,
            restricted: 3,
        };

        for (const rule of RULES) {
            for (const pattern of rule.patterns) {
                // Reset lastIndex for global patterns
                pattern.lastIndex = 0;
                if (pattern.test(text)) {
                    if (classOrder[rule.classification] > classOrder[highestClassification]) {
                        highestClassification = rule.classification;
                        highestWeight = rule.weight;
                    } else if (
                        classOrder[rule.classification] === classOrder[highestClassification] &&
                        rule.weight > highestWeight
                    ) {
                        highestWeight = rule.weight;
                    }

                    if (!categories.includes(rule.category)) {
                        categories.push(rule.category);
                        reasons.push(`${rule.category}: matches ${rule.classification} pattern`);
                    }
                    break; // one match per rule is enough
                }
            }
        }

        const confidence = categories.length === 0 ? 1.0 : Math.min(highestWeight + categories.length * 0.1, 1.0);

        this.stats.byClassification[highestClassification] =
            (this.stats.byClassification[highestClassification] || 0) + 1;

        return {
            classification: highestClassification,
            confidence,
            reasons,
            categories,
        };
    }

    /**
     * Quick check: is the text above a given classification threshold?
     */
    isAtLeast(text: string, threshold: DataClassification): boolean {
        const order: Record<DataClassification, number> = {
            public: 0, internal: 1, confidential: 2, restricted: 3,
        };
        const result = this.classify(text);
        return order[result.classification] >= order[threshold];
    }

    /**
     * Get analytics.
     */
    getStats(): typeof this.stats {
        return { ...this.stats };
    }
}
