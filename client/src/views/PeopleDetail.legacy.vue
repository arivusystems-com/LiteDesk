<!--
 * ============================================================================
 * LEGACY COMPONENT — DO NOT USE
 * ============================================================================
 *
 * This file is archived for feature reference only.
 * It predates the resolver-driven People Runtime Contract.
 * Do not import, route to, or reuse directly.
 *
 * Features from this file will be reintroduced incrementally
 * through the new People runtime steps (Step 18+).
 *
 * Archived: January 2026
 * ============================================================================
 -->

<template>
  <RecordDetail
    module-key="people"
    app-key="PLATFORM"
    @record-updated="handleRecordUpdated"
    @record-deleted="handleRecordDeleted"
  />
</template>

<script setup>
import RecordDetail from '@/components/record-detail/RecordDetail.vue';

// People-specific handlers (if needed)
const handleRecordUpdated = (updatedRecord) => {
  console.log('[PeopleDetail] Record updated:', updatedRecord);
  // Additional People-specific logic can go here
};

const handleRecordDeleted = () => {
  console.log('[PeopleDetail] Record deleted');
  // Additional People-specific logic can go here
};
</script>

