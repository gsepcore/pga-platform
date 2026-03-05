# Contributing to PGA Platform

Thank you for your interest in contributing to PGA! This document provides guidelines and instructions for contributing.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. We expect:

- Respectful communication
- Constructive feedback
- Focus on the project's goals
- Openness to different perspectives

## Getting Started

### Prerequisites
- Node.js >= 20.0.0
- npm >= 9.0.0
- Git

### Initial Setup
```bash
# Clone the repository
git clone https://github.com/pga-ai/pga-platform.git
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
│   └── core/          # PGA Core package
│       ├── src/       # Source code
│       ├── dist/      # Built output
│       └── tests/     # Unit tests
├── examples/          # Example implementations
├── docs/              # Documentation
└── .github/           # GitHub workflows and templates
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
// ✅ Good
interface GeneConfig {
  tenantId: string;
  minFitness: number;
}

function extractGene(config: GeneConfig): Gene {
  // Clear, descriptive names
  const validator = GeneConfigSchema.parse(config);
  return createGene(validator);
}

// ❌ Avoid
function eg(c: any): any {
  // Unclear, no validation
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
// ✅ Good
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  logger.error('Operation failed', { error });
  return { success: false, error: error.message };
}

// ❌ Avoid
const result = await riskyOperation(); // No error handling
```

## Testing

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
- [ ] CHANGELOG.md updated (if applicable)
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
   git tag -a v0.4.0 -m "Release v0.4.0"
   git push origin v0.4.0
   ```
4. GitHub Actions will automatically:
   - Run all checks
   - Publish to npm
   - Create GitHub release

## Getting Help

- 📚 **Documentation**: https://pgacore.com/docs
- 💬 **Discussions**: GitHub Discussions
- 🐛 **Issues**: GitHub Issues
- 📧 **Email**: contact@pgacore.com

## Recognition

Contributors are recognized in:
- CONTRIBUTORS.md
- GitHub Contributors page
- Release notes

Thank you for contributing to PGA! 🎉
