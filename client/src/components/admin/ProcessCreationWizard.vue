<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" @click.self="$emit('close')">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">Create Process</h2>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Follow the steps to create a process that controls system behavior
          </p>
        </div>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Progress Stepper -->
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <nav aria-label="Progress">
          <ol role="list" class="flex items-center">
            <li v-for="(step, stepIdx) in steps" :key="step.id" class="relative flex-1">
              <div class="flex items-center">
                <div
                  :class="[
                    'flex h-10 w-10 items-center justify-center rounded-full border-2',
                    step.status === 'complete'
                      ? 'border-indigo-600 bg-indigo-600'
                      : step.status === 'current'
                      ? 'border-indigo-600 bg-white dark:bg-gray-800'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                  ]"
                >
                  <svg
                    v-if="step.status === 'complete'"
                    class="h-6 w-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span
                    v-else
                    :class="[
                      'text-sm font-medium',
                      step.status === 'current'
                        ? 'text-indigo-600'
                        : 'text-gray-500 dark:text-gray-400'
                    ]"
                  >
                    {{ step.id }}
                  </span>
                </div>
                <div class="ml-4 min-w-0 flex-1">
                  <p
                    :class="[
                      'text-sm font-medium',
                      step.status === 'current'
                        ? 'text-indigo-600'
                        : step.status === 'complete'
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400'
                    ]"
                  >
                    {{ step.name }}
                  </p>
                </div>
              </div>
              <div v-if="stepIdx !== steps.length - 1" class="absolute top-5 left-5 -ml-px h-0.5 w-full bg-gray-300 dark:bg-gray-600" aria-hidden="true"></div>
            </li>
          </ol>
        </nav>
      </div>

      <!-- Step Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <!-- Step 1: When should this run? -->
        <div v-if="currentStep === 0" class="max-w-2xl mx-auto">
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">When should this run?</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Choose when this process should automatically execute
            </p>
          </div>

          <div class="space-y-3">
            <label
              v-for="option in triggerOptions"
              :key="option.value"
              :class="[
                'relative flex cursor-pointer rounded-lg border p-4 focus:outline-none transition-all',
                wizardData.triggerType === option.value
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500'
              ]"
            >
              <input
                type="radio"
                :value="option.value"
                v-model="wizardData.triggerType"
                class="sr-only"
              />
              <div class="flex flex-1">
                <div class="flex flex-col">
                  <span class="block text-sm font-medium text-gray-900 dark:text-white">
                    {{ option.label }}
                  </span>
                  <span class="mt-1 block text-sm text-gray-500 dark:text-gray-400">
                    {{ option.description }}
                  </span>
                </div>
              </div>
              <svg
                v-if="wizardData.triggerType === option.value"
                class="h-5 w-5 text-indigo-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </label>
          </div>

          <!-- Event Type Selection (if domain_event) -->
          <div v-if="wizardData.triggerType !== 'manual' && wizardData.triggerType !== 'form_submission'" class="mt-6">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Event Type <span class="text-red-500">*</span>
            </label>
            <select
              v-model="wizardData.eventType"
              class="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-indigo-500"
            >
              <option value="">Select an event type...</option>
              <optgroup v-if="wizardData.entityType === 'people' || !wizardData.entityType" label="People Events">
                <option value="people.lifecycle.changed">Lifecycle Changed</option>
                <option value="people.type.changed">Type Changed</option>
              </optgroup>
              <optgroup v-if="wizardData.entityType === 'organization' || !wizardData.entityType" label="Organization Events">
                <option value="organization.lifecycle.changed">Lifecycle Changed</option>
                <option value="organization.type.changed">Type Changed</option>
              </optgroup>
              <optgroup v-if="wizardData.entityType === 'deal' || !wizardData.entityType" label="Deal Events">
                <option value="deal.stage.changed">Stage Changed</option>
                <option value="deal.pipeline.changed">Pipeline Changed</option>
                <option value="deal.deal.won">Deal Won</option>
                <option value="deal.deal.lost">Deal Lost</option>
              </optgroup>
            </select>
          </div>
        </div>

        <!-- Step 2: Where does this apply? -->
        <div v-if="currentStep === 1" class="max-w-2xl mx-auto">
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Where does this apply?</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Choose which app and module this process applies to
            </p>
          </div>

          <div class="space-y-4">
            <!-- App Selection -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                App <span class="text-red-500">*</span>
              </label>
              <select
                v-model="wizardData.appKey"
                class="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-indigo-500"
              >
                <option value="">Select an app...</option>
                <option value="SALES">Sales</option>
                <option value="AUDIT">Audit</option>
                <option value="PORTAL">Portal</option>
              </select>
            </div>

            <!-- Module Selection -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Module <span class="text-red-500">*</span>
              </label>
              <select
                v-model="wizardData.entityType"
                class="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-indigo-500"
              >
                <option value="">Select a module...</option>
                <option value="people">People</option>
                <option value="organization">Organization</option>
                <option value="deal">Deal</option>
              </select>
            </div>

            <!-- Optional Conditions -->
            <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
              <label class="flex items-center cursor-pointer">
                <HeadlessCheckbox
                  v-model="wizardData.hasCondition"
                  checkbox-class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Apply only in some cases
                </span>
              </label>

              <div v-if="wizardData.hasCondition" class="mt-4 space-y-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div class="grid grid-cols-3 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Field
                    </label>
                    <input
                      v-model="wizardData.conditionField"
                      type="text"
                      placeholder="e.g. amount"
                      class="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Operator
                    </label>
                    <select
                      v-model="wizardData.conditionOperator"
                      class="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                    >
                      <option value="equals">Equals (=)</option>
                      <option value="not_equals">Not Equals (≠)</option>
                      <option value="greater_than">Greater Than (>)</option>
                      <option value="less_than">Less Than (<)</option>
                      <option value="contains">Contains</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Value
                    </label>
                    <input
                      v-model="wizardData.conditionValue"
                      type="text"
                      placeholder="e.g. 100000"
                      class="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3: What should the system control? -->
        <div v-if="currentStep === 2" class="max-w-2xl mx-auto">
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">What should the system control?</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Select what behaviors this process should control
            </p>
          </div>

          <div class="space-y-4">
            <!-- Field Behavior -->
            <div class="border border-gray-200 dark:border-gray-700 rounded-lg">
              <label class="flex items-center p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <HeadlessCheckbox
                  v-model="wizardData.controls.fieldBehavior"
                  checkbox-class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div class="ml-3 flex-1">
                  <span class="text-sm font-medium text-gray-900 dark:text-white">Control field behavior</span>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Make fields mandatory, set defaults, or control visibility
                  </p>
                </div>
              </label>

              <div v-if="wizardData.controls.fieldBehavior" class="px-4 pb-4 space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Field
                  </label>
                  <input
                    v-model="wizardData.fieldRule.fieldKey"
                    type="text"
                    placeholder="e.g. approval"
                    class="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Rule Type
                  </label>
                  <select
                    v-model="wizardData.fieldRule.rule"
                    class="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                  >
                    <option value="mandatory">Make mandatory</option>
                    <option value="default">Set default value</option>
                    <option value="visibility">Show / hide field</option>
                  </select>
                </div>
                <div v-if="wizardData.fieldRule.rule === 'default'">
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Default Value
                  </label>
                  <input
                    v-model="wizardData.fieldRule.value"
                    type="text"
                    placeholder="Enter default value"
                    class="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                  />
                </div>
                <div v-if="wizardData.fieldRule.rule === 'visibility'">
                  <label class="flex items-center">
                    <HeadlessCheckbox
                      v-model="wizardData.fieldRule.value"
                      checkbox-class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span class="ml-2 text-xs text-gray-700 dark:text-gray-300">Show field</span>
                  </label>
                </div>
                <div v-if="wizardData.fieldRule.rule === 'mandatory'" class="text-xs text-gray-500 dark:text-gray-400 italic">
                  This field will be mandatory when the process runs
                </div>
              </div>
            </div>

            <!-- Ownership & Assignment -->
            <div class="border border-gray-200 dark:border-gray-700 rounded-lg">
              <label class="flex items-center p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <HeadlessCheckbox
                  v-model="wizardData.controls.ownership"
                  checkbox-class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div class="ml-3 flex-1">
                  <span class="text-sm font-medium text-gray-900 dark:text-white">Control ownership & assignment</span>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Assign or reassign record ownership
                  </p>
                </div>
              </label>

              <div v-if="wizardData.controls.ownership" class="px-4 pb-4 space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Assignment Type
                  </label>
                  <select
                    v-model="wizardData.ownershipRule.assignment"
                    class="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                  >
                    <option value="owner">Specific user</option>
                    <option value="role">Role</option>
                    <option value="rule">Rule-based</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Target
                  </label>
                  <input
                    v-model="wizardData.ownershipRule.target"
                    type="text"
                    placeholder="User ID, role name, or rule reference"
                    class="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                  />
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 italic">
                  Assignment will follow existing permission rules.
                </div>
              </div>
            </div>

            <!-- Status / Stage Transitions -->
            <div class="border border-gray-200 dark:border-gray-700 rounded-lg">
              <label class="flex items-center p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <HeadlessCheckbox
                  v-model="wizardData.controls.statusGuard"
                  checkbox-class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div class="ml-3 flex-1">
                  <span class="text-sm font-medium text-gray-900 dark:text-white">Control status / stage transitions</span>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Allow or block status changes
                  </p>
                </div>
              </label>

              <div v-if="wizardData.controls.statusGuard" class="px-4 pb-4 space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Field
                  </label>
                  <select
                    v-model="wizardData.statusGuard.field"
                    class="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                  >
                    <option value="status">Status</option>
                    <option value="lifecycle">Lifecycle</option>
                    <option value="stage">Stage</option>
                  </select>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      From
                    </label>
                    <input
                      v-model="wizardData.statusGuard.from"
                      type="text"
                      placeholder="e.g. Open"
                      class="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      To
                    </label>
                    <input
                      v-model="wizardData.statusGuard.to"
                      type="text"
                      placeholder="e.g. Closed Won"
                      class="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Block Reason (shown to users)
                  </label>
                  <input
                    v-model="wizardData.statusGuard.blockReason"
                    type="text"
                    placeholder="e.g. Approval required"
                    class="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="border border-gray-200 dark:border-gray-700 rounded-lg">
              <label class="flex items-center p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <HeadlessCheckbox
                  v-model="wizardData.controls.actions"
                  checkbox-class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div class="ml-3 flex-1">
                  <span class="text-sm font-medium text-gray-900 dark:text-white">Run actions</span>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Create tasks, send notifications, or other automated actions
                  </p>
                </div>
              </label>

              <div v-if="wizardData.controls.actions" class="px-4 pb-4 space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Action Type
                  </label>
                  <select
                    v-model="wizardData.action.actionType"
                    class="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                  >
                    <option value="">Select action...</option>
                    <option value="create_task">Create Task</option>
                    <option value="notify_user">Send Notification</option>
                    <option value="start_process">Start Process</option>
                  </select>
                </div>

                <!-- Create Task Params -->
                <div v-if="wizardData.action.actionType === 'create_task'" class="space-y-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Task Title <span class="text-red-500">*</span>
                    </label>
                    <input
                      v-model="wizardData.action.params.title"
                      type="text"
                      placeholder="e.g. Follow up on deal"
                      class="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      v-model="wizardData.action.params.description"
                      rows="2"
                      placeholder="Task description..."
                      class="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                    ></textarea>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Assign To
                    </label>
                    <select
                      v-model="wizardData.action.params.assignee"
                      class="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                    >
                      <option value="owner">Record Owner</option>
                      <option value="triggeredBy">User Who Triggered</option>
                    </select>
                  </div>
                </div>

                <!-- Notify User Params -->
                <div v-if="wizardData.action.actionType === 'notify_user'" class="space-y-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Message <span class="text-red-500">*</span>
                    </label>
                    <textarea
                      v-model="wizardData.action.params.message"
                      rows="3"
                      placeholder="Notification message..."
                      class="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                    ></textarea>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Recipient
                    </label>
                    <select
                      v-model="wizardData.action.params.recipient"
                      class="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                    >
                      <option value="owner">Record Owner</option>
                      <option value="triggeredBy">User Who Triggered</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 4: Review & Create -->
        <div v-if="currentStep === 3" class="max-w-2xl mx-auto">
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Review & Create</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Review your process configuration before creating it
            </p>
          </div>

          <div class="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 space-y-4">
            <div>
              <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">When</h4>
              <p class="text-sm text-gray-700 dark:text-gray-300">
                {{ getTriggerDescription() }}
              </p>
            </div>

            <div>
              <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Where</h4>
              <p class="text-sm text-gray-700 dark:text-gray-300">
                {{ wizardData.appKey }} → {{ wizardData.entityType }}
                <span v-if="wizardData.hasCondition">
                  <br />If {{ wizardData.conditionField }} {{ getOperatorLabel(wizardData.conditionOperator) }} {{ wizardData.conditionValue }}
                </span>
              </p>
            </div>

            <div v-if="hasControls()">
              <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Then</h4>
              <ul class="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li v-if="wizardData.controls.fieldBehavior">
                  Make "{{ wizardData.fieldRule.fieldKey }}" {{ getFieldRuleDescription() }}
                </li>
                <li v-if="wizardData.controls.ownership">
                  Assign ownership to {{ wizardData.ownershipRule.target }} ({{ wizardData.ownershipRule.assignment }})
                </li>
                <li v-if="wizardData.controls.statusGuard">
                  {{ wizardData.statusGuard.blockReason ? 'Block' : 'Allow' }} {{ wizardData.statusGuard.field }} change from "{{ wizardData.statusGuard.from }}" to "{{ wizardData.statusGuard.to }}"
                  <span v-if="wizardData.statusGuard.blockReason">: {{ wizardData.statusGuard.blockReason }}</span>
                </li>
                <li v-if="wizardData.controls.actions">
                  {{ getActionDescription() }}
                </li>
              </ul>
            </div>
          </div>

          <!-- Process Name -->
          <div class="mt-6">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Process Name <span class="text-red-500">*</span>
            </label>
            <input
              v-model="wizardData.name"
              type="text"
              placeholder="e.g. Deal Approval Process"
              class="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-indigo-500"
            />
          </div>

          <div class="mt-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (optional)
            </label>
            <textarea
              v-model="wizardData.description"
              rows="3"
              placeholder="Describe what this process does..."
              class="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-indigo-500"
            ></textarea>
          </div>

          <!-- Error Display -->
          <div v-if="error" class="mt-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {{ error }}
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <button
          @click="$emit('close')"
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
        <div class="flex items-center gap-3">
          <button
            v-if="currentStep > 0"
            @click="previousStep"
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Previous
          </button>
          <button
            v-if="currentStep < steps.length - 1"
            @click="nextStep"
            :disabled="!canProceed"
            class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
          <button
            v-else
            @click="createProcess"
            :disabled="saving || !canCreate"
            class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span v-if="saving">Creating...</span>
            <span v-else>Create Process</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import apiClient from '@/utils/apiClient';
