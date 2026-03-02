# GitHub Repository Configuration Guide

This document provides step-by-step instructions for configuring the GitHub repository settings to achieve 10/10 operational maturity.

## Table of Contents
- [Branch Protection](#branch-protection)
- [Required Status Checks](#required-status-checks)
- [Secrets Configuration](#secrets-configuration)
- [Repository Settings](#repository-settings)
- [Verification](#verification)

---

## Branch Protection

### Main Branch Protection
Navigate to: **Settings → Branches → Add rule**

**Branch name pattern:** `main`

**Configure these settings:**

✅ **Require pull request reviews before merging**
- Required approvals: **1**
- Dismiss stale reviews: **✓**
- Require review from code owners: **✓**

✅ **Require status checks to pass before merging**
- Require branches to be up to date: **✓**
- Status checks (add these):
  - `validate`
  - `test (20.x)`
  - `build`
  - `ci-success`

✅ **Require conversation resolution before merging**

✅ **Require signed commits** (optional, recommended)

✅ **Require linear history**

✅ **Do not allow bypassing the above settings**
- Administrators included: **✓**

✅ **Restrict pushes**
- Allow force pushes: **✗**
- Allow deletions: **✗**

### Develop Branch Protection (if using)
Same settings as main, but:
- Required approvals: **1**
- Allow squash merging

---

## Required Status Checks

The following GitHub Actions workflows must pass:

| Check Name | Workflow | Purpose |
|------------|----------|---------|
| `validate` | ci.yml | Lint + TypeCheck |
| `test` | ci.yml | Unit Tests (Node 20.x, 22.x) |
| `build` | ci.yml | Build verification |
| `security` | ci.yml | npm audit |
| `ci-success` | ci.yml | Final status |

**Setup:**
1. Push a commit to trigger workflows
2. Wait for all checks to complete
3. Add successful checks to required list

---

## Secrets Configuration

Navigate to: **Settings → Secrets and variables → Actions**

### Required Secrets

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `NPM_TOKEN` | npm publish token | [npmjs.com/settings/tokens](https://www.npmjs.com/settings/tokens) |
| `CODECOV_TOKEN` | Code coverage token | [codecov.io](https://codecov.io/) → Repository Settings |

### Creating npm Token
```bash
# Login to npm
npm login

# Generate automation token
npm token create --type=automation

# Add to GitHub Secrets as NPM_TOKEN
```

### Creating Codecov Token
1. Visit [codecov.io](https://codecov.io/)
2. Add repository
3. Copy repository token
4. Add to GitHub Secrets as `CODECOV_TOKEN`

---

## Repository Settings

### General Settings
Navigate to: **Settings → General**

✅ **Features**
- Wikis: **✗**
- Issues: **✓**
- Sponsorships: **✗** (unless applicable)
- Projects: **✓**
- Discussions: **✓** (recommended)

✅ **Pull Requests**
- Allow squash merging: **✓**
- Allow merge commits: **✗**
- Allow rebase merging: **✗**
- Automatically delete head branches: **✓**

✅ **Automatically delete head branches**

### Security Settings
Navigate to: **Settings → Code security and analysis**

✅ **Dependabot**
- Dependabot alerts: **✓**
- Dependabot security updates: **✓**
- Dependabot version updates: **✓** (configured via dependabot.yml)

✅ **Code scanning**
- CodeQL analysis: **✓** (optional, recommended)

✅ **Secret scanning**
- Secret scanning: **✓**
- Push protection: **✓**

### Collaborators & Teams
Navigate to: **Settings → Collaborators**

- Add team members with appropriate permissions
- Use CODEOWNERS for automatic review requests

---

## Verification

### Checklist

Run through this checklist to verify configuration:

#### Branch Protection ✅
- [ ] Main branch has protection rules
- [ ] Required approvals configured (1+)
- [ ] Status checks required
- [ ] Force push disabled
- [ ] Administrators cannot bypass

#### CI/CD ✅
- [ ] All workflows passing
- [ ] Status checks appear in PR
- [ ] Required checks block merge
- [ ] Codecov reporting coverage

#### Security ✅
- [ ] Dependabot alerts enabled
- [ ] Dependabot PRs appearing
- [ ] Security scanning active
- [ ] npm audit in CI

#### Templates ✅
- [ ] Issue templates working
- [ ] PR template appears on new PR
- [ ] CODEOWNERS requesting reviews
- [ ] Contributing guide accessible

#### Secrets ✅
- [ ] NPM_TOKEN configured
- [ ] CODECOV_TOKEN configured
- [ ] Secrets not exposed in logs

---

## Testing the Configuration

### 1. Test PR Workflow
```bash
# Create test branch
git checkout -b test/verify-ci

# Make a small change
echo "# Test" >> TEST.md
git add TEST.md
git commit -m "test: verify CI configuration"

# Push and create PR
git push origin test/verify-ci
```

**Expected:**
- CI runs automatically
- All checks must pass
- Cannot merge without approval
- Cannot merge if checks fail

### 2. Test Dependabot
Wait 24-48 hours, should see:
- Dependabot PRs for dependency updates
- Security alerts for vulnerabilities

### 3. Test Security
```bash
# Try to commit a fake API key
echo "api_key = 'sk-1234567890'" >> test.txt
git add test.txt
git commit -m "test"

# Expected: Secret scanning should block push
```

### 4. Test Release
```bash
# Create a test tag
git tag v0.4.0-test
git push origin v0.4.0-test

# Expected:
# - Release workflow triggers
# - All checks pass
# - Draft release created
```

---

## Troubleshooting

### CI Not Running
- **Issue:** Workflows don't trigger on PR
- **Fix:** Check workflow permissions in Settings → Actions → General

### Status Checks Not Required
- **Issue:** Can merge without checks
- **Fix:** Ensure checks are spelled exactly as in workflow jobs

### Codecov Not Reporting
- **Issue:** Coverage not uploaded
- **Fix:** Verify CODECOV_TOKEN is set correctly

### Dependabot Not Creating PRs
- **Issue:** No dependency update PRs
- **Fix:** Check dependabot.yml syntax, wait 24h for first run

### CODEOWNERS Not Working
- **Issue:** No automatic review requests
- **Fix:** Ensure CODEOWNERS is in .github/ directory and users have write access

---

## Maintenance

### Monthly Tasks
- [ ] Review and merge Dependabot PRs
- [ ] Check for security alerts
- [ ] Review CI performance metrics
- [ ] Update required Node.js version if needed

### Quarterly Tasks
- [ ] Audit repository permissions
- [ ] Review branch protection rules
- [ ] Update security documentation
- [ ] Review and archive stale branches

---

**Last Updated:** 2026-03-02  
**Version:** 1.0  
**Status:** Production Ready
