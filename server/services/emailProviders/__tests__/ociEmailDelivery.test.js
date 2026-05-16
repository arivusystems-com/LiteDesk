const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const oci = require('../ociEmailDelivery');

describe('ociEmailDelivery', () => {
  it('detects provider by key', () => {
    assert.equal(oci.isOciEmailDeliveryProvider({ provider: 'oci-email-delivery' }), true);
    assert.equal(oci.isOciEmailDeliveryProvider({ provider: 'resend' }), false);
  });

  it('detects provider by OCI SMTP host', () => {
    assert.equal(
      oci.isOciEmailDeliveryProvider({ smtpHost: 'smtp.email.us-phoenix-1.oci.oraclecloud.com' }),
      true
    );
  });

  it('builds regional SMTP host', () => {
    assert.equal(
      oci.buildOciSmtpHost('us-phoenix-1'),
      'smtp.email.us-phoenix-1.oci.oraclecloud.com'
    );
  });

  it('replaces Resend SMTP host when provider is OCI', () => {
    const merged = oci.applyOciEmailDeliveryDefaults({
      provider: 'oci-email-delivery',
      ociRegion: 'us-phoenix-1',
      smtpHost: 'smtp.resend.com',
      smtpUser: 'resend',
      smtpPass: 'secret'
    });
    assert.equal(merged.smtpHost, 'smtp.email.us-phoenix-1.oci.oraclecloud.com');
  });

  it('applies defaults from OCI_EMAIL_REGION', () => {
    const prev = process.env.OCI_EMAIL_REGION;
    process.env.OCI_EMAIL_REGION = 'eu-frankfurt-1';
    try {
      const merged = oci.applyOciEmailDeliveryDefaults({
        provider: 'oci-email-delivery',
        smtpUser: 'ociuser',
        smtpPass: 'secret'
      });
      assert.equal(merged.smtpHost, 'smtp.email.eu-frankfurt-1.oci.oraclecloud.com');
      assert.equal(merged.smtpPort, 465);
    assert.equal(merged.smtpSecure, true);
    } finally {
      if (prev === undefined) delete process.env.OCI_EMAIL_REGION;
      else process.env.OCI_EMAIL_REGION = prev;
    }
  });

  it('coerces port 587 to 465 for OCI', () => {
    const merged = oci.applyOciEmailDeliveryDefaults({
      provider: 'oci-email-delivery',
      ociRegion: 'us-phoenix-1',
      smtpPort: 587,
      smtpSecure: false
    });
    assert.equal(merged.smtpPort, 465);
    assert.equal(merged.smtpSecure, true);
  });

  it('is configured when from, host, user, and pass are present', () => {
    assert.equal(
      oci.isOciEmailDeliveryConfigured({
        provider: 'oci-email-delivery',
        fromEmail: 'hello@example.com',
        smtpHost: 'smtp.email.us-phoenix-1.oci.oraclecloud.com',
        smtpPort: 465,
        smtpUser: 'ociuser',
        smtpPass: 'secret'
      }),
      true
    );
    assert.equal(
      oci.isOciEmailDeliveryConfigured({
        provider: 'oci-email-delivery',
        fromEmail: 'hello@example.com',
        smtpHost: 'smtp.email.us-phoenix-1.oci.oraclecloud.com',
        smtpPort: 587,
        smtpUser: 'ociuser'
      }),
      false
    );
  });
});