import HeadlessCheckbox from '@/components/ui/HeadlessCheckbox.vue';

const emit = defineEmits(['close', 'saved']);

const currentStep = ref(0);
const saving = ref(false);
const error = ref(null);

const steps = computed(() => [
  { id: '1', name: 'When', status: currentStep.value > 0 ? 'complete' : currentStep.value === 0 ? 'current' : 'upcoming' },
  { id: '2', name: 'Where', status: currentStep.value > 1 ? 'complete' : currentStep.value === 1 ? 'current' : 'upcoming' },
  { id: '3', name: 'What', status: currentStep.value > 2 ? 'complete' : currentStep.value === 2 ? 'current' : 'upcoming' },
  { id: '4', name: 'Review', status: currentStep.value === 3 ? 'current' : currentStep.value > 3 ? 'complete' : 'upcoming' }
]);

const triggerOptions = [
  {
    value: 'record_creation',
    label: 'On record creation',
    description: 'Runs automatically when a new record is created',
    eventType: null // Will be determined by entity type
  },
  {
    value: 'record_update',
    label: 'On record update',
    description: 'Runs automatically when a record is updated',
    eventType: null // Will be determined by entity type
  },
  {
    value: 'status_change',
    label: 'On status / stage change',
    description: 'Runs automatically when a Deal stage or status changes'
  },
  {
    value: 'form_submission',
    label: 'On form submission',
    description: 'Runs automatically when a form is submitted',
    eventType: null // Future: form submission events
  },
  {
    value: 'manual',
    label: 'Manual trigger',
    description: 'Run this process manually when needed'
  }
];

