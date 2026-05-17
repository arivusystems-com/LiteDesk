const mongoose = require('mongoose');
const { wrapTenantModel } = require('../utils/tenantModelProxy');

const Schema = mongoose.Schema;

const CommunicationConfigSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true,
      index: true
    },
    outboundEmail: {
      enabled: { type: Boolean, default: true },
      requireIdempotencyKey: { type: Boolean, default: false },
      maxRecipientsPerMessage: { type: Number, default: 50, min: 1, max: 1000 },
      allowedModuleKeys: [{ type: String, trim: true }],
      /** Inbox “standalone” send (relatedTo.workspace); default true when unset */
      allowWorkspaceEmail: { type: Boolean, default: true },
      /**
       * R0/R2: When true, block platform SMTP/queue sends for workspace (inbox) mail.
       * Use after R2 provider-native send is enabled for connected mailboxes.
       */
      disallowPlatformSmtpForWorkspace: { type: Boolean, default: false },
      /**
       * R2: When true, agent sends must use connected mailbox provider APIs (not SMTP).
       */
      requireMailboxProviderForAgentSend: { type: Boolean, default: false },
      suppression: {
        autoSuppressOnBounce: { type: Boolean, default: true },
        autoSuppressOnComplaint: { type: Boolean, default: true }
      }
    },
    /**
     * Google OAuth **app** credentials for Gmail inbox sync (per-tenant in UI).
     * User refresh tokens stay on Mailbox; this is only the Web client id/secret/redirect.
     */
    gmailInboxSync: {
      clientId: { type: String, trim: true, default: '' },
      clientSecretEnc: { type: String, default: '' },
      redirectUri: { type: String, trim: true, default: '' }
    }
  },
  { timestamps: true }
);

const CommunicationConfig = mongoose.model('CommunicationConfig', CommunicationConfigSchema);

module.exports = wrapTenantModel(CommunicationConfig);
