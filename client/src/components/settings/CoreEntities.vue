<template>
  <ModulesAndFields :module-filter="coreEntitiesFilter" title="Core Entities" />
</template>

<script setup>
import ModulesAndFields from './ModulesAndFields.vue';

// Core entities: People, Organizations, Events, Forms, Tasks, Items, and Reports
const coreEntitiesFilter = (module) => {
  const coreKeys = ['people', 'organizations', 'events', 'forms', 'tasks', 'items', 'reports'];
  return coreKeys.includes(module.key?.toLowerCase());
};
</script>

