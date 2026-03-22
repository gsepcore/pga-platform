# Contributing to GSEP Platform

Thank you for your interest in contributing to GSEP (Genomic Self-Evolving Prompts)! Every contribution helps make AI agents smarter, more adaptive, and more resilient.

## Table of Contents
- [Contributor License Agreement (CLA)](#contributor-license-agreement-cla)
- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)
- [Contributors](#contributors)
- [Sponsors](#sponsors)

## Contributor License Agreement (CLA)

By submitting a pull request, you agree that:

1. **Your contribution is your original work**, or you have the right to submit it.
2. **You grant GSEP a perpetual, worldwide, non-exclusive, royalty-free license** to use, reproduce, modify, and distribute your contribution as part of the project.
3. **You understand** that your contribution will be licensed under the same license as the component you are contributing to (MIT for core and adapters, BSL 1.1 for Gene Registry).
4. **You will not** submit code that infringes on third-party patents, copyrights, or trade secrets.

This CLA is necessary to protect the project, its users, and its contributors. No separate signing process is required — submitting a PR constitutes your agreement.

For questions about the CLA, contact: legal@gsepcore.com

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. We expect:

- Respectful communication
- Constructive feedback
- Focus on the project's goals
- Openness to different perspectives

## Ways to Contribute

There are many ways to contribute, not just code:

| Contribution | Description |
|---|---|
| **Bug Reports** | Found a bug? [Open an issue](https://github.com/gsepcore/gsep/issues/new) |
| **Feature Requests** | Have an idea? Start a [Discussion](https://github.com/gsepcore/gsep/discussions) |
| **Code** | Fix bugs, add features, improve performance |
| **Documentation** | Improve README, guides, JSDoc comments |
| **LLM Adapters** | Add support for new LLM providers |
| **Storage Adapters** | Add new persistence backends (Redis, DynamoDB, etc.) |
| **Tests** | Improve test coverage, add edge cases |
| **Translations** | Help translate docs to other languages |
| **Star the repo** | ⭐ [Star us on GitHub](https://github.com/gsepcore/gsep) — it helps more than you think! |

## Getting Started

### Prerequisites
- Node.js >= 20.0.0
- npm >= 9.0.0
- Git

### Initial Setup
```bash
# Clone the repository
git clone https://github.com/gsepcore/gsep.git
cd pga-platform

# Install dependencies
npm install

# Run tests to verify setup
npm test

# Build the project
npm run build
```

### Project Structure
```
pga-platform/
├── packages/
│   ├── core/                          # @gsep/core (MIT License)
│   │   ├── src/                       # Source code
│   │   │   ├── types/                 # TypeScript type definitions
│   │   │   ├── core/                  # GenomeKernel, PGA orchestrator
│   │   │   ├── evolution/             # DriftAnalyzer, Fitness, Mutations
│   │   │   ├── memory/               # LayeredMemory, MemoryCompactor
│   │   │   ├── reasoning/            # ReasoningEngine, ThinkingEngine
│   │   │   └── monitoring/           # Monitoring system
│   │   ├── __tests__/                # Unit tests (Vitest)
│   │   └── dist/                     # Built output
│   ├── adapters-llm-anthropic/       # Claude adapter
│   ├── adapters-llm-openai/          # OpenAI adapter
│   └── adapters-storage-postgres/    # PostgreSQL adapter
├── examples/                         # Working examples
├── landing/                          # Landing page (gsepcore.com)
├── video/                            # Remotion demo video
└── .github/                          # GitHub workflows and templates
```

## Development Workflow

### 1. Create a Branch
```bash
# Feature branches
git checkout -b feature/your-feature-name

# Bug fix branches
git checkout -b fix/bug-description

# Documentation branches
git checkout -b docs/what-you-are-documenting
```

### 2. Make Your Changes
- Write clean, readable code
- Follow existing code style
- Add tests for new functionality
- Update documentation as needed

### 3. Commit Your Changes
We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format: <type>(<scope>): <description>

# Examples:
git commit -m "feat(gene-bank): add gene recombination feature"
git commit -m "fix(mutation): resolve fitness calculation bug"
git commit -m "docs(readme): update installation instructions"
git commit -m "test(rag): add integration tests for RAG system"
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style (formatting, no logic changes)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### 4. Push and Create PR
```bash
git push origin your-branch-name
```

Then create a Pull Request on GitHub.

## Code Standards

### TypeScript
- Use TypeScript strict mode
- Prefer interfaces over types for object shapes
- Use Zod for runtime validation
- Document complex types

### Style Guide
```typescript
// Good
interface GeneConfig {
  tenantId: string;
  minFitness: number;
}

function extractGene(config: GeneConfig): Gene {
  const validator = GeneConfigSchema.parse(config);
  return createGene(validator);
}

// Avoid
function eg(c: any): any {
  return { ...c };
}
```

### Documentation
- Add JSDoc comments for public APIs
- Include examples in documentation
- Keep README.md updated
- Document breaking changes

### Error Handling
```typescript
// Good
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  logger.error('Operation failed', { error });
  return { success: false, error: error.message };
}

// Avoid
const result = await riskyOperation(); // No error handling
```

## Testing

We use **Vitest** as our test framework.

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- gene-bank.test.ts
```

### Writing Tests
```typescript
import { describe, it, expect } from 'vitest';

describe('GeneBank', () => {
  it('should store a valid gene', async () => {
    const gene = createMockGene();
    await geneBank.storeGene(gene);

    const retrieved = await geneBank.getGene(gene.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(gene.id);
  });
});
```

### Test Coverage
- Aim for >= 80% coverage
- Test edge cases
- Test error conditions
- Test async operations

## Submitting Changes

### Pull Request Checklist
Before submitting a PR, ensure:

- [ ] Code compiles: `npm run typecheck`
- [ ] Tests pass: `npm test`
- [ ] Linter passes: `npm run lint`
- [ ] Build works: `npm run build`
- [ ] Documentation updated
- [ ] PR description is clear and complete
- [ ] Breaking changes are clearly marked

### Review Process
1. **Automated Checks**: CI must pass
2. **Code Review**: At least 1 approval required
3. **Testing**: Reviewer may test locally
4. **Merge**: Squash and merge to main

### After Merge
- Delete your feature branch
- Update your local main branch
- Check that CI passes on main

## Release Process

### Version Numbering
We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes

### Creating a Release
1. Update version in `packages/core/package.json`
2. Update CHANGELOG.md
3. Create and push a tag:
   ```bash
   git tag -a v0.8.0 -m "Release v0.8.0"
   git push origin v0.8.0
   ```
4. GitHub Actions will automatically:
   - Run all checks
   - Publish to npm
   - Create GitHub release

## Getting Help

- **Website**: [gsepcore.com](https://gsepcore.com)
- **Discussions**: [GitHub Discussions](https://github.com/gsepcore/gsep/discussions)
- **Issues**: [GitHub Issues](https://github.com/gsepcore/gsep/issues)
- **Email**: contact@gsepcore.com

---

## Contributors

Every person who contributes to GSEP is recognized here. Thank you for making AI evolution open and accessible.

<a href="https://github.com/gsepcore/gsep/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=gsepcore/gsep" alt="GSEP Contributors" />
</a>

### How You Get Recognized

| Contribution Type | Recognition |
|---|---|
| Code (merged PR) | Avatar in Contributors wall + release notes |
| Bug report (confirmed) | Mentioned in fix commit |
| Documentation | Avatar in Contributors wall |
| LLM/Storage adapter | Listed as adapter author in package README |
| Significant contribution | Added to `package.json` contributors field |

### First-Time Contributors

New to open source? Look for issues labeled [`good first issue`](https://github.com/gsepcore/gsep/labels/good%20first%20issue) — they are specifically designed to help you get started.

---

## Sponsors

GSEP is built and maintained by [Luis Alfredo Velasquez Duran](https://github.com/LuisvelMarketer) as an independent open-source project. Sponsorship helps ensure continued development, maintenance, and new features.

<a href="https://github.com/sponsors/gsepcore">
  <img src="https://img.shields.io/badge/Become_a_Sponsor-%E2%9D%A4-pink?style=for-the-badge&logo=githubsponsors" alt="Become a Sponsor">
</a>

### Sponsor Tiers

| Tier | Monthly | Perks |
|------|---------|-------|
| **Backer** | $5 | Name listed in Contributors |
| **Supporter** | $25 | Logo in README + priority issue responses |
| **Gold Sponsor** | $100 | Large logo in README + quarterly roadmap input |
| **Enterprise** | Custom | Dedicated support, custom features, SLA |

### Current Sponsors

<!-- SPONSORS:START -->
*Be the first to sponsor GSEP! Your logo and link will appear here.*
<!-- SPONSORS:END -->

### Why Sponsor?

- **Sustainability** — Keep GSEP maintained and actively developed
- **Visibility** — Your brand seen by thousands of AI developers
- **Influence** — Input on the roadmap and feature priorities
- **Support** — Priority responses on issues and feature requests
- **Community** — Support the open-source AI ecosystem

---

<div align="center">

Thank you for contributing to **GSEP** 🧬

Your code, ideas, and support make AI evolution open and accessible to everyone.

</div>