const wizardData = ref({
  name: '',
  description: '',
  triggerType: 'domain_event',
  eventType: '',
  appKey: '',
  entityType: '',
  hasCondition: false,
  conditionField: '',
  conditionOperator: 'equals',
  conditionValue: '',
  controls: {
    fieldBehavior: false,
    ownership: false,
    statusGuard: false,
    actions: false
  },
  fieldRule: {
    fieldKey: '',
    rule: 'mandatory',
    value: ''
  },
  ownershipRule: {
    assignment: 'owner',
    target: ''
  },
  statusGuard: {
    field: 'stage',
    from: '',
    to: '',
    blockReason: ''
  },
  action: {
    actionType: '',
    params: {
      title: '',
      description: '',
      assignee: 'owner',
      message: '',
      recipient: 'owner'
    }
  }
});

// Set default event type based on app and entity selection
watch(() => [wizardData.value.appKey, wizardData.value.entityType], ([app, entity]) => {
  if (app === 'SALES' && entity === 'deal' && wizardData.value.triggerType === 'status_change' && !wizardData.value.eventType) {
    wizardData.value.eventType = 'deal.stage.changed';
  }
});

// Auto-select event type based on trigger type and entity
watch(() => [wizardData.value.triggerType, wizardData.value.entityType], ([trigger, entity]) => {
  if (trigger === 'status_change' && entity === 'deal' && !wizardData.value.eventType) {
    wizardData.value.eventType = 'deal.stage.changed';
  } else if (trigger === 'record_update' && entity && !wizardData.value.eventType) {
    // Default to lifecycle.changed for record updates
    wizardData.value.eventType = `${entity}.lifecycle.changed`;
  }
});

