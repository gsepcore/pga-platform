# Security Policy

## Supported Versions

We actively support and provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.8.x   | :white_check_mark: |
| 0.7.x   | :white_check_mark: |
| < 0.7   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them to our security team:

### Email
Send an email to: **security@gsepcore.com**

### What to Include
Please include as much information as possible:

- Type of vulnerability
- Full description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)
- Your contact information

### Response Timeline

- **Initial Response:** Within 48 hours
- **Status Update:** Within 7 days
- **Fix Timeline:** Depends on severity
  - **Critical:** 1-7 days
  - **High:** 7-30 days
  - **Medium:** 30-90 days
  - **Low:** Best effort

## Security Update Process

1. **Triage:** We evaluate the report and determine severity
2. **Fix:** We develop and test a fix in a private repository
3. **Disclosure:** We coordinate disclosure with the reporter
4. **Release:** We publish a security advisory and release a patch
5. **Notification:** We notify affected users via GitHub Security Advisories

## Security Best Practices

When using GSEP Platform:

### For Developers
- Always use the latest stable version
- Enable Dependabot alerts
- Review dependency updates regularly
- Never commit secrets or API keys
- Use environment variables for sensitive data
- Enable branch protection rules
- Require code reviews before merging

### For Production
- Use secure credential management (e.g., AWS Secrets Manager, HashiCorp Vault)
- Enable audit logging
- Implement rate limiting
- Use TLS/SSL for all connections
- Keep dependencies up to date
- Monitor security advisories

## Known Security Considerations

### LLM API Keys
- **Risk:** Exposed API keys can lead to unauthorized usage
- **Mitigation:** Use environment variables, never commit keys to repositories
- **Best Practice:** Rotate keys regularly, use key management services

### C0 Chromosome Integrity
- **Risk:** Tampering with immutable DNA layer could compromise agent identity
- **Mitigation:** SHA-256 integrity verification on C0 layer
- **Best Practice:** Never expose C0 mutation endpoints; always validate hashes

### Prompt Injection
- **Risk:** Malicious input in prompts could affect agent behavior
- **Mitigation:** C3 Content Firewall validates and sanitizes all inputs
- **Best Practice:** Enable the Content Firewall in production environments

### Indirect Prompt Injection (Output)
- **Risk:** Agent's own response could be manipulated by IPI embedded in context
- **Mitigation:** C4 Behavioral Immune System scans all output with 6 deterministic checks, auto-quarantine, and self-healing pipeline
- **Best Practice:** C4 activates automatically with C3 — no extra configuration needed

### Data Privacy
- **Risk:** Sensitive data in prompts sent to external LLM APIs
- **Mitigation:** Sanitize data before sending to LLMs
- **Best Practice:** Use on-premises models for sensitive data

## Security Tools

We use the following tools to maintain security:

- **Dependabot:** Automated security-only dependency updates (weekly)
- **npm audit:** Vulnerability scanning
- **GitHub Security Advisories:** Coordinated vulnerability disclosure
- **Branch Protection:** Required reviews and status checks on main

## Hall of Fame

We recognize and thank security researchers who responsibly disclose vulnerabilities:

<!-- List will be updated as reports are received -->

---

**Last Updated:** 2026-03-06
**Version:** 2.0
