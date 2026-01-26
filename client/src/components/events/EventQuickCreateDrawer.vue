<!--
  ============================================================================
  EVENT QUICK CREATE DRAWER
  ============================================================================
  
  ARCHITECTURAL INTENT:
  - Opens GenericEventCreateSurface in a drawer (same tab, not navigation)
  - Provides simplified event creation for meetings and sales beats
  - Does NOT support audit events (must use Audit Scheduling Surface)
  
  See: docs/architecture/event-settings.md
  ============================================================================
-->

<template>
  <TransitionRoot as="template" :show="isOpen">
    <Dialog class="relative z-50" @close="handleClose">
      <!-- Background overlay -->
      <TransitionChild
        as="template"
        enter="ease-out duration-200"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-200"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-gray-500/75 dark:bg-black/75" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-hidden">
        <div class="absolute inset-0 overflow-hidden">
          <div class="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
            <TransitionChild 
              as="template" 
              enter="transform transition ease-in-out duration-300 sm:duration-300" 
              enter-from="translate-x-full" 
              enter-to="translate-x-0" 
              leave="transform transition ease-in-out duration-300 sm:duration-300" 
              leave-from="translate-x-0" 
              leave-to="translate-x-full"
            >
              <DialogPanel class="pointer-events-auto w-screen max-w-2xl h-full">
                <div class="flex h-full flex-col divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800 shadow-xl overflow-hidden">
                  <!-- Header -->
                  <div class="bg-indigo-700 dark:bg-indigo-800 px-4 py-6 sm:px-6">
                    <div class="flex items-center justify-between">
                      <DialogTitle class="text-base font-semibold text-white">Create Event</DialogTitle>
                      <div class="ml-3 flex h-7 items-center">
                        <button 
                          type="button" 
                          class="relative rounded-md text-indigo-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" 
                          @click="handleClose"
                        >
                          <span class="absolute -inset-2.5"></span>
                          <span class="sr-only">Close panel</span>
                          <XMarkIcon class="size-6" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <div class="mt-1">
                      <p class="text-sm text-indigo-300">
                        Create a simple event for meetings or sales beats. Audit events are scheduled from the Audit module.
                      </p>
                    </div>
                  </div>

                  <!-- Content -->
                  <div class="h-0 flex-1 overflow-y-auto">
                    <GenericEventCreateSurface
                      :initialData="initialData"
                      @created="handleCreated"
                      @cancelled="handleClose"
                    />
                  </div>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';
import GenericEventCreateSurface from './GenericEventCreateSurface.vue';
import { useTabs } from '@/composables/useTabs';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  initialData: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['close', 'saved']);

const { openTab } = useTabs();

const handleClose = () => {
  emit('close');
};

const handleCreated = (event: any) => {
  // Open the saved event in a new tab
  if (event) {
    const eventId = event.eventId || event._id;
    if (eventId) {
      const eventTitle = event.eventName || event.title || 'Event';
      openTab(`/events/${eventId}`, {
        title: eventTitle,
        icon: '📅'
      });
    }
  }
  
  // Dispatch global event to refresh calendar/list views
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('litedesk:event-created', {
      detail: { event }
    }));
  }
  
  emit('saved', event);
  handleClose();
};
</script>
