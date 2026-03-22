import { ref } from 'vue';

/** Incremented when tenant people role types change so composables can refetch. */
export const peopleTypesCacheVersion = ref(0);

export function invalidatePeopleTypesCache() {
  peopleTypesCacheVersion.value += 1;
}
