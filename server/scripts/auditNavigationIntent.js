#!/usr/bin/env node

/**
 * Navigation Intent Audit Script
 * 
 * This script audits all modules/entities in the registry and produces
 * a comprehensive report on navigation intent classification.
 * 
 * Usage: node server/scripts/auditNavigationIntent.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const ModuleDefinition = require('../models/ModuleDefinition');
const AppDefinition = require('../models/AppDefinition');
const getMasterDatabaseUri = require('../utils/getMasterDatabaseUri');

/**
 * Classify a module's navigation intent
 */
function classifyNavigationIntent(module) {
  const appKey = (module.appKey || '').toLowerCase();
  const navigationCore = module.ui?.navigationCore || false;
  const navigationEntity = module.ui?.navigationEntity || false;
  const excludeFromApps = module.ui?.excludeFromApps || false;
  const showInSidebar = module.ui?.showInSidebar !== false;

  // Determine classification
  let classification = 'UNKNOWN';
  let navVisible = false;
  let rationale = '';

  if (navigationCore === true) {
    classification = 'CORE';
    navVisible = showInSidebar;
    rationale = 'Personal/attention layer item (Home, Inbox, Reports). Virtual item, not a module.';
  } else if (navigationEntity === true) {
    classification = 'ENTITY';
    navVisible = showInSidebar;
    rationale = 'Shared system primitive. Appears in Entities section, excluded from Apps section.';
  } else if (appKey === 'platform' || appKey === '') {
    if (navigationEntity === false && navigationCore === false) {
      classification = 'SETTINGS_ONLY';
      navVisible = false;
      rationale = 'Platform-level module without navigation intent flags. Settings-only or internal use.';
    } else {
      classification = 'ENTITY';
      navVisible = showInSidebar;
      rationale = 'Platform-level entity (should have navigationEntity: true).';
    }
  } else {
    // Has appKey (sales, helpdesk, audit, etc.)
    if (excludeFromApps === true) {
      classification = 'ENTITY';
      navVisible = showInSidebar && navigationEntity === true;
      rationale = 'App-owned module marked excludeFromApps. Should be in Entities section if navigationEntity: true.';
    } else {
      classification = 'APP_OWNED';
      navVisible = showInSidebar;
      rationale = 'App-owned module. Appears in Apps section under its app.';
    }
  }

  return {
    classification,
    navVisible,
    rationale,
    flags: {
      navigationCore,
      navigationEntity,
      excludeFromApps,
      showInSidebar
    }
  };
}

/**
 * Validate module against sidebar rules
 */
function validateModule(module, classification) {
  const errors = [];
  const warnings = [];

  const appKey = (module.appKey || '').toLowerCase();
  const navigationCore = module.ui?.navigationCore || false;
  const navigationEntity = module.ui?.navigationEntity || false;
  const excludeFromApps = module.ui?.excludeFromApps || false;

  // Rule 1: navigationEntity and appKey cannot both be set (except 'platform')
  if (navigationEntity === true && appKey && appKey !== 'platform') {
    errors.push(`Module has navigationEntity: true but appKey is '${appKey}'. Entities cannot belong to business apps.`);
  }

  // Rule 2: navigationCore and appKey cannot both be set (except 'platform')
  if (navigationCore === true && appKey && appKey !== 'platform') {
    errors.push(`Module has navigationCore: true but appKey is '${appKey}'. Core items cannot belong to business apps.`);
  }

  // Rule 3: excludeFromApps should typically be set with navigationEntity
  if (excludeFromApps === true && navigationEntity !== true && classification !== 'CORE') {
    warnings.push(`Module has excludeFromApps: true but navigationEntity is not set. Consider setting navigationEntity: true for core entities.`);
  }

  // Rule 4: Platform entities should have navigationEntity: true
  if (appKey === 'platform' && navigationEntity !== true && navigationCore !== true && classification !== 'SETTINGS_ONLY') {
    warnings.push(`Platform-level module should have explicit navigation intent (navigationEntity: true or navigationCore: true).`);
  }

  // Rule 5: App-owned modules should not have navigationEntity or navigationCore
  if (appKey && appKey !== 'platform' && (navigationEntity === true || navigationCore === true)) {
    errors.push(`App-owned module (appKey: '${appKey}') should not have navigationEntity or navigationCore flags.`);
  }

  return { errors, warnings };
}

