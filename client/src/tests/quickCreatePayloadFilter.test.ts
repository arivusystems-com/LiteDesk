import { describe, expect, it } from 'vitest';
import { shouldFilterPayloadByQuickCreate } from '@/utils/quickCreatePayloadFilter';

describe('shouldFilterPayloadByQuickCreate', () => {
  it('filters in quick create mode when drawer is not in full mode', () => {
    expect(shouldFilterPayloadByQuickCreate(true, false, ['title', 'status'])).toBe(true);
  });

  it('does not filter in full mode even when quick create is enabled', () => {
    expect(shouldFilterPayloadByQuickCreate(true, true, ['title', 'description'])).toBe(false);
  });

  it('does not filter when quick create mode is disabled', () => {
    expect(shouldFilterPayloadByQuickCreate(false, false, ['title'])).toBe(false);
  });

  it('does not filter when quick create config is empty or invalid', () => {
    expect(shouldFilterPayloadByQuickCreate(true, false, [])).toBe(false);
    expect(shouldFilterPayloadByQuickCreate(true, false, null)).toBe(false);
    expect(shouldFilterPayloadByQuickCreate(true, false, undefined)).toBe(false);
  });
});