const canProceed = computed(() => {
  if (currentStep.value === 0) {
    if (!wizardData.value.triggerType) return false;
    // Manual and form_submission don't need eventType
    if (wizardData.value.triggerType === 'manual' || wizardData.value.triggerType === 'form_submission') {
      return true;
    }
    return !!wizardData.value.eventType;
  }
  if (currentStep.value === 1) {
    return wizardData.value.appKey && wizardData.value.entityType;
  }
  if (currentStep.value === 2) {
    // At least one control must be selected
    return Object.values(wizardData.value.controls).some(v => v);
  }
  return true;
});

const canCreate = computed(() => {
  if (!wizardData.value.name.trim()) return false;
  if (!hasControls()) return false;
  
  // Validate field rule if enabled
  if (wizardData.value.controls.fieldBehavior && !wizardData.value.fieldRule.fieldKey) {
    return false;
  }
  
  // Validate ownership rule if enabled
  if (wizardData.value.controls.ownership && !wizardData.value.ownershipRule.target) {
    return false;
  }
  
  // Validate status guard if enabled
  if (wizardData.value.controls.statusGuard && (!wizardData.value.statusGuard.from || !wizardData.value.statusGuard.to)) {
    return false;
  }
  
  // Validate action if enabled
  if (wizardData.value.controls.actions) {
    if (!wizardData.value.action.actionType) return false;
    if (wizardData.value.action.actionType === 'create_task' && !wizardData.value.action.params.title) {
      return false;
    }
    if (wizardData.value.action.actionType === 'notify_user' && !wizardData.value.action.params.message) {
      return false;
    }
  }
  
  return true;
});

