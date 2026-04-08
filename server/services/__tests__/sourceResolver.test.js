'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  resolveSource,
  stripClientSource,
  assignResolvedSource,
  CHANNEL_TO_SOURCE
} = require('../sourceResolver');
const { DEFAULT_RECORD_SOURCE, RECORD_SOURCE_VALUES } = require('../../constants/recordSource');

describe('sourceResolver.resolveSource', () => {
  it('maps known channels to picklist values', () => {
    const cases = [
      ['ui', 'Direct'],
      ['manual', 'Direct'],
      ['api', 'API'],
      ['import', 'Import'],
      ['web_form', 'Web Form'],
      ['automation', 'Automation'],
      ['ai', 'AI'],
      ['email', 'Email'],
      ['phone', 'Phone'],
      ['chat', 'Chat'],
      ['whatsapp', 'WhatsApp'],
      ['facebook', 'Facebook'],
      ['linkedin', 'LinkedIn'],
      ['referral', 'Referral'],
      ['campaign', 'Campaign'],
      ['integration', 'Integration']
    ];
    for (const [ch, expected] of cases) {
      assert.strictEqual(resolveSource(ch), expected);
    }
  });

  it('defaults for unknown or empty channel', () => {
    assert.strictEqual(resolveSource(), DEFAULT_RECORD_SOURCE);
    assert.strictEqual(resolveSource(''), DEFAULT_RECORD_SOURCE);
    assert.strictEqual(resolveSource('unknown_channel_xyz'), DEFAULT_RECORD_SOURCE);
  });
});

describe('sourceResolver.CHANNEL_TO_SOURCE', () => {
  it('covers every non-default picklist value', () => {
    const fromChannels = new Set(Object.values(CHANNEL_TO_SOURCE));
    for (const v of RECORD_SOURCE_VALUES) {
      if (v === DEFAULT_RECORD_SOURCE) continue;
      assert.ok(fromChannels.has(v), `missing channel mapping for ${v}`);
    }
  });
});

describe('sourceResolver helpers', () => {
  it('stripClientSource removes source', () => {
    const body = { name: 'x', source: 'API' };
    stripClientSource(body);
    assert.strictEqual(body.source, undefined);
    assert.strictEqual(body.name, 'x');
  });

  it('assignResolvedSource sets canonical value', () => {
    const p = { title: 't' };
    assignResolvedSource(p, 'import');
    assert.strictEqual(p.source, 'Import');
    assignResolvedSource(p, 'ui');
    assert.strictEqual(p.source, 'Direct');
  });
});
