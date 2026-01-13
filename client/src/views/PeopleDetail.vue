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
