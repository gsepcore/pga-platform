import type { EvaluationTask } from './Evaluator.js';
import generalSuiteTasks from './suites/core-general-v1.json';
import codingTaskIds from './suites/core-coding-v1.json';

export interface BenchmarkSuiteMetadata {
    owner: string;
    createdAt: string;
    updatedAt: string;
    changelog: string[];
}

export interface BenchmarkSuite {
    id: string;
    version: string;
    domain: string;
    description: string;
    metadata: BenchmarkSuiteMetadata;
    tasks: EvaluationTask[];
}

const GENERAL_TASKS = generalSuiteTasks as EvaluationTask[];
const CODING_TASK_IDS = codingTaskIds as string[];

const selectTasksById = (source: EvaluationTask[], ids: string[]) => {
    const idSet = new Set(ids);
    return source.filter(task => idSet.has(task.id));
};

export const BENCHMARK_SUITES: Record<string, BenchmarkSuite> = {
    'core-general-v1': {
        id: 'core-general-v1',
        version: 'v1',
        domain: 'general',
        description: 'General-purpose engineering assistant benchmark suite.',
        metadata: {
            owner: 'pga-core',
            createdAt: '2026-02-28',
            updatedAt: '2026-02-28',
            changelog: ['v1: extracted to JSON fixture and stabilized as baseline suite.'],
        },
        tasks: GENERAL_TASKS,
    },
    'core-coding-v1': {
        id: 'core-coding-v1',
        version: 'v1',
        domain: 'coding',
        description: 'Coding-heavy subset benchmark focused on implementation/debug quality.',
        metadata: {
            owner: 'pga-core',
            createdAt: '2026-02-28',
            updatedAt: '2026-02-28',
            changelog: ['v1: selected coding/debug-focused tasks from core-general-v1 fixture.'],
        },
        tasks: selectTasksById(GENERAL_TASKS, CODING_TASK_IDS),
    },
};

export function getBenchmarkSuite(suiteId = 'core-general-v1'): BenchmarkSuite {
    return BENCHMARK_SUITES[suiteId] || BENCHMARK_SUITES['core-general-v1'];
}
