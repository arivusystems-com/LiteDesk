#!/bin/bash

###############################################################################
# Cleanup Duplicate and Unwanted Markdown Files
###############################################################################

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}"
cat << "EOF"
╔════════════════════════════════════════════════════════╗
║                                                        ║
║      🧹 Cleaning Up Duplicate Documentation           ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

cd /Users/Prabhu/Documents/GitHub/Arivu

# Create docs archive directory
mkdir -p docs/archive

echo -e "${YELLOW}📊 Current status: $(ls -1 *.md 2>/dev/null | wc -l) markdown files${NC}"
echo ""

# =============================================================================
# Files to KEEP (Essential Documentation)
# =============================================================================
KEEP_FILES=(
    "README.md"                          # Main readme
    "DEPLOYMENT_SUMMARY.md"              # Latest deployment guide (just created)
    "TECHNICAL_SPEC.md"                  # Technical specifications
    "GETTING_STARTED.md"                 # Getting started guide
    "TROUBLESHOOTING.md"                 # Main troubleshooting
    "8_WEEK_PRODUCTION_ROADMAP.md"       # Roadmap
)

echo -e "${GREEN}✅ Files to KEEP:${NC}"
for file in "${KEEP_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   • $file"
    fi
done
echo ""

# =============================================================================
# Move to docs/ folder (Good docs but not needed at root)
# =============================================================================
MOVE_TO_DOCS=(
    "ENVIRONMENT_GUIDE.md"
    "START_STOP_GUIDE.md"
    "SCRIPTS_GUIDE.md"
    "DEVELOPER_SETUP.md"
    "PERMISSION_COMPONENTS_GUIDE.md"
    "PERMISSION_ENFORCEMENT.md"
    "DATATABLE_QUICK_REFERENCE.md"
    "DATA_TABLE_USAGE_GUIDE.md"
    "DATATABLE_MASS_ACTIONS_GUIDE.md"
)

echo -e "${BLUE}📁 Moving useful docs to docs/ folder:${NC}"
for file in "${MOVE_TO_DOCS[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" docs/
        echo "   ✓ Moved $file"
    fi
done
echo ""

# =============================================================================
# Archive (Outdated deployment guides - superseded by DEPLOYMENT_SUMMARY.md)
# =============================================================================
ARCHIVE_DEPLOYMENT=(
    "DEPLOYMENT_CHECKLIST.md"
    "DEPLOYMENT_GUIDE.md"
    "DEPLOYMENT_GUIDE_AWS.md"
    "DEPLOY_INSTRUCTIONS.md"
    "DEPLOY_NOW.md"
    "FREE_TIER_DEPLOY.md"
    "QUICK_DEPLOY.md"
    "README_DEPLOYMENT.md"
    "LOCAL_TESTING_GUIDE.md"
)

echo -e "${YELLOW}📦 Archiving old deployment docs:${NC}"
for file in "${ARCHIVE_DEPLOYMENT[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" docs/archive/
        echo "   ✓ Archived $file"
    fi
done
echo ""

# =============================================================================
# Archive (Getting Started duplicates)
# =============================================================================
ARCHIVE_GETTING_STARTED=(
    "START_HERE.md"
    "QUICK_START.md"
    "CHECK_AFTER_REGISTRATION.md"
    "TEST_LOGIN.md"
)

echo -e "${YELLOW}📦 Archiving duplicate getting started docs:${NC}"
for file in "${ARCHIVE_GETTING_STARTED[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" docs/archive/
        echo "   ✓ Archived $file"
    fi
done
echo ""

# =============================================================================
# Archive (Troubleshooting - temporary fixes)
# =============================================================================
ARCHIVE_TROUBLESHOOT=(
    "TROUBLESHOOT_403.md"
    "TROUBLESHOOT_502.md"
    "APICLIENT_FIX.md"
    "CSV_PARSE_FIX.md"
    "DUPLICATE_CHECK_FIX.md"
    "CALENDAR_DARK_MODE_FIX.md"
    "EVENT_MODAL_FIX.md"
    "MODAL_LOADING_FIX.md"
    "MODULE_VISIBILITY_FIX.md"
    "TAILWIND_V4_APPLY_FIX.md"
    "TASKS_BUG_FIXES.md"
)

