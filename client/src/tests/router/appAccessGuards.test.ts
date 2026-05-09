import { describe, expect, it } from 'vitest';
import {
  buildAppAccessProfile,
  getSalesDashboardRedirect,
  getSalesModuleRedirect,
} from '@/router/appAccessGuards';

describe('appAccessGuards', () => {
  it('redirects audit-only users away from Sales module routes', () => {
    const profile = buildAppAccessProfile((appKey) => appKey === 'AUDIT');
    expect(getSalesModuleRedirect(profile, 'deals')).toBe('audit-dashboard');
    expect(getSalesModuleRedirect(profile, 'people')).toBe('audit-dashboard');
  });

  it('redirects portal-only users away from Sales dashboard', () => {
    const profile = buildAppAccessProfile((appKey) => appKey === 'PORTAL');
    expect(getSalesDashboardRedirect(profile)).toBe('portal-dashboard');
  });

  it('does not redirect when user has Sales access', () => {
    const profile = buildAppAccessProfile((appKey) => appKey === 'SALES' || appKey === 'AUDIT');
    expect(getSalesModuleRedirect(profile, 'deals')).toBeNull();
    expect(getSalesDashboardRedirect(profile)).toBeNull();
  });

  it('does not redirect for non-sales modules', () => {
    const profile = buildAppAccessProfile((appKey) => appKey === 'AUDIT');
    expect(getSalesModuleRedirect(profile, 'settings')).toBeNull();
  });
});
