<template>
  <div class="flex items-start gap-2.5 px-2 py-0.5 text-[13px] text-gray-500 dark:text-slate-400 max-[480px]:flex-wrap max-[480px]:gap-x-2.5 max-[480px]:gap-y-1.5">
    <span class="h-1 w-1 mt-[0.45rem] rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" aria-hidden="true"></span>
    <div class="flex-1 min-w-0 space-y-1.5">
      <template v-if="ui.isFieldChangeSystemEvent(event)">
        <div class="flex items-start justify-between gap-2 max-[480px]:flex-wrap max-[480px]:gap-y-1">
          <p class="text-[12px] leading-[1.4] text-gray-500 dark:text-slate-400">
            <span>{{ ui.getSystemEventActorLabel(event) }}</span>
            <span> changed </span>
            <span class="font-semibold text-gray-900 dark:text-white">{{ ui.getSystemEventFieldLabel(event) }}</span>
          </p>
          <span
            v-if="event.createdAt"
            class="ml-auto whitespace-nowrap text-[12px] text-gray-400 dark:text-slate-500 cursor-help"
            :title="ui.formatFullTimestamp(event.createdAt)"
            @pointerup="ui.handleTimestampPointerUp($event, event.createdAt)"
          >
            {{ ui.formatRelativeActivityTime(event.createdAt) }}
          </span>
        </div>
        <p
          v-if="!event.descriptionDiffHtml"
          class="text-[12px] leading-[1.4] text-gray-700 dark:text-gray-300"
        >
          Changed {{ ui.getSystemEventFieldLabel(event) }} from "{{ ui.getSystemEventFromValue(event) }}" to "{{ ui.getSystemEventToValue(event) }}"
        </p>
      </template>
      <p v-else class="text-[12px] leading-[1.4] text-gray-500 dark:text-slate-400">
        {{ ui.getSystemEventMessage(event) }}
        <a v-if="event.showMore" href="#" @click.prevent="ui.handleShowMore(event)" class="ml-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
          Show more
        </a>
      </p>
      <div
        v-if="event.descriptionDiffHtml"
        class="rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50 px-3 py-2 text-[12px] leading-[1.5] text-gray-700 dark:text-gray-300 [&_del]:bg-red-100 [&_del]:dark:bg-red-900/40 [&_del]:text-red-800 [&_del]:dark:text-red-200 [&_del]:line-through [&_ins]:bg-green-100 [&_ins]:dark:bg-green-900/40 [&_ins]:text-green-800 [&_ins]:dark:text-green-200 [&_ins]:no-underline"
        v-html="event.descriptionDiffHtml"
      />
    </div>
    <span
      v-if="event.createdAt && !ui.isFieldChangeSystemEvent(event)"
      class="ml-auto pl-2 whitespace-nowrap text-[12px] text-gray-400 dark:text-slate-500 max-[480px]:ml-4 max-[480px]:pl-0 self-start cursor-help"
      :title="ui.formatFullTimestamp(event.createdAt)"
      @pointerup="ui.handleTimestampPointerUp($event, event.createdAt)"
    >
      {{ ui.formatRelativeActivityTime(event.createdAt) }}
    </span>
  </div>
</template>

<script setup>
defineProps({
  event: { type: Object, required: true },
  ui: { type: Object, required: true }
});
</script>
