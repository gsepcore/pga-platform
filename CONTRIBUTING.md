# Contributing to PGA

Thank you for your interest in contributing to PGA! This document provides guidelines for contributing to the project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in Issues
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - System information (OS, Node version, etc.)

### Suggesting Features

1. Check existing issues for similar suggestions
2. Create a new issue with:
   - Clear use case
   - Expected behavior
   - Why this would be useful

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Add tests if applicable
5. Ensure all tests pass: `npm test`
6. Commit with clear messages
7. Push and create a PR

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/pga-platform
cd pga-platform

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Start development
npm run dev
```

## Project Structure

```
pga-platform/
├── packages/
│   ├── core/              # @pga/core - Main engine
│   ├── adapters-llm/      # LLM adapters
│   └── adapters-storage/  # Storage adapters
├── apps/
│   ├── web/              # Landing page
│   ├── docs/             # Documentation
│   └── api/              # Cloud API
└── examples/             # Usage examples
```

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Add proper type definitions
- Avoid `any` types
- Document public APIs with JSDoc

### Style Guide

- Use Prettier for formatting
- Follow existing code patterns
- Write self-documenting code
- Add comments for complex logic

### Testing

- Write tests for new features
- Maintain >80% coverage
- Test edge cases
- Use descriptive test names

### Commits

Follow conventional commits:

```
feat: add new feature
fix: bug fix
docs: documentation changes
test: add tests
refactor: code refactoring
chore: maintenance tasks
```

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT for core, see LICENSE file).

## Questions?

Join our [Discord](https://discord.gg/pga) or open a discussion on GitHub.

---

**Thank you for contributing to PGA!** 🧬