const hasControls = () => {
  return Object.values(wizardData.value.controls).some(v => v);
};

const getTriggerDescription = () => {
  if (wizardData.value.triggerType === 'manual') {
    return 'Manual trigger';
  }
  if (wizardData.value.triggerType === 'form_submission') {
    return 'When a form is submitted';
  }
  const eventLabels = {
    'people.lifecycle.changed': 'When a Person\'s lifecycle changes',
    'people.type.changed': 'When a Person\'s type changes',
    'organization.lifecycle.changed': 'When an Organization\'s lifecycle changes',
    'organization.type.changed': 'When an Organization\'s type changes',
    'deal.stage.changed': 'When a Deal\'s stage changes',
    'deal.pipeline.changed': 'When a Deal\'s pipeline changes',
    'deal.deal.won': 'When a Deal is won',
    'deal.deal.lost': 'When a Deal is lost'
  };
  return eventLabels[wizardData.value.eventType] || wizardData.value.eventType || 'On record update';
};

const getOperatorLabel = (op) => {
  const labels = {
    equals: '=',
    not_equals: '≠',
    greater_than: '>',
    less_than: '<',
    contains: 'contains'
  };
  return labels[op] || op;
};

const getFieldRuleDescription = () => {
  if (wizardData.value.fieldRule.rule === 'mandatory') {
    return 'mandatory';
  }
  if (wizardData.value.fieldRule.rule === 'default') {
    return `default to "${wizardData.value.fieldRule.value}"`;
  }
  return wizardData.value.fieldRule.value ? 'visible' : 'hidden';
};

