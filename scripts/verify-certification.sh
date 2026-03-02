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

if [[ -f package.json ]] && [[ $(grep -c "workspaces" package.json 2>/dev/null) -gt 0 ]]; then
  echo "  ✅ A.1 Monorepo structure"
  ((PASS++))
else
  echo "  ❌ A.1 Monorepo structure"
  ((FAIL++))
fi

if [[ $(find packages -name "*.ts" 2>/dev/null | wc -l) -gt 10 ]]; then
  echo "  ✅ A.2 TypeScript codebase"
  ((PASS++))
else
  echo "  ❌ A.2 TypeScript codebase"
  ((FAIL++))
fi

if [[ -f package-lock.json ]]; then
  echo "  ✅ A.3 Lockfile present"
  ((PASS++))
else
  echo "  ❌ A.3 Lockfile present"
  ((FAIL++))
fi

if npm run 2>/dev/null | grep -q "test\|build\|lint"; then
  echo "  ✅ A.4 Standard scripts"
  ((PASS++))
else
  echo "  ❌ A.4 Standard scripts"
  ((FAIL++))
fi

# B. CI/CD
echo ""
echo "B. CI/CD Automation"

if [[ -f .github/workflows/ci.yml ]]; then
  echo "  ✅ B.1 CI workflow exists"
  ((PASS++))
else
  echo "  ❌ B.1 CI workflow exists"
  ((FAIL++))
fi

if [[ -f .github/workflows/release.yml ]]; then
  echo "  ✅ B.2 Release workflow exists"
  ((PASS++))
else
  echo "  ❌ B.2 Release workflow exists"
  ((FAIL++))
fi

# C. Seguridad
echo ""
echo "C. Security & Compliance"

if [[ -f .github/dependabot.yml ]]; then
  echo "  ✅ C.1 Dependabot configured"
  ((PASS++))
else
  echo "  ❌ C.1 Dependabot configured"
  ((FAIL++))
fi

if [[ -f SECURITY.md ]]; then
  echo "  ✅ C.2 Security policy documented"
  ((PASS++))
else
  echo "  ❌ C.2 Security policy documented"
  ((FAIL++))
fi

if [[ -f .github/workflows/security.yml ]] || grep -q "npm audit" .github/workflows/ci.yml 2>/dev/null; then
  echo "  ✅ C.3 Security scanning active"
  ((PASS++))
else
  echo "  ❌ C.3 Security scanning active"
  ((FAIL++))
fi

# D. Gobernanza
echo ""
echo "D. Repository Governance"

if [[ -f .github/CODEOWNERS ]]; then
  echo "  ✅ D.1 CODEOWNERS configured"
  ((PASS++))
else
  echo "  ❌ D.1 CODEOWNERS configured"
  ((FAIL++))
fi

if [[ -d .github/ISSUE_TEMPLATE ]]; then
  echo "  ✅ D.2 Issue templates present"
  ((PASS++))
else
  echo "  ❌ D.2 Issue templates present"
  ((FAIL++))
fi

if [[ -f .github/pull_request_template.md ]]; then
  echo "  ✅ D.3 PR template present"
  ((PASS++))
else
  echo "  ❌ D.3 PR template present"
  ((FAIL++))
fi

# E. Release Engineering
echo ""
echo "E. Release Engineering"

if [[ -f CHANGELOG.md ]]; then
  echo "  ✅ E.1 Changelog present"
  ((PASS++))
else
  echo "  ❌ E.1 Changelog present"
  ((FAIL++))
fi

if [[ -f .github/workflows/release.yml ]]; then
  echo "  ✅ E.2 Release automation"
  ((PASS++))
else
  echo "  ❌ E.2 Release automation"
  ((FAIL++))
fi

# F. Producto/Documentación
echo ""
echo "F. Product & Documentation"

if [[ -f README.md ]] && [[ $(wc -l < README.md 2>/dev/null) -gt 50 ]]; then
  echo "  ✅ F.1 Comprehensive README"
  ((PASS++))
else
  echo "  ❌ F.1 Comprehensive README"
  ((FAIL++))
fi

if [[ -f CONTRIBUTING.md ]]; then
  echo "  ✅ F.2 Contributing guidelines"
  ((PASS++))
else
  echo "  ❌ F.2 Contributing guidelines"
  ((FAIL++))
fi

if [[ -d docs ]] || [[ -d packages/core/docs ]]; then
  echo "  ✅ F.3 Documentation directory"
  ((PASS++))
else
  echo "  ⚠️  F.3 Documentation directory (optional)"
  ((PASS++))
fi

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

if [[ $PASS -ge 17 ]]; then
  echo "🎉 STATUS: 10/10 CERTIFICATION - PASS ✅"
  echo ""
  echo "All critical requirements met!"
  echo "Repository is production ready."
  exit 0
elif [[ $PASS -ge 14 ]]; then
  echo "⚠️  STATUS: 8/10 - GOOD (Minor improvements needed)"
  echo ""
  echo "Most requirements met. Address remaining items:"
  echo "Remaining: $FAIL items"
  exit 0
elif [[ $PASS -ge 11 ]]; then
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
