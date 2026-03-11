import { computed } from 'vue';
import { createTaskSectionStackAdapter, TASK_STACK_SECTION_KEYS } from '@/components/record-page/adapters/task/taskSectionStackAdapter';

const resolveValue = (input) => {
  if (typeof input === 'function') {
    return input();
  }
  if (input && typeof input === 'object' && 'value' in input) {
    return input.value;
  }
  return input;
};

export const useTaskSections = (context = {}) => {
  const taskSectionContext = computed(() => ({
    module: 'task',
    expandedLeftSection: resolveValue(context.expandedLeftSection),
    openTab: context.openTab,
    getRelatedToRecordPath: context.getRelatedToRecordPath
  }));

  const taskSectionStackAdapter = computed(() => createTaskSectionStackAdapter(context));

  const taskSectionStackSections = computed(() => {
    return taskSectionStackAdapter.value.getSections(resolveValue(context.task), taskSectionContext.value);
  });

  const shouldRenderTaskSectionStack = computed(() => {
    const sectionKey = resolveValue(context.expandedLeftSection);
    if (!sectionKey) return true;
    return TASK_STACK_SECTION_KEYS.includes(sectionKey);
  });

  return {
    taskSectionStackAdapter,
    taskSectionStackSections,
    taskSectionStackContext: taskSectionContext,
    shouldRenderTaskSectionStack
  };
};
