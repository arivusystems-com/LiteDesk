#!/usr/bin/env node

/**
 * One-time migration: normalize Helpdesk module naming to Cases.
 *
 * Updates Helpdesk case-surface module metadata from Ticket/Tickets/Ticklets
 * naming to Cases (platform + org-specific ModuleDefinition docs), and aligns
 * tenant label overrides in TenantModuleConfiguration.
 *
 * Default mode is DRY-RUN (no writes).
 * Persist changes with:
 *   node scripts/migrateHelpdeskCasesModuleNaming.js --apply
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const ModuleDefinition = require('../models/ModuleDefinition');
const TenantModuleConfiguration = require('../models/TenantModuleConfiguration');

function resolveMongoUri() {
  const isProduction = process.env.NODE_ENV === 'production';
  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    (isProduction ? process.env.MONGO_URI_PRODUCTION : process.env.MONGO_URI_LOCAL) ||
    process.env.MONGO_URI_ATLAS;

  if (!mongoUri) {
    console.error(
      'Missing Mongo URI. Set MONGODB_URI or MONGO_URI in server/.env (or MONGO_URI_LOCAL / MONGO_URI_ATLAS).'
    );
    process.exit(1);
  }
  return mongoUri;
}

function isLegacyTicketName(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized.includes('ticket') || normalized.includes('ticklet');
}

function isHelpdeskCaseSurface(moduleDoc) {
  const appKey = String(moduleDoc?.appKey || '').toLowerCase();
  if (appKey !== 'helpdesk') return false;
  const moduleKey = String(moduleDoc?.moduleKey || '').toLowerCase();
  const routeBase = String(moduleDoc?.ui?.routeBase || '').trim().toLowerCase().replace(/\/+$/, '');
  return (
    moduleKey === 'cases' ||
    moduleKey === 'ticket' ||
    moduleKey === 'tickets' ||
    moduleKey === 'ticklets' ||
    routeBase === '/cases' ||
    routeBase === 'cases' ||
    routeBase === '/helpdesk/cases' ||
    isLegacyTicketName(moduleDoc?.label) ||
    isLegacyTicketName(moduleDoc?.pluralLabel) ||
    isLegacyTicketName(moduleDoc?.name)
  );
}

function buildModuleUpdate(doc) {
  const set = {};

  if (String(doc.label || '').trim() !== 'Cases') set.label = 'Cases';
  if (String(doc.pluralLabel || '').trim() !== 'Cases') set.pluralLabel = 'Cases';
  if (doc.name != null && String(doc.name || '').trim() !== 'Cases') set.name = 'Cases';

  const routeBase = String(doc.ui?.routeBase || '').trim().replace(/\/+$/, '');
  if (routeBase === '/cases' || routeBase === 'cases') {
    set['ui.routeBase'] = '/helpdesk/cases';
  }

  if (isLegacyTicketName(doc.ui?.createLabel)) {
    set['ui.createLabel'] = 'Create Case';
  }
  if (isLegacyTicketName(doc.ui?.listLabel)) {
    set['ui.listLabel'] = 'All Cases';
  }

  return set;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const uri = resolveMongoUri();
  await mongoose.connect(uri);

  console.log(`Connected. Mode: ${apply ? 'APPLY' : 'DRY-RUN'}\n`);

  const moduleDocs = await ModuleDefinition.find({ appKey: 'helpdesk' })
    .select('_id appKey moduleKey label pluralLabel name ui organizationId')
    .lean();

  let moduleMatched = 0;
  let moduleUpdated = 0;

  for (const doc of moduleDocs) {
    if (!isHelpdeskCaseSurface(doc)) continue;
    const update = buildModuleUpdate(doc);
    if (Object.keys(update).length === 0) continue;

    moduleMatched += 1;
    const scope = doc.organizationId ? `org:${doc.organizationId}` : 'platform';
    console.log(`[ModuleDefinition:${doc._id}] ${scope} update => ${JSON.stringify(update)}`);

    if (apply) {
      await ModuleDefinition.updateOne({ _id: doc._id }, { $set: update });
      moduleUpdated += 1;
    }
  }

  const tenantConfigs = await TenantModuleConfiguration.find({
    appKey: 'HELPDESK',
    moduleKey: { $in: ['cases', 'ticket', 'tickets', 'ticklets'] },
    labelOverride: { $exists: true, $ne: null }
  })
    .select('_id organizationId appKey moduleKey labelOverride')
    .lean();

  let configMatched = 0;
  let configUpdated = 0;

  for (const config of tenantConfigs) {
    if (!isLegacyTicketName(config.labelOverride)) continue;
    configMatched += 1;
    console.log(
      `[TenantModuleConfiguration:${config._id}] org:${config.organizationId} ` +
      `labelOverride "${config.labelOverride}" -> "Cases"`
    );

    if (apply) {
      await TenantModuleConfiguration.updateOne(
        { _id: config._id },
        { $set: { labelOverride: 'Cases' } }
      );
      configUpdated += 1;
    }
  }

  console.log('\n' + '='.repeat(52));
  console.log('Migration Summary');
  console.log('='.repeat(52));
  console.log(`Module docs scanned:          ${moduleDocs.length}`);
  console.log(`Module docs matched:         ${moduleMatched}`);
  console.log(`Module docs updated:         ${moduleUpdated}`);
  console.log(`Tenant configs scanned:      ${tenantConfigs.length}`);
  console.log(`Tenant configs matched:      ${configMatched}`);
  console.log(`Tenant configs updated:      ${configUpdated}`);
  if (!apply) {
    console.log('\nDry-run only. Re-run with --apply to persist changes.');
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
