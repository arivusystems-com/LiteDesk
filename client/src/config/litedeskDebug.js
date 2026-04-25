/**
 * Opt-in dev-only logging. Default off: router + hasAppAccess run very frequently;
 * unguarded console costs main-thread time (object serialization) on every call.
 *
 * In dev, enable per-channel:
 *   localStorage.setItem('litedesk:debug:nav', '1')
 *   localStorage.setItem('litedesk:debug:authAccess', '1')
 * then reload.
 */

function _enabled (channel) {
  if (!import.meta.env.DEV) return false
  try {
    if (typeof localStorage === 'undefined') return false
    return localStorage.getItem(`litedesk:debug:${channel}`) === '1'
  } catch {
    return false
  }
}

/** Verbose navigation guard logging (set localStorage litedesk:debug:nav=1) */
export function logNavDebug (...args) {
  if (!_enabled('nav')) return
  console.log(...args)
}

/** Verbose hasAppAccess() logging (set localStorage litedesk:debug:authAccess=1) */
export function logAuthAccessDebug (...args) {
  if (!_enabled('authAccess')) return
  console.log(...args)
}

export function warnAuthAccessDebug (...args) {
  if (!_enabled('authAccess')) return
  console.warn(...args)
}