echo -e "${YELLOW}📦 Archiving temporary fix docs:${NC}"
for file in "${ARCHIVE_TROUBLESHOOT[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" docs/archive/
        echo "   ✓ Archived $file"
    fi
done
echo ""

# =============================================================================
# Archive (Status/Summary - outdated)
# =============================================================================
ARCHIVE_STATUS=(
    "BUILD_SESSION_SUMMARY.md"
    "BUILD_SUMMARY.md"
    "CALENDAR_MODULE_STATUS.md"
    "IMPLEMENTATION_STATUS.md"
    "IMPLEMENTATION_GAP_ANALYSIS.md"
    "MIGRATION_PROGRESS.md"
    "MIGRATION_COMPLETE_SUMMARY.md"
    "PHASE1_IMPLEMENTATION_SUMMARY.md"
    "PROJECT_STATUS.md"
    "SETUP_COMPLETE.md"
)

echo -e "${YELLOW}📦 Archiving outdated status docs:${NC}"
for file in "${ARCHIVE_STATUS[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" docs/archive/
        echo "   ✓ Archived $file"
    fi
done
echo ""

# =============================================================================
# Archive (Feature/Module docs - completed)
# =============================================================================
ARCHIVE_FEATURES=(
    "AUTOMATIC_PERMISSION_SYSTEM.md"
    "CALENDAR_EVENTS_MODULE.md"
    "CSV_ALL_MODULES_COMPLETE.md"
    "DATATABLE_COMPONENT_SUMMARY.md"
    "DATATABLE_MIGRATION_COMPLETE.md"
    "DATATABLE_MIGRATION_EXAMPLE.md"
    "DATATABLE_MIGRATION_SUMMARY.md"
    "DATATABLE_RESIZABLE_FEATURE.md"
    "DEAL_EVENTS_INTEGRATION.md"
    "DUPLICATE_CHECK_FEATURE.md"
    "DYNAMIC_PERMISSION_REFRESH.md"
    "DYNAMIC_ROLE_SYSTEM_INTEGRATION.md"
    "EVENT_ROLLUP_FEATURE.md"
    "FULLCALENDAR_INTEGRATION.md"
    "IMPORT_MODULE_COMPLETE.md"
    "IMPORT_MODULE_PROGRESS.md"
    "MULTI_INSTANCE_IMPLEMENTATION.md"
    "PERMISSION_MATRIX_IMPROVEMENTS.md"
    "RELATED_WIDGETS_FEATURE.md"
    "ROLE_USER_MANAGEMENT.md"
    "TAILWIND_V4_COMPLETE.md"
    "TAILWIND_V4_UPGRADE.md"
    "TASKS_MODULE_COMPLETE.md"
    "UI_CONSISTENCY_COMPLETE.md"
)

echo -e "${YELLOW}📦 Archiving completed feature docs:${NC}"
for file in "${ARCHIVE_FEATURES[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" docs/archive/
        echo "   ✓ Archived $file"
    fi
done
echo ""

# =============================================================================
# Summary
# =============================================================================
echo ""
echo -e "${GREEN}"
cat << "EOF"
╔════════════════════════════════════════════════════════╗
║                                                        ║
║            ✅ Cleanup Complete!                       ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${BLUE}📊 Summary:${NC}"
echo ""
echo -e "${GREEN}✅ Essential docs at root:${NC}"
ls -1 *.md 2>/dev/null | while read file; do echo "   • $file"; done
echo ""
echo -e "${BLUE}📁 Useful docs in docs/:${NC}"
ls -1 docs/*.md 2>/dev/null | while read file; do echo "   • $(basename $file)"; done
echo ""
echo -e "${YELLOW}📦 Archived in docs/archive/:${NC}"
echo "   $(ls -1 docs/archive/*.md 2>/dev/null | wc -l) files archived"
echo ""
echo -e "${GREEN}🎉 Your documentation is now clean and organized!${NC}"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo "   • Main docs: ls -la *.md"
echo "   • Guides: ls -la docs/*.md"
echo "   • Archive: ls -la docs/archive/*.md"
echo ""

