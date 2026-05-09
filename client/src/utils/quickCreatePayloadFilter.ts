export function shouldFilterPayloadByQuickCreate(
  effectiveQuickCreateMode: boolean,
  fullMode: boolean,
  quickCreateList: unknown
): boolean {
  return (
    effectiveQuickCreateMode === true &&
    fullMode === false &&
    Array.isArray(quickCreateList) &&
    quickCreateList.length > 0
  );
}

