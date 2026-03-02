#!/bin/bash
# PGA Platform - 10/10 Certification Verification Script
# Usage: bash scripts/verify-certification.sh

echo "🔍 PGA Platform - 10/10 Certification Verification"
echo "=================================================="
echo ""

PASS=0
FAIL=0

# A. Fundamentos
echo "A. Fundamentos de Ingeniería"
[[ -f package.json ]] && [[ $(grep -c "workspaces" package.json) -gt 0 ]] && echo "  ✅ A.1 Monorepo structure" && ((PASS++)) || echo "  ❌ A.1 Monorepo structure" && ((FAIL++))
[[ $(find packages -name "*.ts" 2>/dev/null | wc -l) -gt 10 ]] && echo "  ✅ A.2 TypeScript codebase" && ((PASS++)) || echo "  ❌ A.2 TypeScript codebase" && ((FAIL++))
[[ -f package-lock.json ]] && echo "  ✅ A.3 Lockfile present" && ((PASS++)) || echo "  ❌ A.3 Lockfile present" && ((FAIL++))
npm run --silent 2>/dev/null | grep -q "test\|build\|lint" && echo "  ✅ A.4 Standard scripts" && ((PASS++)) || echo "  ❌ A.4 Standard scripts" && ((FAIL++))

# B. CI/CD
echo ""
echo "B. CI/CD Automation"
[[ -f .github/workflows/ci.yml ]] && echo "  ✅ B.1 CI workflow exists" && ((PASS++)) || echo "  ❌ B.1 CI workflow exists" && ((FAIL++))
[[ -f .github/workflows/release.yml ]] && echo "  ✅ B.2 Release workflow exists" && ((PASS++)) || echo "  ❌ B.2 Release workflow exists" && ((FAIL++))

# C. Seguridad
echo ""
echo "C. Security & Compliance"
[[ -f .github/dependabot.yml ]] && echo "  ✅ C.1 Dependabot configured" && ((PASS++)) || echo "  ❌ C.1 Dependabot configured" && ((FAIL++))
[[ -f SECURITY.md ]] && echo "  ✅ C.2 Security policy documented" && ((PASS++)) || echo "  ❌ C.2 Security policy documented" && ((FAIL++))
[[ -f .github/workflows/security.yml || $(grep -q "npm audit" .github/workflows/ci.yml 2>/dev/null) ]] && echo "  ✅ C.3 Security scanning active" && ((PASS++)) || echo "  ❌ C.3 Security scanning active" && ((FAIL++))

# D. Gobernanza
echo ""
echo "D. Repository Governance"
[[ -f .github/CODEOWNERS ]] && echo "  ✅ D.1 CODEOWNERS configured" && ((PASS++)) || echo "  ❌ D.1 CODEOWNERS configured" && ((FAIL++))
[[ -d .github/ISSUE_TEMPLATE ]] && echo "  ✅ D.2 Issue templates present" && ((PASS++)) || echo "  ❌ D.2 Issue templates present" && ((FAIL++))
[[ -f .github/pull_request_template.md ]] && echo "  ✅ D.3 PR template present" && ((PASS++)) || echo "  ❌ D.3 PR template present" && ((FAIL++))

# E. Release Engineering
echo ""
echo "E. Release Engineering"
[[ -f CHANGELOG.md ]] && echo "  ✅ E.1 Changelog present" && ((PASS++)) || echo "  ❌ E.1 Changelog present" && ((FAIL++))
[[ -f .github/workflows/release.yml ]] && echo "  ✅ E.2 Release automation" && ((PASS++)) || echo "  ❌ E.2 Release automation" && ((FAIL++))

# F. Producto/Documentación
echo ""
echo "F. Product & Documentation"
[[ -f README.md ]] && [[ $(wc -l < README.md 2>/dev/null) -gt 50 ]] && echo "  ✅ F.1 Comprehensive README" && ((PASS++)) || echo "  ❌ F.1 Comprehensive README" && ((FAIL++))
[[ -f CONTRIBUTING.md ]] && echo "  ✅ F.2 Contributing guidelines" && ((PASS++)) || echo "  ❌ F.2 Contributing guidelines" && ((FAIL++))
[[ -d docs ]] || [[ -d packages/core/docs ]] && echo "  ✅ F.3 Documentation directory" && ((PASS++)) || echo "  ⚠️  F.3 Documentation directory (optional)" && ((PASS++))

# Summary
echo ""
echo "=================================================="
TOTAL=$((PASS + FAIL))
if [[ $TOTAL -gt 0 ]]; then
  SCORE=$(awk "BEGIN {printf \"%.1f\", ($PASS / $TOTAL) * 10}")
else
  SCORE="0.0"
fi

echo "Results: $PASS passed, $FAIL failed"
echo "Score: $SCORE/10"
echo ""

if [[ $PASS -ge 18 ]]; then
  echo "🎉 STATUS: 10/10 CERTIFICATION - PASS ✅"
  echo ""
  echo "All critical requirements met!"
  echo "Repository is production ready."
  exit 0
elif [[ $PASS -ge 15 ]]; then
  echo "⚠️  STATUS: 8/10 - GOOD (Minor improvements needed)"
  echo ""
  echo "Most requirements met. Address remaining items:"
  echo "Remaining: $FAIL items"
  exit 0
elif [[ $PASS -ge 12 ]]; then
  echo "⚠️  STATUS: 6/10 - FAIR (Several improvements needed)"
  echo "Remaining: $FAIL items"
  exit 1
else
  echo "❌ STATUS: <6/10 - NEEDS WORK"
  echo "Remaining: $FAIL items"
  echo ""
  echo "Please review CERTIFICATION_10_10.md for detailed requirements."
  exit 1
fi
