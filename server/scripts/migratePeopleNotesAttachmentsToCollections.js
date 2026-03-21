/**
 * One-time migration: copy embedded people.notes and people.attachments into
 * PersonNote / PersonFileAttachment, then $unset those arrays on People.
 *
 * Safe to run once after deploying the schema change. Re-running may duplicate rows
 * if people still had embedded arrays (avoid re-run after $unset).
 *
 * Usage: node server/scripts/migratePeopleNotesAttachmentsToCollections.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const People = require('../models/People');
const PersonNote = require('../models/PersonNote');
const PersonFileAttachment = require('../models/PersonFileAttachment');

function resolveMasterUri() {
  const isProduction = process.env.NODE_ENV === 'production';
  const MONGO_URI =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    (isProduction ? process.env.MONGO_URI_PRODUCTION : process.env.MONGO_URI_LOCAL) ||
    process.env.MONGO_URI_ATLAS;
  if (!MONGO_URI) {
    console.error('Missing Mongo URI. Set MONGODB_URI or MONGO_URI in server/.env (or MONGO_URI_LOCAL / MONGO_URI_ATLAS).');
    process.exit(1);
  }
  const [mongoUriWithoutQuery, mongoUriQueryPart] = MONGO_URI.split('?');
  const mongoQueryString = mongoUriQueryPart ? `?${mongoUriQueryPart}` : '';
  const baseUri = mongoUriWithoutQuery.split('/').slice(0, -1).join('/');
  const masterDbName = 'litedesk_master';
  return `${baseUri}/${masterDbName}${mongoQueryString}`;
}

async function main() {
  const uri = resolveMasterUri();
  await mongoose.connect(uri);
  console.log(`Connected to ${mongoose.connection.name}. Scanning People with embedded notes or attachments...`);

  const cursor = People.collection.find({
    $or: [{ notes: { $exists: true, $ne: [] } }, { attachments: { $exists: true, $ne: [] } }]
  });

  let migrated = 0;
  for await (const doc of cursor) {
    const orgId = doc.organizationId;
    const personId = doc._id;
    if (!orgId || !personId) continue;

    const notes = Array.isArray(doc.notes) ? doc.notes : [];
    const attachments = Array.isArray(doc.attachments) ? doc.attachments : [];

    for (const n of notes) {
      if (!n || !n.text || !n.created_by) continue;
      await PersonNote.create({
        organizationId: orgId,
        personId,
        text: n.text,
        created_by: n.created_by,
        created_at: n.created_at || n.createdAt || new Date(),
        appContext: n.appContext || undefined,
        updated_at: n.updated_at || n.updatedAt || n.created_at || new Date()
      });
    }

    for (const a of attachments) {
      if (!a || !a.storagePath || !a.fileName || !a.uploaded_by) continue;
      await PersonFileAttachment.create({
        organizationId: orgId,
        personId,
        fileName: a.fileName,
        fileType: a.fileType || 'application/octet-stream',
        fileSize: typeof a.fileSize === 'number' ? a.fileSize : 0,
        storagePath: a.storagePath,
        uploaded_by: a.uploaded_by,
        created_at: a.created_at || a.createdAt || new Date(),
        appContext: a.appContext || undefined
      });
    }

    await People.collection.updateOne({ _id: personId }, { $unset: { notes: '', attachments: '' } });
    migrated++;
    if (migrated % 200 === 0) console.log(`  ... ${migrated} people migrated`);
  }

  console.log(`Done. People documents processed (copy + unset): ${migrated}`);

  const stripRest = await People.collection.updateMany(
    { $or: [{ notes: { $exists: true } }, { attachments: { $exists: true } }] },
    { $unset: { notes: '', attachments: '' } }
  );
  console.log(
    `Unset notes/attachments on ${stripRest.modifiedCount} additional documents (empty arrays or leftover paths).`
  );

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
