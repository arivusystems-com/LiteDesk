const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), override: false });

const Deal = require('../models/Deal');

const parseArgs = (argv = []) => {
  const flags = new Set(argv);
  const readValue = (name) => {
    const idx = argv.indexOf(name);
    if (idx === -1) return null;
    return argv[idx + 1] || null;
  };

  return {
    apply: flags.has('--apply'),
    orgId: readValue('--org'),
    dealId: readValue('--deal'),
    limit: Number(readValue('--limit') || 0)
  };
};

const toReadableFieldLabel = (fieldKey) => String(fieldKey || '')
  .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/^./, (char) => char.toUpperCase());

const asMap = (candidate) => {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return {};
  return candidate;
};

const resolvePerFieldMaps = (details = {}) => {
  const fromByField = {
    ...asMap(details.fromByField),
    ...asMap(details.oldValuesByField),
    ...asMap(details.oldByField),
    ...asMap(details.previousByField)
  };

  const toByField = {
    ...asMap(details.toByField),
    ...asMap(details.newValuesByField),
    ...asMap(details.newByField),
    ...asMap(details.nextByField)
  };

  return { fromByField, toByField };
};

const normalizeValue = (value) => {
  if (value === undefined || value === null || value === '') return 'Empty';
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') {
    return value.name
      || [value.first_name, value.last_name].filter(Boolean).join(' ').trim()
      || [value.firstName, value.lastName].filter(Boolean).join(' ').trim()
      || value.email
      || String(value._id || value.id || '[object]');
  }
  return String(value);
};

const migrateActivityLogs = (activityLogs = [], stats) => {
  const nextLogs = [];

  for (const log of activityLogs) {
    const details = log?.details || {};

    if (log?.action === 'updated deal' && details?.field) {
      stats.updatedDealWithSingleField += 1;
      nextLogs.push({
        ...log,
        action: 'field_changed',
        details: {
          ...details,
          fieldLabel: details.fieldLabel || toReadableFieldLabel(details.field),
          from: normalizeValue(details.from ?? details.oldValue),
          to: normalizeValue(details.to ?? details.newValue)
        }
      });
      continue;
    }

    const fields = Array.isArray(details?.fields)
      ? details.fields.map((field) => String(field || '').trim()).filter(Boolean)
      : [];

    if (log?.action === 'updated deal' && fields.length > 0) {
      const { fromByField, toByField } = resolvePerFieldMaps(details);

      let convertedForThisLog = 0;
      fields.forEach((field, index) => {
        const hasFrom = Object.prototype.hasOwnProperty.call(fromByField, field);
        const hasTo = Object.prototype.hasOwnProperty.call(toByField, field);
        if (!hasFrom && !hasTo) return;

        convertedForThisLog += 1;
        nextLogs.push({
          ...log,
          _id: undefined,
          action: 'field_changed',
          details: {
            field,
            fieldLabel: toReadableFieldLabel(field),
            from: normalizeValue(fromByField[field]),
            to: normalizeValue(toByField[field])
          },
          timestamp: log?.timestamp ? new Date(new Date(log.timestamp).getTime() + index) : new Date()
        });
      });

      if (convertedForThisLog > 0) {
        stats.updatedDealWithFieldListConverted += 1;
        stats.generatedFieldChangedEntries += convertedForThisLog;
        continue;
      }

      stats.updatedDealWithFieldListSkipped += 1;
      nextLogs.push(log);
      continue;
    }

    nextLogs.push(log);
  }

  return nextLogs;
};

const run = async () => {
  const args = parseArgs(process.argv.slice(2));
  const dbUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!dbUri) {
    throw new Error('Missing MONGO_URI (or MONGODB_URI) in environment');
  }

  await mongoose.connect(dbUri);

  const query = {
    deletedAt: null,
    activityLogs: {
      $elemMatch: {
        action: 'updated deal'
      }
    }
  };

  if (args.orgId) query.organizationId = new mongoose.Types.ObjectId(args.orgId);
  if (args.dealId) query._id = new mongoose.Types.ObjectId(args.dealId);

  let dealQuery = Deal.find(query).select('_id organizationId activityLogs');
  if (args.limit > 0) dealQuery = dealQuery.limit(args.limit);

  const deals = await dealQuery.lean();

  const stats = {
    scannedDeals: deals.length,
    changedDeals: 0,
    unchangedDeals: 0,
    updatedDealWithSingleField: 0,
    updatedDealWithFieldListConverted: 0,
    updatedDealWithFieldListSkipped: 0,
    generatedFieldChangedEntries: 0,
    writes: 0
  };

  for (const deal of deals) {
    const originalLogs = Array.isArray(deal.activityLogs) ? deal.activityLogs : [];
    const migratedLogs = migrateActivityLogs(originalLogs, stats);

    if (JSON.stringify(originalLogs) === JSON.stringify(migratedLogs)) {
      stats.unchangedDeals += 1;
      continue;
    }

    stats.changedDeals += 1;

    if (args.apply) {
      await Deal.updateOne(
        { _id: deal._id, organizationId: deal.organizationId },
        { $set: { activityLogs: migratedLogs } }
      );
      stats.writes += 1;
    }
  }

  console.log('--- Deal activity migration summary ---');
  console.log(JSON.stringify({
    mode: args.apply ? 'apply' : 'dry-run',
    ...stats
  }, null, 2));

  if (!args.apply) {
    console.log('\nDry run complete. Re-run with --apply to persist changes.');
  }

  await mongoose.disconnect();
};

run()
  .then(() => {
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Migration failed:', error);
    try {
      await mongoose.disconnect();
    } catch (_) {}
    process.exit(1);
  });
