import { defineStore } from 'pinia';
import { getApiUrlForFetch } from '@/config/apiBase';
import { identifyProductUser } from '@/config/observability.client';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: JSON.parse(localStorage.getItem('user')) || null,
        organization: JSON.parse(localStorage.getItem('organization')) || null,
        loading: false,
        error: null,
    }),
    getters: {
        isAuthenticated: (state) => !!state.user,
        isOwner: (state) => state.user?.isOwner || false,
        userRole: (state) => state.user?.role || null,
        isAdminLike: (state) => {
            const role = state.user?.role || '';
            return state.user?.isOwner || role.toLowerCase() === 'admin';
        },
        hasPermission: (state) => {
            return (module, action) => {
                const role = state.user?.role || '';
                if (state.user?.isOwner || role.toLowerCase() === 'admin') return true;
                const normalized = module === 'people' ? 'contacts' : module;
                return state.user?.permissions?.[normalized]?.[action] || false;
            };
        },
        isTrialActive: (state) => state.organization?.subscription?.status === 'trial',
        subscriptionTier: (state) => state.organization?.subscription?.tier || 'trial',
        enabledModules: (state) => state.organization?.enabledModules || [],
        isMasterOrganization: (state) => state.organization?.name === 'LiteDesk Master',
        isPlatformAdmin: (state) => {
            // Check if user is platform admin (Phase 0H)
            if (state.user?.isPlatformAdmin === true) return true;
            // Check if user has LiteDesk internal email
            const email = state.user?.email || '';
            const internalDomains = ['litedesk.com', 'litedesk.io'];
            return internalDomains.some(domain => email.toLowerCase().includes(`@${domain}`));
        },
        hasAppAccess: (state) => {
            return (appKey) => {
                const appKeyUpper = appKey.toUpperCase();
                const allowedApps = (state.user?.allowedApps || []).map(app =>
                    typeof app === 'string' ? app.toUpperCase() : app
                );
                const hasExplicitUserAccess = allowedApps.includes(appKeyUpper);
                
                // For owners: check if app is enabled for the organization
                // This aligns with unified access resolution where owners have access to all enabled apps
                // (especially for internal instances where owners can access and execute all apps)
                if (state.user?.isOwner) {
                    // If explicit user app access exists, honor that first instead of broadening
                    // access to all org-enabled apps.
                    if (allowedApps.length > 0) {
                        console.log(`[hasAppAccess] Owner explicit app access check for ${appKeyUpper}:`, {
                            allowedApps,
                            hasAccess: hasExplicitUserAccess
                        });
                        return hasExplicitUserAccess;
                    }

                    if (state.organization?.enabledApps) {
                        const enabledApps = state.organization.enabledApps;
                        // Handle both array of strings and array of objects with appKey property
                        const appKeys = enabledApps.map(app => {
                            if (typeof app === 'string') {
                                return app.toUpperCase();
                            }
                            // Handle object format: { appKey: 'SALES', status: 'ACTIVE' }
                            if (app && typeof app === 'object') {
                                const key = app.appKey || app;
                                // Only include if status is ACTIVE (if status field exists)
                                if (app.status && app.status !== 'ACTIVE') {
                                    return null;
                                }
                                return typeof key === 'string' ? key.toUpperCase() : key;
                            }
                            return null;
                        }).filter(key => key !== null);
                        
                        if (appKeys.includes(appKeyUpper)) {
                            console.log(`[hasAppAccess] Owner access granted via enabledApps: ${appKeyUpper}`, {
                                enabledAppKeys: appKeys,
                                checking: appKeyUpper
                            });
                            return true;
                        } else {
                            console.warn(`[hasAppAccess] Owner but app ${appKeyUpper} not in enabledApps:`, {
                                enabledAppKeys: appKeys,
                                checking: appKeyUpper,
                                enabledApps: enabledApps
                            });
                        }
                    } else {
                        console.warn(`[hasAppAccess] Owner but no enabledApps in organization:`, {
                            hasOrganization: !!state.organization,
                            organization: state.organization
                        });
                    }
                }
                
                // For non-owners or if owner check didn't match: check explicit appAccess/allowedApps
                const hasAccess = hasExplicitUserAccess;
                
                console.log(`[hasAppAccess] Final check for ${appKeyUpper}:`, {
                    isOwner: state.user?.isOwner,
                    allowedApps: allowedApps,
                    hasAccess: hasAccess
                });
                
                return hasAccess;
            };
        },
    },
    actions: {
        resolveAllowedApps(userData = {}, options = {}) {
            const { fallbackAllowedApps = [], organization = null } = options;

            const normalizeAppKeys = (apps) => {
                if (!Array.isArray(apps)) return [];
                const normalized = apps
                    .map((app) => {
                        if (typeof app === 'string') return app.toUpperCase();
                        if (app && typeof app === 'object') {
                            const key = app.appKey || app.key || app.name;
                            return typeof key === 'string' ? key.toUpperCase() : null;
                        }
                        return null;
                    })
                    .filter(Boolean);
                return Array.from(new Set(normalized));
            };

            const explicitAllowedApps = normalizeAppKeys(userData.allowedApps);
            if (explicitAllowedApps.length > 0) {
                return explicitAllowedApps;
            }

            if (Array.isArray(userData.appAccess) && userData.appAccess.length > 0) {
                const fromAppAccess = userData.appAccess
                    .filter((access) => {
                        if (!access || typeof access !== 'object') return false;
                        const status = String(access.status || 'ACTIVE').toUpperCase();
                        return status === 'ACTIVE';
                    })
                    .map((access) => (typeof access.appKey === 'string' ? access.appKey.toUpperCase() : null))
                    .filter(Boolean);
                if (fromAppAccess.length > 0) {
                    return Array.from(new Set(fromAppAccess));
                }
            }

            // IMPORTANT:
            // For non-owners, org enabledApps is tenant-level capability and must NOT
            // expand user-level app access. Only owners can inherit from enabledApps.
            const sourceOrganization = organization || userData.organization || userData.organizationId;
            const isOwnerUser = userData?.isOwner === true;
            if (isOwnerUser && sourceOrganization && Array.isArray(sourceOrganization.enabledApps)) {
                const fromEnabledApps = sourceOrganization.enabledApps
                    .map((app) => {
                        if (typeof app === 'string') return app.toUpperCase();
                        if (app && typeof app === 'object') {
                            const status = String(app.status || 'ACTIVE').toUpperCase();
                            if (status !== 'ACTIVE') return null;
                            return typeof app.appKey === 'string' ? app.appKey.toUpperCase() : null;
                        }
                        return null;
                    })
                    .filter(Boolean);
                if (fromEnabledApps.length > 0) {
                    return Array.from(new Set(fromEnabledApps));
                }
            }

            return normalizeAppKeys(fallbackAllowedApps);
        },

        setUser(userData) {
            // Derive allowedApps from explicit user access first; never default to SALES.
            const allowedApps = this.resolveAllowedApps(userData, {
                organization: userData.organization
            });
            
            this.user = {
                _id: userData._id,
                username: userData.username,
                email: userData.email,
                role: userData.role,
                isOwner: userData.isOwner,
                permissions: userData.permissions,
                token: userData.token,
                allowedApps: allowedApps
            };
            
            if (userData.organization) {
                this.organization = userData.organization;
                localStorage.setItem('organization', JSON.stringify(userData.organization));
            }
            
            localStorage.setItem('user', JSON.stringify(this.user));
            identifyProductUser({
                _id: this.user._id,
                email: this.user.email,
                organizationId: userData.organization?._id
                    ? String(userData.organization._id)
                    : (userData.organizationId ? String(userData.organizationId) : undefined),
            });
        },
        
        clearUser() {
            try {
                import('@/config/observability.client').then(({ posthog: ph }) => {
                    if (ph && typeof ph.reset === 'function') ph.reset();
                });
            } catch (_e) {
                /* optional */
            }
            this.user = null;
            this.organization = null;
            localStorage.removeItem('user');
            localStorage.removeItem('organization');
            // Legacy cleanup (older builds stored auth under 'auth')
            localStorage.removeItem('auth');
            this.error = null;
            
            // Phase 0D: Clear UI metadata on logout
            import('@/stores/appShell').then(({ useAppShellStore }) => {
                const appShellStore = useAppShellStore();
                appShellStore.clear();
            });
            
            // Clear offline data (IndexedDB) on logout
            import('@/services/offlineDb.js').then(({ clearAllData }) => {
                clearAllData().catch(err => {
                    console.error('[Auth] Error clearing offline data:', err);
                });
            });

            // Clear list active-view (session state) so next login shows default list
            // Keeps default-view and saved-views; only clears active-view
            try {
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('litedesk-listview-') && key.endsWith('-active-view')) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(k => localStorage.removeItem(k));
            } catch (e) {
                console.warn('[Auth] Failed to clear list active-view keys:', e);
            }
        },

    async authenticate(endpoint, credentials) {
            this.loading = true;
            this.error = null;
            try {
                const url = getApiUrlForFetch(`/api/auth/${endpoint}`);
                console.log('Auth request ->', url, credentials);
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify(credentials),
                });

                const text = await response.text();
                console.log('Auth response status', response.status);
                console.log('Auth response body:', text.slice(0, 1000)); // log first 1000 chars

                const contentType = response.headers.get('content-type') || '';
                if (!contentType.includes('application/json')) {
                    throw new Error(`Server returned non-JSON response (status ${response.status})`);
                }

                const data = JSON.parse(text);
                if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);

                this.setUser(data);
                try {
                    const { posthog: ph } = await import('@/config/observability.client');
                    if (import.meta.env.VITE_POSTHOG_KEY && ph && typeof ph.capture === 'function') {
                        ph.capture('user_logged_in', { method: 'password' });
                    }
                } catch (_e) {
                    /* optional */
                }
                
                // Phase 0D: Load UI metadata after successful login
                import('@/stores/appShell').then(({ useAppShellStore }) => {
                    const appShellStore = useAppShellStore();
                    appShellStore.loadUIMetadata().catch(err => {
                        console.error('[Auth] Error loading UI metadata:', err);
                    });
                });
                
                return true;
            } catch (err) {
                console.error('Auth error:', err);
                this.error = err.message || 'An unexpected error occurred';
                return false;
            } finally {
                this.loading = false;
            }
        },
        // --- Public Actions ---
        async register(userData) {
            return this.authenticate('register', userData);
        },
        async login(credentials) {
            return this.authenticate('login', credentials);
        },
        
        logout() {
            this.clearUser();
        },
        
        // Check if user has a specific permission
        can(module, action) {
            const role = this.user?.role || '';
            if (this.user?.isOwner || role.toLowerCase() === 'admin') return true;
            const normalized = module === 'people' ? 'contacts' : module;
            return this.user?.permissions?.[normalized]?.[action] || false;
        },
        
        // Check if module is enabled for organization
        hasModule(moduleName) {
            return this.organization?.enabledModules?.includes(moduleName) || false;
        },
        
        // Refresh organization data
        async refreshOrganization() {
            try {
                const response = await fetch(getApiUrlForFetch('/api/v2/organization'), {
                    headers: {
                        'Authorization': `Bearer ${this.user?.token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.organization = data.data;
                    localStorage.setItem('organization', JSON.stringify(this.organization));
                }
            } catch (error) {
                console.error('Error refreshing organization:', error);
            }
        },
        
        // Refresh user profile and permissions
        async refreshUser() {
            if (!this.user?.token) {
                console.warn('No user token available for refresh');
                return false;
            }
            
            try {
                console.log('Refreshing user permissions...');
                const response = await fetch(getApiUrlForFetch('/api/users/profile'), {
                    headers: {
                        'Authorization': `Bearer ${this.user.token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                        // Normalize/derive permissions if missing from server
                        const deriveFromRole = (rolePerms) => {
                            if (!rolePerms) return null;
                            const contacts = {
                                view: !!rolePerms.contacts?.read,
                                create: !!rolePerms.contacts?.create,
                                edit: !!rolePerms.contacts?.update,
                                delete: !!rolePerms.contacts?.delete,
                                viewAll: !!rolePerms.contacts?.viewAll,
                                exportData: !!rolePerms.contacts?.export,
                            };
                            const organizations = {
                                view: !!rolePerms.organizations?.read,
                                create: !!rolePerms.organizations?.create,
                                edit: !!rolePerms.organizations?.update,
                                delete: !!rolePerms.organizations?.delete,
                                viewAll: !!rolePerms.organizations?.viewAll,
                                exportData: !!rolePerms.organizations?.export,
                            };
                            const deals = {
                                view: !!rolePerms.deals?.read,
                                create: !!rolePerms.deals?.create,
                                edit: !!rolePerms.deals?.update,
                                delete: !!rolePerms.deals?.delete,
                                viewAll: !!rolePerms.deals?.viewAll,
                                exportData: !!rolePerms.deals?.export,
                            };
                            const tasks = {
                                view: !!rolePerms.tasks?.read,
                                create: !!rolePerms.tasks?.create,
                                edit: !!rolePerms.tasks?.update,
                                delete: !!rolePerms.tasks?.delete,
                                viewAll: !!rolePerms.tasks?.viewAll,
                            };
                            const events = {
                                view: !!rolePerms.events?.read,
                                create: !!rolePerms.events?.create,
                                edit: !!rolePerms.events?.update,
                                delete: !!rolePerms.events?.delete,
                                viewAll: !!rolePerms.events?.viewAll,
                            };
                            const forms = {
                                view: !!rolePerms.forms?.read,
                                create: !!rolePerms.forms?.create,
                                edit: !!rolePerms.forms?.update,
                                delete: !!rolePerms.forms?.delete,
                                viewAll: !!rolePerms.forms?.viewAll,
                                exportData: !!rolePerms.forms?.export,
                            };
                            const items = {
                                view: !!rolePerms.items?.read,
                                create: !!rolePerms.items?.create,
                                edit: !!rolePerms.items?.update,
                                delete: !!rolePerms.items?.delete,
                                viewAll: !!rolePerms.items?.viewAll,
                                exportData: !!rolePerms.items?.export,
                            };
                            const imports = {
                                view: !!(rolePerms.contacts?.import || rolePerms.deals?.import),
                                create: !!(rolePerms.contacts?.import || rolePerms.deals?.import),
                                delete: false,
                            };
                            const settings = {
                                view: !!rolePerms.settings?.view,
                                manageUsers: !!rolePerms.settings?.manageUsers,
                                manageBilling: !!rolePerms.settings?.manageBilling,
                                manageIntegrations: false,
                                customizeFields: !!rolePerms.settings?.edit,
                                edit: !!rolePerms.settings?.edit,
                            };
                            const reports = {
                                viewStandard: !!rolePerms.reports?.read,
                                viewCustom: !!rolePerms.reports?.read,
                                createCustom: !!rolePerms.reports?.create,
                                exportReports: !!rolePerms.reports?.export,
                            };
                            const built = { contacts, organizations, deals, tasks, events, forms, items, imports, settings, reports };
                            built.people = built.contacts;
                            return built;
                        };

                        const incoming = data.data;
                        // Safety: if the profile endpoint returns a different user than the one in memory,
                        // do NOT silently switch accounts (this can happen with stale/incorrect tokens).
                        if (this.user?._id && incoming?._id && String(incoming._id) !== String(this.user._id)) {
                            console.warn('Auth mismatch: profile returned a different user. Logging out for safety.', {
                                currentUserId: this.user._id,
                                incomingUserId: incoming._id,
                                currentEmail: this.user.email,
                                incomingEmail: incoming.email
                            });
                            this.logout();
                            return false;
                        }
                        const ensuredPermissions = incoming.permissions || deriveFromRole(incoming.roleId?.permissions) || {};
                        if (ensuredPermissions.contacts && !ensuredPermissions.people) {
                            ensuredPermissions.people = ensuredPermissions.contacts;
                        }
                        // Ensure newly added modules exist so the sidebar can render them immediately.
                        if (!ensuredPermissions.forms) ensuredPermissions.forms = { view: false, create: false, edit: false, delete: false, viewAll: false, exportData: false };
                        if (!ensuredPermissions.items) ensuredPermissions.items = { view: false, create: false, edit: false, delete: false, viewAll: false, exportData: false };
                        // Update user data while preserving token and allowedApps
                        const token = this.user.token;
                        const existingAllowedApps = this.user.allowedApps;
                        this.user = {
                            ...incoming,
                            permissions: ensuredPermissions,
                            token: token,
                            allowedApps: this.resolveAllowedApps(incoming, {
                                fallbackAllowedApps: existingAllowedApps,
                                organization: incoming.organizationId || this.organization
                            })
                        };
                        localStorage.setItem('user', JSON.stringify(this.user));
                        
                        // Update organization if included in response (for enabledApps)
                        if (incoming.organizationId && typeof incoming.organizationId === 'object') {
                            this.organization = incoming.organizationId;
                            localStorage.setItem('organization', JSON.stringify(this.organization));
                        }
                        identifyProductUser({
                            _id: this.user?._id,
                            email: this.user?.email,
                            organizationId: this.organization?._id
                                ? String(this.organization._id)
                                : undefined,
                        });
                        console.log('User permissions refreshed successfully');
                        return true;
                    }
                } else if (response.status === 401) {
                    // Token expired, logout
                    console.warn('Session expired, logging out');
                    this.logout();
                    return false;
                }
            } catch (error) {
                console.error('Error refreshing user:', error);
                return false;
            }
            return false;
        }
    },
});