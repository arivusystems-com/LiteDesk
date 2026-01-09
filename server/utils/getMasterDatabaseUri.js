/**
 * Utility to get the master database URI (litedesk_master)
 * 
 * This ensures all scripts and services connect to the correct master database
 * regardless of what's in the MONGO_URI environment variable.
 * 
 * Usage:
 *   const getMasterDatabaseUri = require('./utils/getMasterDatabaseUri');
 *   const masterUri = getMasterDatabaseUri();
 *   await mongoose.connect(masterUri);
 */

function getMasterDatabaseUri() {
  const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;
  
  if (!MONGO_URI) {
    throw new Error('MONGO_URI or MONGODB_URI must be set in environment variables');
  }
  
  // Extract base URI (everything except the database name)
  const [uriWithoutQuery, queryPart] = MONGO_URI.split('?');
  const uriParts = uriWithoutQuery.split('/');
  const baseUri = uriParts.slice(0, -1).join('/'); // Everything except last part (database name)
  const connectionQuery = queryPart ? `?${queryPart}` : '';
  
  // Always use litedesk_master as the database name
  const masterDbName = 'litedesk_master';
  const masterUri = `${baseUri}/${masterDbName}${connectionQuery}`;
  
  return masterUri;
}

module.exports = getMasterDatabaseUri;