async function auditNavigationIntent() {
  try {
    console.log('🔍 Navigation Intent Audit\n');
    console.log('Connecting to database...\n');

    const masterUri = getMasterDatabaseUri();
    await mongoose.connect(masterUri);
    console.log('✅ Connected to MongoDB\n');

    // Get all apps
    const apps = await AppDefinition.find({}).sort({ 'ui.sidebarOrder': 1 });
    console.log(`📦 Found ${apps.length} apps\n`);

    // Get all modules
    const modules = await ModuleDefinition.find({}).sort({ appKey: 1, 'ui.sidebarOrder': 1 });
    console.log(`📦 Found ${modules.length} modules\n`);

    // Group modules by app
    const modulesByApp = {};
    for (const module of modules) {
      const appKey = (module.appKey || 'platform').toLowerCase();
      if (!modulesByApp[appKey]) {
        modulesByApp[appKey] = [];
      }
      modulesByApp[appKey].push(module);
    }

    // Audit each module
    const auditResults = [];
    let totalErrors = 0;
    let totalWarnings = 0;

    for (const module of modules) {
      const classification = classifyNavigationIntent(module);
      const validation = validateModule(module, classification.classification);
      
      totalErrors += validation.errors.length;
      totalWarnings += validation.warnings.length;

      auditResults.push({
        moduleKey: module.moduleKey,
        appKey: module.appKey || 'platform',
        label: module.label,
        classification: classification.classification,
        navVisible: classification.navVisible,
        rationale: classification.rationale,
        flags: classification.flags,
        errors: validation.errors,
        warnings: validation.warnings,
        route: module.ui?.routeBase || `/${module.moduleKey}`,
        showInSidebar: module.ui?.showInSidebar !== false
      });
    }

    // Generate report
    console.log('='.repeat(80));
    console.log('NAVIGATION INTENT AUDIT REPORT');
    console.log('='.repeat(80));
    console.log(`\nTotal Modules: ${modules.length}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Total Warnings: ${totalWarnings}\n`);

    // Group by classification
    const byClassification = {};
    for (const result of auditResults) {
      if (!byClassification[result.classification]) {
        byClassification[result.classification] = [];
      }
      byClassification[result.classification].push(result);
    }

    // Print summary by classification
    console.log('📊 SUMMARY BY CLASSIFICATION\n');
    for (const [classification, items] of Object.entries(byClassification)) {
      console.log(`${classification}: ${items.length} modules`);
      for (const item of items) {
        const status = item.errors.length > 0 ? '❌' : item.warnings.length > 0 ? '⚠️' : '✅';
        console.log(`  ${status} ${item.moduleKey} (${item.appKey}) - ${item.label}`);
      }
      console.log('');
    }

    // Print detailed table
    console.log('\n' + '='.repeat(80));
    console.log('DETAILED MODULE CLASSIFICATION');
    console.log('='.repeat(80));
    console.log('\n| Module | App | Classification | Nav Visible | navigationCore | navigationEntity | excludeFromApps | Errors | Warnings |');
    console.log('|--------|-----|----------------|-------------|----------------|-----------------|-----------------|--------|----------|');
    
    for (const result of auditResults.sort((a, b) => {
      const order = { 'CORE': 1, 'ENTITY': 2, 'APP_OWNED': 3, 'SETTINGS_ONLY': 4, 'UNKNOWN': 5 };
      return (order[a.classification] || 99) - (order[b.classification] || 99);
    })) {
      const errorsStr = result.errors.length > 0 ? `${result.errors.length}` : '-';
      const warningsStr = result.warnings.length > 0 ? `${result.warnings.length}` : '-';
      console.log(`| ${result.moduleKey} | ${result.appKey} | ${result.classification} | ${result.navVisible ? '✅' : '❌'} | ${result.flags.navigationCore ? '✅' : '❌'} | ${result.flags.navigationEntity ? '✅' : '❌'} | ${result.flags.excludeFromApps ? '✅' : '❌'} | ${errorsStr} | ${warningsStr} |`);
    }

    // Print errors and warnings
    if (totalErrors > 0 || totalWarnings > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('ISSUES REQUIRING ATTENTION');
      console.log('='.repeat(80));
      
      for (const result of auditResults) {
        if (result.errors.length > 0 || result.warnings.length > 0) {
          console.log(`\n📦 ${result.moduleKey} (${result.appKey})`);
          if (result.errors.length > 0) {
            console.log('  ❌ ERRORS:');
            for (const error of result.errors) {
              console.log(`    - ${error}`);
            }
          }
          if (result.warnings.length > 0) {
            console.log('  ⚠️  WARNINGS:');
            for (const warning of result.warnings) {
              console.log(`    - ${warning}`);
            }
          }
        }
      }
    }

    // Generate JSON output for document
    const jsonOutput = {
      auditDate: new Date().toISOString(),
      summary: {
        totalModules: modules.length,
        totalErrors,
        totalWarnings,
        byClassification: Object.keys(byClassification).reduce((acc, key) => {
          acc[key] = byClassification[key].length;
          return acc;
        }, {})
      },
      modules: auditResults.map(r => ({
        moduleKey: r.moduleKey,
        appKey: r.appKey,
        label: r.label,
        route: r.route,
        classification: r.classification,
        navVisible: r.navVisible,
        rationale: r.rationale,
        flags: r.flags,
        errors: r.errors,
        warnings: r.warnings
      }))
    };

    await mongoose.connection.close();
    console.log('\n✅ Audit complete');
    console.log('\n💡 Next steps:');
    console.log('   1. Review the issues above');
    console.log('   2. Update module definitions with explicit navigation intent flags');
    console.log('   3. Run this script again to verify fixes');
    console.log('   4. Generate NAVIGATION_INTENT_AUDIT.md from the results\n');

    return jsonOutput;

  } catch (error) {
    console.error('❌ Error during audit:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  auditNavigationIntent().then((jsonOutput) => {
    // Optionally write JSON to file
    const fs = require('fs');
    const path = require('path');
    const outputPath = path.join(__dirname, '../NAVIGATION_INTENT_AUDIT.json');
    fs.writeFileSync(outputPath, JSON.stringify(jsonOutput, null, 2));
    console.log(`📄 JSON output written to: ${outputPath}`);
    process.exit(0);
  }).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = auditNavigationIntent;

