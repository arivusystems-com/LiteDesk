<template>
  <EmailThreadCard
    v-if="event?.thread"
    :thread="event.thread"
    :compact="true"
    :expanded="ui.expandedTaskEmailThreads.has(event.thread.threadId)"
    :current-user="ui.currentUser"
    :format-date="ui.formatRelativeActivityTime"
    :format-full-date="ui.formatFullTimestamp"
    :on-timestamp-pointer-up="ui.handleTimestampPointerUp"
    @toggle="ui.toggleTaskEmailThread(event.thread.threadId)"
    @create-task="ui.createTaskFromEmailMessage"
  />
</template>

<script setup>
import EmailThreadCard from '@/components/communications/EmailThreadCard.vue';

defineProps({
  event: { type: Object, required: true },
  ui: { type: Object, required: true }
});
</script>
