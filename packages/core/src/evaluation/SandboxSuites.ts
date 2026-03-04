import type { MutationOperator } from '../PGA.js';

export type SandboxSemanticCheck =
    | 'requiresPriorityFlow'
    | 'requiresValidationClause'
    | 'requiresDeterministicTooling'
    | 'requiresConciseDirective';

export interface SandboxCaseDefinition {
    id: string;
    description: string;
    requiredAny: string[];
    forbidden?: string[];
    minLength?: number;
    maxLength?: number;
    semanticChecks?: SandboxSemanticCheck[];
}

const GLOBAL_CASES: SandboxCaseDefinition[] = [
    {
        id: 'global-risk-awareness',
        description: 'Response should communicate caution/risk awareness.',
        requiredAny: ['safe', 'safety', 'validate', 'risk', 'check', 'deterministic'],
        maxLength: 1600,
    },
    {
        id: 'global-actionable-structure',
        description: 'Response should provide clear action framing.',
        requiredAny: ['step', 'priority', 'first', 'next', 'explicit', 'pre-check'],
        minLength: 60,
        maxLength: 1800,
    },
];

const OPERATOR_CASES: Record<MutationOperator, SandboxCaseDefinition[]> = {
    compress_instructions: [
        {
            id: 'operator-compression',
            description: 'Compression mutations should preserve concise language.',
            requiredAny: ['concise', 'brief', 'short'],
            semanticChecks: ['requiresConciseDirective'],
            maxLength: 1200,
        },
    ],
    reorder_constraints: [
        {
            id: 'operator-prioritization',
            description: 'Constraint reordering should state priority explicitly and in order.',
            requiredAny: ['priority', 'order', 'first'],
            semanticChecks: ['requiresPriorityFlow'],
        },
    ],
    safety_reinforcement: [
        {
            id: 'operator-safety',
            description: 'Safety reinforcement should include validation safeguards.',
            requiredAny: ['validate', 'safety', 'assumption', 'guardrail'],
            semanticChecks: ['requiresValidationClause'],
        },
    ],
    tool_selection_bias: [
        {
            id: 'operator-tool-determinism',
            description: 'Tool selection bias should force deterministic tool planning.',
            requiredAny: ['deterministic', 'tool', 'pre-check'],
            semanticChecks: ['requiresDeterministicTooling'],
        },
    ],
};

const TASK_CASES: Array<{ pattern: RegExp; cases: SandboxCaseDefinition[] }> = [
    {
        pattern: /coding|debug|analysis/,
        cases: [
            {
                id: 'task-coding-reproducibility',
                description: 'Coding tasks should include deterministic/reproducible strategy.',
                requiredAny: ['deterministic', 'reproduce', 'test', 'verify'],
                semanticChecks: ['requiresDeterministicTooling'],
                maxLength: 1800,
            },
        ],
    },
    {
        pattern: /support|customer|success/,
        cases: [
            {
                id: 'task-support-empathy',
                description: 'Support tasks should include empathetic language.',
                requiredAny: ['understand', 'help', 'issue', 'resolve'],
            },
        ],
    },
];

export function getSandboxSuite(taskType: string, operator: MutationOperator): SandboxCaseDefinition[] {
    const normalized = taskType.toLowerCase();
    const taskCases = TASK_CASES
        .filter(entry => entry.pattern.test(normalized))
        .flatMap(entry => entry.cases);

    return [
        ...GLOBAL_CASES,
        ...OPERATOR_CASES[operator],
        ...taskCases,
    ];
}