const getActionDescription = () => {
  if (wizardData.value.action.actionType === 'create_task') {
    return `Create task: "${wizardData.value.action.params.title}"`;
  }
  if (wizardData.value.action.actionType === 'notify_user') {
    return `Notify ${wizardData.value.action.params.recipient === 'owner' ? 'owner' : 'user'}`;
  }
  return 'Run action';
};

const nextStep = () => {
  if (canProceed.value && currentStep.value < steps.value.length - 1) {
    currentStep.value++;
  }
};

const previousStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
};

const generateProcessDefinition = () => {
  const nodes = [];
  const edges = [];
  let nodeIdCounter = 1;

  // Generate node ID helper
  const getNodeId = (prefix) => `${prefix}_${nodeIdCounter++}`;

  // Determine trigger type and event type
  let triggerType = 'manual';
  let eventType = null;

  if (wizardData.value.triggerType === 'manual') {
    triggerType = 'manual';
  } else if (wizardData.value.triggerType === 'form_submission') {
    // Future: form submission events
    triggerType = 'domain_event';
    eventType = 'form.submitted'; // Placeholder
  } else {
    triggerType = 'domain_event';
    eventType = wizardData.value.eventType;
  }

  // Start with trigger node (if domain_event)
  if (triggerType === 'domain_event' && eventType) {
    const triggerNodeId = getNodeId('trigger');
    nodes.push({
      id: triggerNodeId,
      type: 'trigger',
      config: {
        eventType: eventType
      }
    });
  }

  // Add condition node if condition exists
  let lastNodeId = nodes.length > 0 ? nodes[nodes.length - 1].id : null;
  if (wizardData.value.hasCondition && wizardData.value.conditionField) {
    const conditionNodeId = getNodeId('condition');
    nodes.push({
      id: conditionNodeId,
      type: 'condition',
      config: {
        condition: {
          field: `event.currentState.${wizardData.value.conditionField}`,
          operator: wizardData.value.conditionOperator,
          value: wizardData.value.conditionValue
        }
      }
    });
    if (lastNodeId) {
      edges.push({
        fromNodeId: lastNodeId,
        toNodeId: conditionNodeId
      });
    }
    lastNodeId = conditionNodeId;
  }

  // Add field rule node
  if (wizardData.value.controls.fieldBehavior && wizardData.value.fieldRule.fieldKey) {
    const fieldRuleNodeId = getNodeId('field_rule');
    nodes.push({
      id: fieldRuleNodeId,
      type: 'field_rule',
      config: {
        entityType: wizardData.value.entityType,
        fieldKey: wizardData.value.fieldRule.fieldKey,
        rule: wizardData.value.fieldRule.rule,
        value: wizardData.value.fieldRule.rule === 'visibility' 
          ? wizardData.value.fieldRule.value 
          : wizardData.value.fieldRule.value || true
      }
    });
    if (lastNodeId) {
      edges.push({
        fromNodeId: lastNodeId,
        toNodeId: fieldRuleNodeId
      });
    }
    lastNodeId = fieldRuleNodeId;
  }

  // Add ownership rule node
  if (wizardData.value.controls.ownership && wizardData.value.ownershipRule.target) {
    const ownershipNodeId = getNodeId('ownership_rule');
    nodes.push({
      id: ownershipNodeId,
      type: 'ownership_rule',
      config: {
        entityType: wizardData.value.entityType,
        assignment: wizardData.value.ownershipRule.assignment,
        target: wizardData.value.ownershipRule.target
      }
    });
    if (lastNodeId) {
      edges.push({
        fromNodeId: lastNodeId,
        toNodeId: ownershipNodeId
      });
    }
    lastNodeId = ownershipNodeId;
  }

  // Add status guard node
  if (wizardData.value.controls.statusGuard && wizardData.value.statusGuard.from && wizardData.value.statusGuard.to) {
    const statusGuardNodeId = getNodeId('status_guard');
    nodes.push({
      id: statusGuardNodeId,
      type: 'status_guard',
      config: {
        entityType: wizardData.value.entityType,
        field: wizardData.value.statusGuard.field,
        allowedTransitions: [`${wizardData.value.statusGuard.from} → ${wizardData.value.statusGuard.to}`]
      }
    });
    if (lastNodeId) {
      edges.push({
        fromNodeId: lastNodeId,
        toNodeId: statusGuardNodeId
      });
    }
    lastNodeId = statusGuardNodeId;
  }

  // Add action node
  if (wizardData.value.controls.actions && wizardData.value.action.actionType) {
    const actionNodeId = getNodeId('action');
    const actionParams = { ...wizardData.value.action.params };
    
    // Clean up empty params
    Object.keys(actionParams).forEach(key => {
      if (actionParams[key] === '') {
        delete actionParams[key];
      }
    });

    nodes.push({
      id: actionNodeId,
      type: 'action',
      config: {
        actionType: wizardData.value.action.actionType,
        params: actionParams
      }
    });
    if (lastNodeId) {
      edges.push({
        fromNodeId: lastNodeId,
        toNodeId: actionNodeId
      });
    }
    lastNodeId = actionNodeId;
  }

  // Add end node
  const endNodeId = getNodeId('end');
  nodes.push({
    id: endNodeId,
    type: 'end',
    config: {}
  });
  if (lastNodeId) {
    edges.push({
      fromNodeId: lastNodeId,
      toNodeId: endNodeId
    });
  }

  return {
    name: wizardData.value.name,
    description: wizardData.value.description || '',
    appKey: wizardData.value.appKey,
    trigger: {
      type: triggerType,
      eventType: eventType
    },
    status: 'draft',
    version: 1,
    nodes,
    edges
  };
};

const createProcess = async () => {
  if (!canCreate.value) return;

  saving.value = true;
  error.value = null;

  try {
    const processDefinition = generateProcessDefinition();
    const response = await apiClient.post('/admin/processes', processDefinition);

    if (response.success) {
      emit('saved', response.data);
      emit('close');
    } else {
      error.value = response.message || 'Failed to create process';
    }
  } catch (err) {
    error.value = err.message || 'Failed to create process';
    console.error('Error creating process:', err);
  } finally {
    saving.value = false;
  }
};
</script>
