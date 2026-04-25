/**
 * Central place for AWS-related env (S3, SES, shared credentials).
 * Services should read from here to avoid divergent variable names in production.
 *
 * S3: set AWS_REGION + AWS_S3_BUCKET (+ credentials via default chain or env keys).
 * SES: existing app uses AWS_SES_REGION + AWS_SES_ACCESS_KEY_ID + AWS_SES_SECRET_ACCESS_KEY.
 */
function getAwsConfig() {
  return {
    region: process.env.AWS_REGION || 'us-east-1',
    s3: {
      enabled: process.env.USE_S3_FILE_STORAGE === 'true',
      bucket: process.env.AWS_S3_BUCKET,
      // Optional: prefix for all keys (e.g. org-scoped)
      keyPrefix: process.env.AWS_S3_KEY_PREFIX || '',
    },
    ses: {
      region: process.env.AWS_SES_REGION,
      hasCredentials: Boolean(
        process.env.AWS_SES_ACCESS_KEY_ID && process.env.AWS_SES_SECRET_ACCESS_KEY,
      ),
    },
  };
}

module.exports = { getAwsConfig };
