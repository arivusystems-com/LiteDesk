<template>
  <ModulesAndFields :module-filter="salesSchemaFilter" :excluded-tabs="['pipeline', 'playbooks']" title="Sales Schema" />
</template>

<script setup>
import { useAuthStore } from '@/stores/auth';
import ModulesAndFields from './ModulesAndFields.vue';

const authStore = useAuthStore();

// Sales schema modules: Only Sales-specific modules (Deals only, all others are core entities)
const salesSchemaFilter = (module) => {
  // Check if Sales app is installed
  if (!authStore.hasAppAccess('SALES')) {
    return false;
  }
  
  // Sales-specific modules (only Deals - all others are core entities)
  const salesModuleKeys = ['deals'];
  return salesModuleKeys.includes(module.key?.toLowerCase());
};
</script>

