#!/bin/bash

# Repository Cleanup Script
# This script safely removes redundant files WITHOUT breaking K8s deployment
#
# Your deployment uses:
# - backend/Dockerfile (GitHub Actions line 59)
# - frontend/Dockerfile (GitHub Actions line 71)
# - k8s/ folder (kubectl apply)
#
# This script does NOT touch those files.

set -e  # Exit on error

echo "========================================="
echo "JAG LIMS Repository Cleanup Script"
echo "========================================="
echo ""
echo "This will remove redundant files and fix GitHub Pages build."
echo "Your K8s deployment will NOT be affected."
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

# Phase 1: Redundant Dockerfiles (SAFE - not used by CI/CD)
echo ""
echo "Phase 1: Removing redundant Dockerfiles..."
echo "  Keeping: backend/Dockerfile and frontend/Dockerfile"
rm -f Dockerfile
rm -f Dockerfile.backend
rm -f Dockerfile.complete
rm -f Dockerfile.frontend
rm -f Dockerfile.jenkins
rm -f Dockerfile.production
rm -f Dockerfile.production-optimized
rm -f Dockerfile.unified
rm -f Dockerfile.working
echo "✓ Removed 9 redundant Dockerfiles"

# Phase 2: Backup and Archive folders
echo ""
echo "Phase 2: Removing backup/archive folders..."
rm -rf backup/
rm -rf archive/
echo "✓ Removed backup/ and archive/ folders"

# Phase 3: Tar archives (154MB!)
echo ""
echo "Phase 3: Removing tar archives..."
rm -f frontend-src.tar.gz
rm -f jagdna-frontend.tar.gz
echo "✓ Removed tar archives (~154MB saved)"

# Phase 4: Build artifacts
echo ""
echo "Phase 4: Removing build artifacts..."
rm -f bundle-analysis.html
rm -rf dist/
echo "✓ Removed build artifacts (rebuild with: npm run build)"

# Phase 5: Test/debug files
echo ""
echo "Phase 5: Removing test and debug files from root..."
rm -f test-build.js
rm -f test-dashboard.html
rm -f test-fix.html
rm -f test-forensic-workflow.js
rm -f test-react-fix.html
rm -f test-workflow-simple.js
rm -f test-workflow.js
rm -f verify-fix.js
echo "✓ Removed 8 test/debug files"

# Phase 6: Old SQL scripts
echo ""
echo "Phase 6: Removing old SQL scripts..."
rm -f create-paternity-samples.sql
rm -f create-test-samples.sql
rm -f fix-workflow-connectivity.sql
rm -f fix-workflow-connectivity-v2.sql
rm -f generate-samples.sql
echo "✓ Removed 5 old SQL scripts"

# Phase 7: Redundant K8s manifests at root
echo ""
echo "Phase 7: Removing redundant K8s manifests from root..."
echo "  Keeping: k8s/ folder (used by deployment)"
rm -f k8s-deployment.yaml
rm -f k8s-lims-full.yaml
rm -f k8s-pgbouncer-addon.yaml
rm -f k8s-production-fix.yaml
rm -f k8s-production-postgresql.yaml
echo "✓ Removed 5 old K8s manifest files"

# Phase 8: Redundant documentation
echo ""
echo "Phase 8: Consolidating documentation..."
echo "  Keeping: README.md and DEPLOYMENT.md"
rm -f LIMS_DEPLOYMENT_GUIDE.md
rm -f PRODUCTION_CHECKLIST.md
rm -f PRODUCTION_DEPLOYMENT_FIXES.md
rm -f QUICK_REFERENCE.md
rm -f learning-journey.md
echo "✓ Removed 5 redundant documentation files"

# Phase 9: Update .gitignore
echo ""
echo "Phase 9: Updating .gitignore..."
cat >> .gitignore << 'EOF'

# === Added by cleanup script ===
# Build artifacts
dist/
bundle-analysis.html

# Archives and backups
*.tar.gz
*.tgz
backup/
archive/

# Test files in root
test-*.js
test-*.html
verify-*.js

# Node modules (should already be here)
node_modules/
backend/node_modules/
EOF
echo "✓ Updated .gitignore"

# Phase 10: Remove node_modules if accidentally committed
echo ""
echo "Phase 10: Checking for committed node_modules..."
if git ls-files | grep -q "node_modules"; then
    echo "  WARNING: node_modules/ is tracked by git!"
    echo "  Run this manually to remove it:"
    echo "    git rm -r --cached node_modules/ backend/node_modules/"
    echo "    git commit -m 'Remove node_modules from git tracking'"
else
    echo "✓ node_modules is not tracked (good)"
fi

echo ""
echo "========================================="
echo "Cleanup Complete!"
echo "========================================="
echo ""
echo "Estimated space saved: ~200MB"
echo ""
echo "Next steps:"
echo "1. Review changes: git status"
echo "2. Test build: npm run build"
echo "3. Commit changes: git add . && git commit -m 'chore: Clean up repository structure'"
echo "4. Push: git push origin main"
echo ""
echo "Your K8s deployment will continue working because we kept:"
echo "  ✓ backend/Dockerfile"
echo "  ✓ frontend/Dockerfile"
echo "  ✓ k8s/ folder"
echo "  ✓ src/ and backend/ source code"
echo ""
echo "This will also FIX your GitHub Pages build by removing problematic files."
echo ""
