/**
 * Open email compose UI from record pages (no mailbox connection gate).
 */
export function useOpenEmailCompose() {
  function guardAndOpenEmailCompose(openFn) {
    openFn();
    return true;
  }

  return { guardAndOpenEmailCompose };
}
