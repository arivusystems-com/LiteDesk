<template>
  <div class="task-record-page-root flex-1 min-h-0 overflow-hidden flex flex-col">
    <div v-if="embed && loading" class="flex items-center justify-center min-h-[200px] flex-1">
    <div class="text-center">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      <p class="text-gray-600 dark:text-gray-400 mt-4">Loading task...</p>
    </div>
  </div>
  <div v-else-if="error" class="flex items-center justify-center min-h-[200px] flex-1 p-4">
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error Loading Task</h2>
      <p class="text-gray-600 dark:text-gray-400 mb-6">{{ error }}</p>
      <button
        @click="fetchTask"
        class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
      >
        Retry
      </button>
    </div>
  </div>
  <RecordPageLayout
    v-else
    :left-expanded="!!expandedLeftSection"
    :force-mobile="embed"
    :class="[
      embed ? 'flex-1 min-h-0 overflow-hidden flex flex-col' : '',
      { 'record-page-layout--left-expanded': !!expandedLeftSection },
      '[&.record-page-layout--left-expanded_.record-page-layout__right]:hidden',
      '[&.record-page-layout--left-expanded_.record-page-layout__left]:flex-[1_1_100%] [&.record-page-layout--left-expanded_.record-page-layout__left]:max-w-full [&.record-page-layout--left-expanded_.record-page-layout__left]:pr-0 [&.record-page-layout--left-expanded_.record-page-layout__left]:min-h-0 [&.record-page-layout--left-expanded_.record-page-layout__left]:overflow-hidden',
      '[&.record-page-layout--left-expanded_.record-page-layout__left-content]:max-w-full [&.record-page-layout--left-expanded_.record-page-layout__left-content]:pl-0 [&.record-page-layout--left-expanded_.record-page-layout__left-content]:pr-0 [&.record-page-layout--left-expanded_.record-page-layout__left-content]:flex [&.record-page-layout--left-expanded_.record-page-layout__left-content]:flex-col [&.record-page-layout--left-expanded_.record-page-layout__left-content]:flex-1 [&.record-page-layout--left-expanded_.record-page-layout__left-content]:min-h-0',
      '[&.record-page-layout--left-expanded_.record-page-layout__body]:px-4'
    ]"
  >
    <template v-if="!embed" #header>
      <RecordHeader>
        <!-- Breadcrumbs -->
        <template #breadcrumbs>
          <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
            Task <span class="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500"></span> {{ task?._id?.slice(-8) || 'N/A' }}
          </span>
        </template>
        
        <!-- Page actions (top right) -->
        <template #pageActions>
          <button
            type="button"
            @click="showEditDrawer = true"
            class="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Edit task"
            title="Edit task"
          >
            <PencilSquareIcon class="w-5 h-5" />
          </button>
          <button
            type="button"
            ref="tagHeaderButtonRef"
            @click="handleTagIconClick($event)"
            :class="[
              'relative inline-flex items-center justify-center p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
              hasTaskTags
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            ]"
            aria-label="Tag"
            title="Tag"
          >
            <TagIcon class="block w-5 h-5" />
            <span
              v-if="hasTaskTags"
              class="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"
            ></span>
          </button>
          <button
            type="button"
            @click="handleCopyUrl"
            class="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Copy URL"
            title="Copy URL"
          >
            <ClipboardDocumentIcon class="w-5 h-5" />
          </button>
          <button
            type="button"
            @click="handleToggleFollow"
            :class="[
              'p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
              isFollowing ? 'text-yellow-500 dark:text-yellow-400' : ''
            ]"
            :aria-label="isFollowing ? 'Unstar' : 'Star'"
            :title="isFollowing ? 'Unstar' : 'Star'"
          >
            <StarIcon v-if="!isFollowing" class="w-5 h-5" />
            <StarIconSolid v-else class="w-5 h-5" />
          </button>
          <button
            type="button"
            @click="handleClose"
            class="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
            aria-label="Close"
            title="Close"
          >
            <XMarkIcon class="w-5 h-5" />
          </button>
          <Menu as="div" class="relative">
            <MenuButton
              class="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="More actions"
            >
              <EllipsisVerticalIcon class="w-5 h-5" />
            </MenuButton>
            <transition
              enter-active-class="transition ease-out duration-100"
              enter-from-class="transform opacity-0 scale-95"
              enter-to-class="transform opacity-100 scale-100"
              leave-active-class="transition ease-in duration-75"
              leave-from-class="transform opacity-100 scale-100"
              leave-to-class="transform opacity-0 scale-95"
            >
              <MenuItems
                class="absolute right-0 top-full mt-2 w-48 rounded-lg shadow-xl py-1 bg-white dark:bg-gray-800 ring-1 ring-black/5 dark:ring-white/10 z-50"
              >
                <MenuItem v-slot="{ active }">
                  <button
                    @click="handleDuplicate"
                    :class="[
                      'w-full text-left px-4 py-2 text-sm transition-colors duration-150 flex items-center gap-2',
                      active ? 'bg-gray-100 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-200'
                    ]"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Duplicate</span>
                  </button>
                </MenuItem>
                <MenuItem v-slot="{ active }">
                  <button
                    @click="handleExport"
                    :class="[
                      'w-full text-left px-4 py-2 text-sm transition-colors duration-150 flex items-center gap-2',
                      active ? 'bg-gray-100 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-200'
                    ]"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Export</span>
                  </button>
                </MenuItem>
                <hr class="my-1 border-gray-200 dark:border-gray-700" />
                <MenuItem v-slot="{ active }">
                  <button
                    @click="handleDelete"
                    :class="[
                      'w-full text-left px-4 py-2 text-sm transition-colors duration-150 flex items-center gap-2',
                      active ? 'bg-gray-100 dark:bg-gray-700' : 'text-red-600 dark:text-red-400'
                    ]"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete</span>
                  </button>
                </MenuItem>
              </MenuItems>
            </transition>
          </Menu>
        </template>
      </RecordHeader>
    </template>

    <template #left>
      <div
        v-if="expandedLeftSection"
        :class="[
          'flex-shrink-0 mb-4 sticky z-20 bg-white/95 dark:bg-gray-900/95 supports-[backdrop-filter]:bg-white/90 supports-[backdrop-filter]:dark:bg-gray-900/90 backdrop-blur',
          embed ? 'top-0' : 'top-0 lg:-top-6'
        ]"
      >
        <div class="flex items-center justify-between gap-2 py-2">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            @click="closeExpandedLeftSection"
          >
            <ArrowLeftIcon class="h-4 w-4" />
            <span>Back to task</span>
          </button>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            aria-label="Collapse section"
            title="Collapse"
            @click="closeExpandedLeftSection"
          >
            <ArrowsPointingInIcon class="h-4 w-4" />
          </button>
        </div>
      </div>

      <!-- Description version history full page -->
      <div
        v-if="task && expandedLeftSection === 'description-history'"
        class="description-history-page flex-1 min-h-0 mt-4 flex flex-col gap-6"
      >
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white flex-shrink-0">{{ task.title || 'Task' }}</h2>
        <div class="grid grid-cols-1 lg:grid-cols-[1fr_320px] grid-rows-[1fr] gap-6 min-h-0 flex-1">
          <!-- Left: content column – fixed height, internal scroll -->
          <div class="flex flex-col min-h-0 min-w-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden h-full">
            <div class="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              <!-- Diff view (added = green, removed = red strikethrough) when a past version is selected -->
              <div
                v-if="descriptionHistoryShowDiff && descriptionHistoryDiffHtml"
                class="text-md text-gray-900 dark:text-white px-6 py-4 leading-[1.75] [&_del]:px-0.5 [&_ins]:px-0.5"
                v-html="descriptionHistoryDiffHtml"
              />
              <!-- Rich content when current version or when diff is empty -->
              <div
                v-else-if="descriptionHistorySelectedHasContent"
                class="text-md text-gray-900 dark:text-white px-6 py-4 leading-[1.75] [&_p]:mb-2 [&_p:last-child]:mb-0 [&_p]:leading-[1.75] [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:my-4 [&_h1]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:my-4 [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:my-4 [&_h3]:mb-2 [&_ul]:my-2 [&_ol]:my-2 [&_ul]:pl-6 [&_ol]:pl-6 [&_ul]:list-disc [&_ol]:list-decimal [&_blockquote]:border-l-4 [&_blockquote]:border-gray-200 [&_blockquote]:pl-4 [&_blockquote]:my-2 [&_blockquote]:text-gray-500 dark:[&_blockquote]:border-gray-600 dark:[&_blockquote]:text-gray-400 [&_a]:text-indigo-600 [&_a]:underline dark:[&_a]:text-indigo-400"
                v-html="descriptionHistorySelectedContent"
              />
              <p v-else class="px-6 py-4 text-sm text-gray-400 dark:text-gray-500 italic m-0">
                No description in this version.
              </p>
            </div>
          </div>
          <!-- Right: version list column – fixed height, internal scroll -->
          <div class="flex flex-col min-h-0 min-w-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden h-full">
            <h3 class="font-semibold text-gray-900 dark:text-white px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              Version history
            </h3>
            <div v-if="descriptionVersionsLoading" class="flex items-center justify-center py-8 flex-1 min-h-0 overflow-hidden">
              <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            </div>
            <div v-else class="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-0">
              <label
                v-for="(ver, idx) in descriptionHistoryList"
                :key="ver.isCurrent ? 'current' : `version-${idx}-${ver.createdAt}`"
                :class="[
                  'flex items-start gap-3 py-3 px-3 rounded-lg cursor-pointer transition-colors',
                  selectedDescriptionVersionIndex === idx
                    ? 'bg-indigo-50 dark:bg-indigo-900/30'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                ]"
              >
                <input
                  v-model="selectedDescriptionVersionIndex"
                  type="radio"
                  :name="'desc-version-' + (task._id || '')"
                  :value="idx"
                  class="mt-1 h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 focus:ring-indigo-500"
                />
                <div class="min-w-0 flex-1">
                  <span class="text-sm text-gray-900 dark:text-white block">
                    {{ formatDescriptionVersionDate(ver.createdAt) }}
                  </span>
                  <span class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5">
                    <span v-if="ver.isCurrent" class="font-medium text-gray-600 dark:text-gray-300">Current Version</span>
                    <template v-else>
                      <Avatar
                        v-if="ver.createdBy"
                        :record="{ name: ver.createdBy }"
                        size="sm"
                        class="shrink-0"
                      />
                      {{ ver.createdBy }}
                    </template>
                  </span>
                </div>
              </label>
            </div>
            <p class="text-xs text-gray-400 dark:text-gray-500 px-4 py-2 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
              Version history will be stored for up to 365 days in task descriptions.
            </p>
            <div class="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <button
                type="button"
                :disabled="selectedDescriptionVersionIndex === 0 || descriptionRestoreLoading"
                class="w-full inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none"
                @click="restoreDescriptionVersion"
              >
                <span v-if="descriptionRestoreLoading">Restoring…</span>
                <span v-else>Restore this version</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Editable Title Section -->
      <div
        v-if="task && !expandedLeftSection"
        :class="[
          'mb-6 sticky z-10 border-b transition-[padding,background-color,border-color,backdrop-filter] duration-200 ease-out',
          embed ? 'top-0 py-2 lg:py-4 lg:mb-0 mb-0' : 'top-0 lg:-top-6',
          isLeftTitleSticky
            ? 'border-b border-gray-200/80 dark:border-gray-700/80 bg-white/95 dark:bg-gray-900/95 supports-[backdrop-filter]:bg-white/90 supports-[backdrop-filter]:dark:bg-gray-900/90 backdrop-blur py-4'
            : 'border-b border-gray-200/80 dark:border-gray-700/80 bg-white/95 dark:bg-gray-900/95 supports-[backdrop-filter]:bg-white/90 supports-[backdrop-filter]:dark:bg-gray-900/90 backdrop-blur py-4 lg:border-transparent lg:bg-transparent lg:shadow-none lg:py-0'
        ]"
      >
        <div class="flex items-center gap-3">
          <Avatar :record="{ name: TASK_MODULE_NAME }" :icon="CheckCircleIcon" size="lg" class="shrink-0" />
          <div class="min-w-0 flex-1">
            <EditableTitle
              :title="task.title || ''"
              :can-edit="canEditTask"
              @save="handleTitleSave"
            />
          </div>
        </div>
      </div>

      <!-- RecordStateSection - Core properties in two-column layout -->
      <div
        v-if="task && (!expandedLeftSection || expandedLeftSection === 'key-fields')"
        :class="['group/left-section', expandedLeftSection ? 'mt-8' : 'mt-4']"
      >
        <RecordStateSection
          heading="Key fields"
          :fields="keySectionFields"
          :field-values="keyFieldDisplayValues"
          :enable-legacy-fallback="false"
          :signals="computeSignals(task)"
          :next-action-hint="getNextActionHint(task)"
        >
        <!-- Editable Status slot - dropdown opens on click, value stays visible -->
        <template #status>
          <Listbox
            v-if="canEditTask"
            :model-value="task.status"
            @update:model-value="(v) => handleFieldSave('status', v)"
          >
            <div class="relative w-full">
              <ListboxButton
                :class="[
                  'inline-flex items-center rounded-md text-xs font-semibold transition-colors focus:outline-none focus:ring-0',
                  getStatusPillClass(task.status)
                ]"
                :style="getStatusPillStyle(task.status)"
              >
                <span class="truncate px-2.5 py-1">{{ formatStatus(task.status) }}</span>
                <span
                  :class="['inline-flex items-center justify-center px-2 py-1 border-l', getStatusPillDividerClass(task.status)]"
                  :style="getStatusPillDividerStyle(task.status)"
                >
                  <ChevronDownIcon class="h-4 w-4" />
                </span>
              </ListboxButton>
              <Transition
                leave-active-class="transition duration-100 ease-in"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
              >
                <ListboxOptions
                  class="absolute z-10 mt-1 max-h-60 w-full min-w-[140px] overflow-auto rounded-lg bg-white dark:bg-gray-700 py-1 text-base shadow-lg ring-1 ring-black/5 dark:ring-white/10 focus:outline-none sm:text-sm"
                >
                  <ListboxOption
                    v-for="opt in statusSelectOptions"
                    :key="opt.value"
                    :value="opt.value"
                    v-slot="{ active, selected }"
                  >
                    <li :class="['relative cursor-default select-none py-2 pl-4 pr-10', active ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100' : 'text-gray-900 dark:text-gray-100']">
                      <span :class="['flex items-center gap-2 truncate', selected ? 'font-medium' : 'font-normal']">
                        <span
                          class="inline-block h-2.5 w-2.5 rounded-full border border-black/10 dark:border-white/20"
                          :style="opt.color ? { backgroundColor: opt.color } : null"
                        />
                        <span class="truncate">{{ opt.label }}</span>
                      </span>
                      <span v-if="selected" class="absolute inset-y-0 right-0 flex items-center pr-3 text-indigo-600 dark:text-indigo-400">
                        <CheckIcon class="h-5 w-5" aria-hidden="true" />
                      </span>
                    </li>
                  </ListboxOption>
                </ListboxOptions>
              </Transition>
            </div>
          </Listbox>
          <span
            v-else
            :class="[
              'inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold cursor-default select-none bg-gray-50 dark:bg-gray-800/60',
              getStatusPillClass(task.status)
            ]"
            :style="getStatusPillStyle(task.status)"
          >
            {{ formatStatus(task.status) }}
          </span>
        </template>
        
        <!-- Editable Start Date slot -->
        <template #startDate>
          <div v-if="canEditTask">
            <div class="w-full min-h-8 px-2 py-1 -mx-2 -my-1 flex items-center">
              <input
                v-show="isEditingStartDate"
                ref="startDateInputRef"
                v-model="localStartDate"
                type="date"
                @click="openDatePicker"
                @blur="handleStartDateBlur"
                @keydown.enter="handleStartDateBlur"
                @keydown.esc="handleStartDateCancel"
                class="text-xs h-8 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full cursor-pointer"
                placeholder="Start date"
              />
              <span
                v-show="!isEditingStartDate"
                @click="isEditingStartDate = true"
                :class="[
                  'block w-full h-8 text-sm cursor-text hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-2 transition-colors flex items-center',
                  task.startDate ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
                ]"
              >
                {{ formatStateDate(task.startDate) || 'Empty' }}
              </span>
            </div>
          </div>
          <span
            v-else
            :class="[
              'block w-full min-h-8 text-sm rounded px-2 py-1 cursor-default select-none bg-gray-50 dark:bg-gray-800/60 flex items-center',
              task.startDate ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
            ]"
          >{{ formatStateDate(task.startDate) || 'Empty' }}</span>
        </template>

        <!-- Editable Due Date slot -->
        <template #dueDate>
          <div v-if="canEditTask">
            <div class="w-full min-h-8 px-2 py-1 -mx-2 -my-1 flex items-center">
              <input
                v-show="isEditingDueDate"
                ref="dueDateInputRef"
                v-model="localDueDate"
                type="date"
                @click="openDatePicker"
                @blur="handleDueDateBlur"
                @keydown.enter="handleDueDateBlur"
                @keydown.esc="handleDueDateCancel"
                class="text-xs h-8 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full cursor-pointer"
                placeholder="Due date"
              />
              <span
                v-show="!isEditingDueDate"
                @click="isEditingDueDate = true"
                :class="[
                  'block w-full h-8 text-sm cursor-text hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-2 transition-colors flex items-center',
                  task.dueDate ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
                ]"
              >
                {{ formatStateDate(task.dueDate) || 'Empty' }}
              </span>
            </div>
          </div>
          <span
            v-else
            :class="[
              'block w-full min-h-8 text-sm rounded px-2 py-1 cursor-default select-none bg-gray-50 dark:bg-gray-800/60 flex items-center',
              task.dueDate ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
            ]"
          >{{ formatStateDate(task.dueDate) || 'Empty' }}</span>
        </template>
        
        <!-- Editable Time Estimate slot -->
        <template #timeEstimate>
          <div v-if="canEditTask">
            <div class="w-full min-h-8 px-2 py-1 -mx-2 -my-1 flex items-center">
              <input
                v-show="isEditingTimeEstimate"
                ref="timeEstimateInputRef"
                v-model.number="localTimeEstimate"
                type="number"
                min="0"
                step="0.5"
                @blur="handleTimeEstimateBlur"
                @keydown.enter="handleTimeEstimateBlur"
                @keydown.esc="handleTimeEstimateCancel"
                class="text-sm h-8 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-24"
              />
              <span
                v-show="!isEditingTimeEstimate"
                @click="isEditingTimeEstimate = true"
                :class="[
                  'block w-full h-8 text-sm cursor-text hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-2 transition-colors flex items-center',
                  task.estimatedHours ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
                ]"
              >
                {{ task.estimatedHours ? `${task.estimatedHours}h` : 'Empty' }}
              </span>
            </div>
          </div>
          <span
            v-else
            :class="[
              'block w-full min-h-8 text-sm rounded px-2 py-1 cursor-default select-none bg-gray-50 dark:bg-gray-800/60 flex items-center',
              task.estimatedHours ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
            ]"
          >{{ task.estimatedHours ? `${task.estimatedHours}h` : 'Empty' }}</span>
        </template>
        
        <!-- Editable owner slot - dropdown opens on click, value stays visible -->
        <template #owner>
          <Listbox
            v-if="canEditTask"
            :model-value="task.assignedTo ? (typeof task.assignedTo === 'object' ? task.assignedTo._id : task.assignedTo) : null"
            @update:model-value="(v) => handleFieldSave('assignedTo', v)"
          >
            <div class="relative w-full">
              <ListboxButton
                class="flex items-center gap-2 w-full min-h-8 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2 -my-1 transition-colors focus:outline-none focus:ring-0"
              >
                <Avatar
                  v-if="task.assignedTo && typeof task.assignedTo === 'object'"
                  :user="{
                    firstName: task.assignedTo.firstName || task.assignedTo.first_name,
                    lastName: task.assignedTo.lastName || task.assignedTo.last_name,
                    email: task.assignedTo.email,
                    avatar: task.assignedTo.avatar
                  }"
                  size="sm"
                />
                <span
                  :class="[
                    'text-sm flex-1 truncate',
                    task.assignedTo ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
                  ]"
                >
                  {{ task.assignedTo ? getUserDisplayName(task.assignedTo) : 'Empty' }}
                </span>
              </ListboxButton>
              <Transition
                leave-active-class="transition duration-100 ease-in"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
              >
                <ListboxOptions
                  class="absolute z-10 mt-1 max-h-60 w-full min-w-[160px] overflow-auto rounded-lg bg-white dark:bg-gray-700 py-1 text-base shadow-lg ring-1 ring-black/5 dark:ring-white/10 focus:outline-none sm:text-sm"
                >
                  <ListboxOption :value="null" v-slot="{ active }">
                    <li :class="['relative cursor-default select-none py-2 pl-4 pr-10 flex items-center gap-2', active ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100' : 'text-gray-900 dark:text-gray-100']">
                      <span class="block truncate">Unassigned</span>
                    </li>
                  </ListboxOption>
                  <ListboxOption
                    v-for="user in users"
                    :key="user._id"
                    :value="user._id"
                    v-slot="{ active, selected }"
                  >
                    <li :class="['relative cursor-default select-none py-2 pl-4 pr-10 flex items-center gap-2', active ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100' : 'text-gray-900 dark:text-gray-100']">
                      <Avatar :user="user" size="sm" />
                      <span :class="['block truncate flex-1', selected ? 'font-medium' : 'font-normal']">{{ getUserDisplayName(user) }}</span>
                      <span v-if="selected" class="absolute inset-y-0 right-0 flex items-center pr-3 text-indigo-600 dark:text-indigo-400">
                        <CheckIcon class="h-5 w-5" aria-hidden="true" />
                      </span>
                    </li>
                  </ListboxOption>
                </ListboxOptions>
              </Transition>
            </div>
          </Listbox>
          <div v-else class="flex items-center gap-2 min-h-8 rounded px-2 py-1 cursor-default select-none bg-gray-50 dark:bg-gray-800/60">
            <Avatar
              v-if="task.assignedTo && typeof task.assignedTo === 'object'"
              :user="{
                firstName: task.assignedTo.firstName || task.assignedTo.first_name,
                lastName: task.assignedTo.lastName || task.assignedTo.last_name,
                email: task.assignedTo.email,
                avatar: task.assignedTo.avatar
              }"
              size="sm"
            />
            <span
              :class="[
                'text-sm',
                task.assignedTo ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
              ]"
            >
              {{ task.assignedTo ? getUserDisplayName(task.assignedTo) : 'Empty' }}
            </span>
          </div>
        </template>
        
        <!-- Editable Priority slot - dropdown opens on click, value stays visible -->
        <template #priority>
          <Listbox
            v-if="canEditTask"
            :model-value="task.priority"
            @update:model-value="(v) => handleFieldSave('priority', v)"
          >
            <div class="relative w-full">
              <ListboxButton
                :class="[
                  'inline-flex items-center gap-2 rounded px-2 py-1 min-h-8 text-sm transition-colors w-full text-left focus:outline-none focus:ring-0 hover:bg-gray-50 dark:hover:bg-gray-800',
                  getPriorityTextClass(task.priority)
                ]"
              >
                <FlagIconSolid
                  v-if="task.priority"
                  class="h-4 w-4 shrink-0"
                  :style="getPriorityFlagStyle(task.priority)"
                />
                <span class="block truncate">{{ formatPriority(task.priority) || 'Empty' }}</span>
              </ListboxButton>
              <Transition
                leave-active-class="transition duration-100 ease-in"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
              >
                <ListboxOptions
                  class="absolute z-10 mt-1 max-h-60 w-full min-w-[140px] overflow-auto rounded-lg bg-white dark:bg-gray-700 py-1 text-base shadow-lg ring-1 ring-black/5 dark:ring-white/10 focus:outline-none sm:text-sm"
                >
                  <ListboxOption :value="null" v-slot="{ active }">
                    <li :class="['relative cursor-default select-none py-2 pl-4 pr-10', active ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100' : 'text-gray-900 dark:text-gray-100']">
                      <span class="block truncate">Empty</span>
                    </li>
                  </ListboxOption>
                  <ListboxOption
                    v-for="opt in prioritySelectOptions"
                    :key="opt.value"
                    :value="opt.value"
                    v-slot="{ active, selected }"
                  >
                    <li :class="['relative cursor-default select-none py-2 pl-4 pr-10', active ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100' : 'text-gray-900 dark:text-gray-100']">
                      <span :class="['flex items-center gap-2 truncate', selected ? 'font-medium' : 'font-normal']">
                        <FlagIconSolid
                          class="h-4 w-4 shrink-0"
                          :style="getPriorityFlagStyle(opt.value)"
                        />
                        <span class="truncate">{{ opt.label }}</span>
                      </span>
                      <span v-if="selected" class="absolute inset-y-0 right-0 flex items-center pr-3 text-indigo-600 dark:text-indigo-400">
                        <CheckIcon class="h-5 w-5" aria-hidden="true" />
                      </span>
                    </li>
                  </ListboxOption>
                </ListboxOptions>
              </Transition>
            </div>
          </Listbox>
          <span
            v-else
            :class="[
              'inline-flex items-center gap-2 min-h-8 text-sm rounded px-2 py-1 cursor-default select-none bg-gray-50 dark:bg-gray-800/60',
              getPriorityTextClass(task.priority)
            ]"
          >
            <FlagIconSolid
              v-if="task.priority"
              class="h-4 w-4 shrink-0"
              :style="getPriorityFlagStyle(task.priority)"
            />
            {{ formatPriority(task.priority) }}
          </span>
        </template>

        <!-- Editable Tags slot -->
        <template #tags>
          <button
            v-if="canEditTask"
            ref="tagFieldButtonRef"
            type="button"
            @click="openTagPopoverFromField($event)"
            class="w-full min-w-0 min-h-8 flex items-center text-sm text-left text-gray-900 dark:text-white rounded px-2 py-1 -mx-2 -my-1 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <div v-if="task.tags && task.tags.length > 0" class="flex flex-wrap gap-1.5 text-left">
              <span
                v-for="(tag, index) in task.tags"
                :key="`${tag}-${index}`"
                :class="['inline-block text-xs px-2 py-0.5 rounded', getTagChipClass(tag)]"
              >
                {{ tag }}
              </span>
            </div>
            <span v-else class="text-gray-400 dark:text-gray-500">Click to add tags</span>
          </button>

          <div v-else class="w-full min-w-0 min-h-8 text-sm text-gray-900 dark:text-white rounded px-2 py-1 cursor-default select-none bg-gray-50 dark:bg-gray-800/60 flex items-center">
            <div v-if="task.tags && task.tags.length > 0" class="flex flex-wrap gap-1.5 text-left">
              <span
                v-for="(tag, index) in task.tags"
                :key="`${tag}-${index}`"
                :class="['inline-block text-xs px-2 py-0.5 rounded', getTagChipClass(tag)]"
              >
                {{ tag }}
              </span>
            </div>
            <span v-else class="text-gray-400 dark:text-gray-500">Empty</span>
          </div>
        </template>
        </RecordStateSection>
      </div>

      <!-- Description -->
      <section
        v-if="!expandedLeftSection || expandedLeftSection === 'description'"
        :class="[
          'group/left-section pt-4 pb-4',
          expandedLeftSection === 'description'
            ? 'border-transparent'
            : ' border-gray-200 dark:border-gray-700'
        ]"
      >
        <div class="flex items-center justify-between gap-3 pb-2">
          <h3 :class="['font-semibold text-gray-900 dark:text-white', expandedLeftSection ? 'text-2xl' : 'text-base']">Description</h3>
          <div v-if="!expandedLeftSection" class="inline-flex items-center gap-0.5">
            <button
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 opacity-100 transition-opacity hover:text-gray-800 hover:bg-gray-50 lg:opacity-0 lg:group-hover/left-section:opacity-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800"
              aria-label="Version history"
              title="Version history"
              @click.stop="openDescriptionHistory"
            >
              <ClockIcon class="h-4 w-4" />
            </button>
            <button
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 opacity-100 transition-opacity hover:text-gray-800 hover:bg-gray-50 lg:opacity-0 lg:group-hover/left-section:opacity-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800"
              aria-label="Expand description"
              title="Expand"
              @click.stop="openLeftSection('description')"
            >
              <ArrowsPointingOutIcon class="h-4 w-4" />
            </button>
          </div>
        </div>
        <div v-if="task">
          <div
            v-if="!isEditingDescription && canEditTask"
            ref="descriptionDisplayRef"
            @click="startEditDescription"
            :class="[
              'cursor-text transition-colors rounded-lg',
              hasDescription
                ? 'hover:bg-gray-50 dark:hover:bg-gray-800 px-2 py-2 -mx-2 -my-2'
                : 'border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/70 px-6 py-2 min-h-[60px] flex items-center'
            ]"
          >
            <div v-if="hasDescription">
              <div
                class="text-md text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 px-6 py-4 leading-[1.75] [&_p]:mb-2 [&_p:last-child]:mb-0 [&_p]:leading-[1.75] [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:my-4 [&_h1]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:my-4 [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:my-4 [&_h3]:mb-2 [&_ul]:my-2 [&_ol]:my-2 [&_ul]:pl-6 [&_ol]:pl-6 [&_ul]:list-disc [&_ol]:list-decimal [&_blockquote]:border-l-4 [&_blockquote]:border-gray-200 [&_blockquote]:pl-4 [&_blockquote]:my-2 [&_blockquote]:text-gray-500 dark:[&_blockquote]:border-gray-600 dark:[&_blockquote]:text-gray-400 [&_a]:text-indigo-600 [&_a]:underline dark:[&_a]:text-indigo-400"
                :style="descriptionContentStyle"
                v-html="sanitizedDescription"
              />
              <button
                v-if="shouldShowDescriptionViewMore && !isDescriptionExpanded"
                type="button"
                class="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                @click.stop="isDescriptionExpanded = true"
              >
                View more
              </button>
            </div>
            <p v-else class="text-sm text-gray-400 dark:text-gray-500 italic m-0 w-full">
              No description added yet. Click to add.
            </p>
          </div>
          <div
            v-else-if="isEditingDescription && canEditTask"
            class="editable-description flex flex-col"
            :style="descriptionMinHeight != null ? { minHeight: `${descriptionMinHeight}px` } : undefined"
          >
            <TaskDescriptionEditor
              class="min-h-0 flex-1"
              ref="descriptionEditorRef"
              v-model="localDescription"
              placeholder="Write or type '/' for commands"
              @blur="handleDescriptionBlur"
              @cancel="handleDescriptionCancel"
            />
          </div>
          <div v-else>
            <div v-if="hasDescription">
              <div
                class="text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 px-6 py-4 leading-[1.75] [&_p]:mb-2 [&_p:last-child]:mb-0 [&_p]:leading-[1.75] [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:my-4 [&_h1]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:my-4 [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:my-4 [&_h3]:mb-2 [&_ul]:my-2 [&_ol]:my-2 [&_ul]:pl-6 [&_ol]:pl-6 [&_ul]:list-disc [&_ol]:list-decimal [&_blockquote]:border-l-4 [&_blockquote]:border-gray-200 [&_blockquote]:pl-4 [&_blockquote]:my-2 [&_blockquote]:text-gray-500 dark:[&_blockquote]:border-gray-600 dark:[&_blockquote]:text-gray-400 [&_a]:text-indigo-600 [&_a]:underline dark:[&_a]:text-indigo-400"
                :style="descriptionContentStyle"
                v-html="sanitizedDescription"
              />
              <button
                v-if="shouldShowDescriptionViewMore && !isDescriptionExpanded"
                type="button"
                class="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                @click="isDescriptionExpanded = true"
              >
                View more
              </button>
            </div>
            <div
              v-else
              class="text-sm text-gray-400 dark:text-gray-500 italic border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50/50 dark:bg-gray-800/50 px-6 py-2 min-h-[60px] flex items-center"
            >
              No description added yet.
            </div>
          </div>
        </div>
      </section>

      <div v-if="task && (!expandedLeftSection || expandedLeftSection === 'details')" class="group/left-section">
        <div class="pt-4 pb-0 flex items-center justify-between gap-3">
          <h3 :class="['font-semibold text-gray-900 dark:text-white', expandedLeftSection ? 'text-2xl' : 'text-base']">Details</h3>
          <button
            v-if="!expandedLeftSection"
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 opacity-100 transition-opacity hover:text-gray-800 hover:bg-gray-50 lg:opacity-0 lg:group-hover/left-section:opacity-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800"
            aria-label="Expand details"
            title="Expand"
            @click.stop="openLeftSection('details')"
          >
            <ArrowsPointingOutIcon class="h-4 w-4" />
          </button>
        </div>

        <RecordFieldsSection 
          :groups="fieldGroups"
          :collapsible="false"
          :list-layout="true"
          :boxed="false"
        >
          <template v-for="group in fieldGroups" :key="group.key" #[`group-${group.key}`]>
            <template v-for="fieldKey in getGroupFields(group.key)" :key="fieldKey">
              <EditableLabeledValue
                v-if="fieldKey === 'assignedTo'"
                class="pl-0"
                layout="row"
                :label="getFieldLabel(fieldKey)"
                :value="task[fieldKey]"
                type="user"
                :can-edit="canEditTask && getTaskFieldMetadata(fieldKey)?.editable !== false"
                :users="users"
                @save="handleFieldSave(fieldKey, $event)"
              >
                <template v-if="task[fieldKey]">
                  <div class="flex items-center gap-2">
                    <Avatar
                      v-if="typeof task[fieldKey] === 'object'"
                      :user="{
                        firstName: task[fieldKey].firstName || task[fieldKey].first_name,
                        lastName: task[fieldKey].lastName || task[fieldKey].last_name,
                        email: task[fieldKey].email,
                        avatar: task[fieldKey].avatar
                      }"
                      size="sm"
                    />
                    <span class="text-sm text-gray-900 dark:text-white">
                      {{ getUserDisplayName(task[fieldKey]) }}
                    </span>
                  </div>
                </template>
              </EditableLabeledValue>

              <EditableLabeledValue
                v-else-if="fieldKey === 'dueDate' || fieldKey === 'startDate'"
                class="pl-0"
                layout="row"
                :label="getFieldLabel(fieldKey)"
                :value="task[fieldKey]"
                type="date"
                :can-edit="canEditTask && getTaskFieldMetadata(fieldKey)?.editable !== false"
                @save="handleFieldSave(fieldKey, $event)"
                :format-value="(val) => val ? formatDate(val) : null"
              >
                <DateCell v-if="task[fieldKey]" :value="task[fieldKey]" format="short" />
              </EditableLabeledValue>

              <EditableLabeledValue
                v-else-if="fieldKey === 'priority' || fieldKey === 'status'"
                class="pl-0"
                layout="row"
                :label="getFieldLabel(fieldKey)"
                :value="task[fieldKey]"
                type="select"
                :can-edit="canEditTask && getTaskFieldMetadata(fieldKey)?.editable !== false"
                :options="getFieldOptions(fieldKey)"
                @save="handleFieldSave(fieldKey, $event)"
                :format-value="fieldKey === 'priority' ? formatPriority : formatStatus"
              >
                <span
                  v-if="fieldKey === 'status'"
                  :class="[
                    'inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold',
                    getStatusPillClass(task[fieldKey])
                  ]"
                  :style="getStatusPillStyle(task[fieldKey])"
                >
                  {{ formatStatus(task[fieldKey]) }}
                </span>
                <span v-else class="text-sm text-gray-900 dark:text-white">
                  <span class="inline-flex items-center gap-2 text-sm" :class="getPriorityTextClass(task[fieldKey])">
                    <FlagIconSolid
                      v-if="task[fieldKey]"
                      class="h-4 w-4 shrink-0"
                      :style="getPriorityFlagStyle(task[fieldKey])"
                    />
                    {{ formatPriority(task[fieldKey]) }}
                  </span>
                </span>
              </EditableLabeledValue>

              <EditableLabeledValue
                v-else-if="fieldKey === 'estimatedHours' || fieldKey === 'actualHours'"
                class="pl-0"
                layout="row"
                :label="getFieldLabel(fieldKey)"
                :value="task[fieldKey]"
                type="number"
                :can-edit="canEditTask && getTaskFieldMetadata(fieldKey)?.editable !== false"
                :min="0"
                :step="0.5"
                @save="handleFieldSave(fieldKey, $event)"
                :format-value="(val) => val ? `${val}h` : null"
              >
                <span v-if="task[fieldKey]" class="text-sm text-gray-900 dark:text-white">{{ task[fieldKey] }}h</span>
              </EditableLabeledValue>

              <div
                v-else-if="fieldKey === 'tags'"
                class="flex items-center gap-3 py-2 pl-0 pr-4 min-h-[3rem]"
              >
                <span class="flex-shrink-0 text-gray-400 dark:text-gray-500" aria-hidden="true">
                  <TagIcon class="w-4 h-4" />
                </span>
                <span class="text-sm text-gray-700 dark:text-gray-300 flex-shrink-0 min-w-[12rem]">{{ getFieldLabel(fieldKey) }}</span>
                <button
                  v-if="canEditTask"
                  ref="tagFieldButtonRef"
                  type="button"
                  @click="openTagPopoverFromField($event)"
                  class="flex-1 min-w-0 min-h-8 flex items-center text-sm text-gray-900 dark:text-white rounded px-2 py-1 -mx-2 -my-1 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div v-if="task.tags && task.tags.length > 0" class="flex flex-wrap gap-1.5 text-left">
                    <span
                      v-for="(tag, index) in task.tags"
                      :key="`${tag}-${index}`"
                      :class="['inline-block text-xs px-2 py-0.5 rounded', getTagChipClass(tag)]"
                    >
                      {{ tag }}
                    </span>
                  </div>
                  <span v-else class="text-gray-400 dark:text-gray-500">Click to add tags</span>
                </button>
                <div v-else class="flex-1 min-w-0 min-h-8 text-sm text-gray-900 dark:text-white flex items-center">
                  <div v-if="task.tags && task.tags.length > 0" class="flex flex-wrap gap-1.5 text-left">
                    <span
                      v-for="(tag, index) in task.tags"
                      :key="`${tag}-${index}`"
                      :class="['inline-block text-xs px-2 py-0.5 rounded', getTagChipClass(tag)]"
                    >
                      {{ tag }}
                    </span>
                  </div>
                  <span v-else class="text-gray-400 dark:text-gray-500">Empty</span>
                </div>
              </div>

              <div
                v-else-if="fieldKey === 'relatedTo'"
                class="editable-labeled-value editable-labeled-value--row group/relatedTo flex items-center gap-3 py-2 pl-0 pr-4 min-h-[3rem]"
              >
                <span class="editable-labeled-value__icon flex-shrink-0 text-gray-400 dark:text-gray-500 w-4 flex items-center justify-center" aria-hidden="true">
                  <LinkIcon class="w-4 h-4 shrink-0" />
                </span>
                <span class="editable-labeled-value__label text-sm text-gray-700 dark:text-gray-300 flex-shrink-0 min-w-[12rem]">{{ getFieldLabel(fieldKey) }}</span>
                <template v-if="canEditTask">
                  <div class="editable-labeled-value__value flex-1 min-w-0 min-h-8 flex items-center text-left text-sm rounded px-2 py-1 -mx-2 -my-1 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                    <RouterLink
                      v-if="getRelatedToRecordPath(task)"
                      :to="getRelatedToRecordPath(task)"
                      @click.stop
                      class="text-gray-900 dark:text-white group-hover/relatedTo:text-indigo-600 dark:group-hover/relatedTo:text-indigo-400 truncate transition-colors cursor-pointer min-w-0"
                    >
                      {{ getRelatedToDisplay(task) }}
                    </RouterLink>
                    <button
                      v-else
                      type="button"
                      @click="openRelatedToPopover($event)"
                      class="text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                    >
                      —
                    </button>
                    <button
                      v-if="getRelatedToRecordPath(task)"
                      type="button"
                      @click="openRelatedToPopover($event)"
                      class="flex-1 min-w-0 min-h-6 cursor-pointer"
                      aria-label="Edit Related To"
                    />
                  </div>
                </template>
                <div
                  v-else
                  class="editable-labeled-value__value flex-1 min-w-0 min-h-8 flex items-center text-sm text-gray-900 dark:text-white"
                >
                  <span>{{ getRelatedToDisplay(task) || '—' }}</span>
                </div>
              </div>
            </template>
          </template>
        </RecordFieldsSection>

        <div v-if="shouldShowDetailsViewAll" class="mt-2">
          <button
            type="button"
            class="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            @click="showAllDetails = true"
          >
            View all ({{ detailFieldCount }})
          </button>
        </div>
      </div>

      <div v-if="task && customFields.length > 0 && (!expandedLeftSection || expandedLeftSection === 'custom-fields')" class="group/left-section">
        <CustomFieldsSection
          :fields="customFields"
          storage-key="task-record-custom-fields-state"
          :default-open="true"
        >
          <template #actions>
            <button
              v-if="!expandedLeftSection"
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 opacity-100 transition-opacity hover:text-gray-800 hover:bg-gray-50 lg:opacity-0 lg:group-hover/left-section:opacity-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800"
              aria-label="Expand custom fields"
              title="Expand"
              @click.stop="openLeftSection('custom-fields')"
            >
              <ArrowsPointingOutIcon class="h-4 w-4" />
            </button>
          </template>
        </CustomFieldsSection>
      </div>

      <section v-if="task && (!expandedLeftSection || expandedLeftSection === 'subtasks')" class="group/left-section py-3">
        <div class="flex items-center justify-between gap-3 pb-2">
          <h3 :class="['font-semibold text-gray-900 dark:text-white', expandedLeftSection ? 'text-2xl' : 'text-base']">
            Subtasks ({{ completedSubtasksCount }}/{{ totalSubtasksCount }})
          </h3>
          <div class="flex items-center gap-2">
            <button
              type="button"
              :class="[
                'inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold transition-all hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 focus:ring-offset-white dark:focus:ring-offset-gray-900',
                expandedLeftSection
                  ? 'opacity-100'
                  : 'opacity-100 lg:opacity-0 lg:pointer-events-none lg:group-hover/left-section:opacity-100 lg:group-hover/left-section:pointer-events-auto'
              ]"
              aria-label="Add subtask"
              title="Add subtask"
              @click="startCreateSubtask"
            >
              <PlusIcon class="h-3.5 w-3.5" />
              <span>Add subtask</span>
            </button>
            <button
              v-if="!expandedLeftSection"
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 opacity-100 transition-opacity hover:text-gray-800 hover:bg-gray-50 lg:opacity-0 lg:group-hover/left-section:opacity-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800"
              aria-label="Expand subtasks"
              title="Expand"
              @click.stop="openLeftSection('subtasks')"
            >
              <ArrowsPointingOutIcon class="h-4 w-4" />
            </button>
          </div>
        </div>

        <div v-if="totalSubtasksCount || isCreatingSubtask" class="overflow-hidden">
          <div class="flex items-center gap-3 border-b border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300">
            <span class="flex-1">Name</span>
          </div>

          <label
            v-for="subtask in visibleSubtasks"
            :key="subtask._id || subtask.title"
            class="group/subtask flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
          >
            <input
              type="checkbox"
              :checked="subtask.completed"
              @change="handleSubtaskToggle(subtask)"
              class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span
              :class="[
                'text-sm flex-1 min-w-0',
                subtask.completed
                  ? 'line-through text-gray-500 dark:text-gray-400'
                  : 'text-gray-900 dark:text-white'
              ]"
            >
              {{ subtask.title }}
            </span>
            <button
              v-if="canEditTask"
              type="button"
              class="inline-flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all lg:opacity-0 lg:pointer-events-none lg:group-hover/subtask:opacity-100 lg:group-hover/subtask:pointer-events-auto"
              :disabled="isDeletingSubtask && deletingSubtaskId === String(subtask._id || '')"
              @click.stop.prevent="handleDeleteSubtask(subtask)"
              aria-label="Delete subtask"
              title="Delete subtask"
            >
              <TrashIcon class="h-4 w-4" />
            </button>
          </label>

          <div v-if="shouldShowSubtasksViewAll" class="px-4 py-2">
            <button
              type="button"
              class="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              @click="showAllSubtasks = true"
            >
              View all ({{ totalSubtasksCount }})
            </button>
          </div>

          <div v-if="canLoadMoreSubtasks" class="px-4 py-2">
            <button
              type="button"
              class="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              @click="loadMoreSubtasks"
            >
              View more
            </button>
          </div>

          <div v-if="isCreatingSubtask" class="flex items-center gap-2 px-4 py-2.5 border-t border-gray-100 dark:border-gray-800">
            <span class="h-4 w-4 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 shrink-0" aria-hidden="true"></span>
            <input
              ref="newSubtaskInputRef"
              v-model="newSubtaskTitle"
              type="text"
              placeholder="Task Name"
              class="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              @keydown.enter.prevent="saveNewSubtask"
              @keydown.esc.prevent="cancelCreateSubtask"
            />
            <button
              type="button"
              class="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              @click="cancelCreateSubtask"
            >
              Cancel
            </button>
            <button
              type="button"
              :disabled="!newSubtaskTitle.trim() || isSavingNewSubtask"
              class="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="saveNewSubtask"
            >
              Save
            </button>
          </div>
        </div>

        <div v-else class="py-2 text-sm text-gray-500 dark:text-gray-400">
          No subtasks yet.
          <button
            type="button"
            class="ml-1 text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            @click="startCreateSubtask"
          >
            Add subtask
          </button>
        </div>
      </section>

      <section v-if="task && (!expandedLeftSection || expandedLeftSection === 'related')" class="group/left-section py-3">
        <div class="flex items-center justify-between gap-3 pb-2">
          <h3 :class="['font-semibold text-gray-900 dark:text-white', expandedLeftSection ? 'text-2xl' : 'text-base']">Related Records</h3>
          <div class="flex items-center gap-2">
            <button
              v-if="canLinkRecords"
              type="button"
              @click="openLinkRecordDrawer"
              :class="[
                'inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold transition-all hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 focus:ring-offset-white dark:focus:ring-offset-gray-900',
                expandedLeftSection
                  ? 'opacity-100'
                  : 'opacity-100 lg:opacity-0 lg:pointer-events-none lg:group-hover/left-section:opacity-100 lg:group-hover/left-section:pointer-events-auto'
              ]"
            >
              <PlusIcon class="h-3.5 w-3.5" />
              <span>Link record</span>
            </button>
            <button
              v-if="!expandedLeftSection"
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 opacity-100 transition-opacity hover:text-gray-800 hover:bg-gray-50 lg:opacity-0 lg:group-hover/left-section:opacity-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800"
              aria-label="Expand related records"
              title="Expand"
              @click.stop="openLeftSection('related')"
            >
              <ArrowsPointingOutIcon class="h-4 w-4" />
            </button>
          </div>
        </div>

        <div v-if="hasRelatedRecords" class="space-y-3">
          <details v-if="task.projectId" class="group/left-related-module" open>
            <summary class="flex cursor-pointer list-none items-center rounded-lg px-1 py-1 hover:bg-gray-50 dark:hover:bg-gray-800/60 [&::-webkit-details-marker]:hidden [&::marker]:content-['']">
              <div class="flex items-center gap-2">
                <ChevronRightIcon class="h-4 w-4 shrink-0 text-gray-400 transition-transform duration-150 group-open/left-related-module:rotate-90" />
                <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Project</h4>
                <span class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">1</span>
              </div>
            </summary>
            <div class="mt-2">
              <div class="group/left-related-card flex items-start justify-between gap-3 rounded-xl border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-800/60 px-3 py-2.5 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/20 transition-colors">
                <button
                  type="button"
                  @click="handleOpenRelated('project', getRelatedRecordId(typeof task.projectId === 'object' ? task.projectId : { _id: task.projectId }))"
                  class="min-w-0 flex-1 text-left"
                >
                  <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{{ getRelatedRecordTitle('project', typeof task.projectId === 'object' ? task.projectId : { _id: task.projectId }) }}</p>
                  <p v-if="getRelatedRecordMeta('project', typeof task.projectId === 'object' ? task.projectId : { _id: task.projectId })" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">{{ getRelatedRecordMeta('project', typeof task.projectId === 'object' ? task.projectId : { _id: task.projectId }) }}</p>
                </button>
              </div>
            </div>
          </details>

          <details v-if="taskEvents && taskEvents.length > 0" class="group/left-related-module" open>
            <summary class="flex cursor-pointer list-none items-center rounded-lg px-1 py-1 hover:bg-gray-50 dark:hover:bg-gray-800/60 [&::-webkit-details-marker]:hidden [&::marker]:content-['']">
              <div class="flex items-center gap-2">
                <ChevronRightIcon class="h-4 w-4 shrink-0 text-gray-400 transition-transform duration-150 group-open/left-related-module:rotate-90" />
                <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Events</h4>
                <span class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">{{ taskEvents.length }}</span>
              </div>
            </summary>
            <div class="mt-2 space-y-2">
              <button v-for="event in (taskEvents || []).slice(0, 5)" :key="event._id" type="button" @click="handleOpenRelated('event', event._id)" class="w-full text-left rounded-xl border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-800/60 px-3 py-2.5 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/20 transition-colors">
                <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{{ getRelatedRecordTitle('event', event) }}</p>
                <p v-if="getRelatedRecordMeta('event', event)" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">{{ getRelatedRecordMeta('event', event) }}</p>
              </button>
            </div>
          </details>

          <details v-if="taskDeals && taskDeals.length > 0" class="group/left-related-module" open>
            <summary class="flex cursor-pointer list-none items-center rounded-lg px-1 py-1 hover:bg-gray-50 dark:hover:bg-gray-800/60 [&::-webkit-details-marker]:hidden [&::marker]:content-['']">
              <div class="flex items-center gap-2">
                <ChevronRightIcon class="h-4 w-4 shrink-0 text-gray-400 transition-transform duration-150 group-open/left-related-module:rotate-90" />
                <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Deals</h4>
                <span class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">{{ taskDeals.length }}</span>
              </div>
            </summary>
            <div class="mt-2 space-y-2">
              <button v-for="deal in (taskDeals || []).slice(0, 5)" :key="deal._id" type="button" @click="handleOpenRelated('deal', deal._id)" class="w-full text-left rounded-xl border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-800/60 px-3 py-2.5 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/20 transition-colors">
                <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{{ getRelatedRecordTitle('deal', deal) }}</p>
                <p v-if="getRelatedRecordMeta('deal', deal)" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">{{ getRelatedRecordMeta('deal', deal) }}</p>
              </button>
            </div>
          </details>

          <details v-if="taskForms && taskForms.length > 0" class="group/left-related-module" open>
            <summary class="flex cursor-pointer list-none items-center rounded-lg px-1 py-1 hover:bg-gray-50 dark:hover:bg-gray-800/60 [&::-webkit-details-marker]:hidden [&::marker]:content-['']">
              <div class="flex items-center gap-2">
                <ChevronRightIcon class="h-4 w-4 shrink-0 text-gray-400 transition-transform duration-150 group-open/left-related-module:rotate-90" />
                <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Forms</h4>
                <span class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">{{ taskForms.length }}</span>
              </div>
            </summary>
            <div class="mt-2 space-y-2">
              <button v-for="form in (taskForms || []).slice(0, 5)" :key="form._id" type="button" @click="handleOpenRelated('form', form._id)" class="w-full text-left rounded-xl border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-800/60 px-3 py-2.5 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/20 transition-colors">
                <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{{ getRelatedRecordTitle('form', form) }}</p>
                <p v-if="getRelatedRecordMeta('form', form)" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">{{ getRelatedRecordMeta('form', form) }}</p>
              </button>
            </div>
          </details>
        </div>

        <div v-else class="py-2 text-sm text-gray-400 dark:text-gray-500">
          No related records yet.
          <button
            v-if="canLinkRecords"
            type="button"
            @click="openLinkRecordDrawer"
            class="ml-1 text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            Link record
          </button>
        </div>
      </section>
    </template>

    <template #right>
      <RecordRightPane
        v-if="task && !expandedLeftSection"
        :tabs="rightPaneTabs"
        :show-header="embed"
        :show-close-button="embed"
        :title="embed ? 'Task' : ''"
        :persistence-key="`task-${task._id}`"
        :record-id="task._id"
        @close="handleEmbedClose"
      >
        <!-- Activity Tab (Combined Comments + Timeline) -->
        <template #tab-activity>
          <div class="flex flex-col h-full min-h-0 overflow-hidden">
            <!-- Activity header - Fixed at top -->
            <div class="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-900">
              <h2 class="text-base font-semibold text-gray-900 dark:text-white">Activity</h2>
              <div class="flex items-center gap-2">
                <button
                  v-if="!activitySearchOpen"
                  type="button"
                  class="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="Search"
                  title="Search"
                  @click="() => { activitySearchOpen = true; nextTick(() => { if (activitySearchInputRef) activitySearchInputRef.focus(); }); }"
                >
                  <MagnifyingGlassIcon class="w-5 h-5" />
                </button>
                <button
                  v-else
                  type="button"
                  class="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="Close search"
                  title="Close"
                  @click="() => { activitySearchQuery = ''; activitySearchOpen = false; }"
                >
                  <XMarkIcon class="w-5 h-5" />
                </button>
                <button
                  type="button"
                  class="relative p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="Notifications"
                  title="Notifications"
                >
                  <BellIcon class="w-5 h-5" />
                  <span
                    v-if="task?.notificationCount > 0"
                    class="absolute top-0 right-0 flex items-center justify-center w-4 h-4 text-xs font-medium text-white bg-red-500 rounded-full"
                  >
                    {{ task.notificationCount > 9 ? '9+' : task.notificationCount }}
                  </span>
                </button>
                <Menu as="div" class="relative">
                  <MenuButton
                    type="button"
                    class="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    aria-label="Filter activities"
                    title="Filter activities"
                  >
                    <FunnelIcon class="w-5 h-5" />
                  </MenuButton>
                  <transition
                    enter-active-class="transition duration-100 ease-out"
                    enter-from-class="transform scale-95 opacity-0"
                    enter-to-class="transform scale-100 opacity-100"
                    leave-active-class="transition duration-75 ease-in"
                    leave-from-class="transform scale-100 opacity-100"
                    leave-to-class="transform scale-95 opacity-0"
                  >
                    <MenuItems
                      class="absolute right-0 mt-1 w-56 origin-top-right rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black/5 focus:outline-none z-20 py-1"
                    >
                      <div class="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                        <div class="flex items-center justify-between">
                          <span class="text-sm font-semibold text-gray-900 dark:text-white">Activities</span>
                          <button
                            v-if="activityFilterComments && activityFilterUpdates"
                            type="button"
                            class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                            @click="activityFilterComments = false; activityFilterUpdates = false"
                          >
                            Unselect all
                          </button>
                          <button
                            v-else
                            type="button"
                            class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                            @click="activityFilterComments = true; activityFilterUpdates = true"
                          >
                            Select all
                          </button>
                        </div>
                      </div>
                      <MenuItem v-slot="{ active }">
                        <button
                          type="button"
                          :class="[active ? 'bg-gray-50 dark:bg-gray-700/50' : '', 'flex w-full items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300']"
                          @click="activityFilterComments = !activityFilterComments"
                        >
                          <ChatBubbleLeftRightIcon class="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                          <span>Comments</span>
                          <CheckIcon v-if="activityFilterComments" class="w-5 h-5 text-indigo-600 dark:text-indigo-400 ml-auto flex-shrink-0" />
                        </button>
                      </MenuItem>
                      <MenuItem v-slot="{ active }">
                        <button
                          type="button"
                          :class="[active ? 'bg-gray-50 dark:bg-gray-700/50' : '', 'flex w-full items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300']"
                          @click="activityFilterUpdates = !activityFilterUpdates"
                        >
                          <ArrowPathIcon class="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                          <span>Updates</span>
                          <CheckIcon v-if="activityFilterUpdates" class="w-5 h-5 text-indigo-600 dark:text-indigo-400 ml-auto flex-shrink-0" />
                        </button>
                      </MenuItem>
                    </MenuItems>
                  </transition>
                </Menu>
              </div>
            </div>
            <!-- Search input (shown conditionally below header) -->
            <transition
              enter-active-class="transition duration-200 ease-out"
              enter-from-class="opacity-0 -translate-y-2"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition duration-150 ease-in"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 -translate-y-2"
            >
              <div v-if="activitySearchOpen" class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" @click.self="() => { if (!activitySearchQuery) activitySearchOpen = false; }">
                <div class="flex items-center gap-2 border-2 border-indigo-500 dark:border-indigo-400 rounded-lg px-3 py-2 bg-white dark:bg-gray-800">
                  <MagnifyingGlassIcon class="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <input
                    ref="activitySearchInputRef"
                    v-model="activitySearchQuery"
                    @keydown.esc="() => { activitySearchQuery = ''; activitySearchOpen = false; }"
                    @keydown.enter.prevent
                    placeholder="Search..."
                    class="flex-1 text-sm outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <button
                    v-if="activitySearchQuery"
                    type="button"
                    @click="activitySearchQuery = ''; nextTick(() => { if (activitySearchInputRef) activitySearchInputRef.focus(); })"
                    class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
                    aria-label="Clear search"
                    title="Clear"
                  >
                    <XMarkIcon class="w-5 h-5" />
                  </button>
                </div>
              </div>
            </transition>
            <div
              v-if="isThreadViewActive && activeThreadRootComment"
              class="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900"
            >
              <button
                type="button"
                class="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-600 transition-colors hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
                @click="closeCommentThread"
              >
                <ArrowLeftIcon class="h-4 w-4" />
                <span>Back</span>
              </button>
              <div class="ml-auto flex items-center gap-1.5 min-w-0 text-sm font-semibold text-gray-900 dark:text-white">
                <span class="font-medium text-gray-700 dark:text-gray-300">Thread by</span>
                <Avatar
                  v-if="activeThreadRootComment.author && typeof activeThreadRootComment.author === 'object'"
                  :user="activeThreadRootComment.author"
                  size="sm"
                />
                <div v-else class="h-6 w-6 rounded-full bg-gray-500 flex items-center justify-center text-white text-[10px] font-semibold">
                  {{ getInitials(activeThreadRootComment.author) }}
                </div>
                <span class="truncate">{{ getAuthorName(activeThreadRootComment.author) }}</span>
              </div>
            </div>
            <!-- Activity content – scroll lives only inside RecordActivityTimeline (feed between header and comment input) -->
            <div
              class="flex-1 min-h-0 flex flex-col transition-opacity duration-200 ease-out"
              :style="(activityPaneReady || (!activityFilterComments && !activityFilterUpdates)) ? undefined : { opacity: 0, visibility: 'hidden', pointerEvents: 'none' }"
            >
              <!-- Empty state when no activity filters are selected -->
              <div
                v-if="!isThreadViewActive && !activityFilterComments && !activityFilterUpdates"
                class="flex-1 min-h-0 flex flex-col items-center justify-center p-8 text-center"
              >
                <div class="relative w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <FunnelIcon class="w-8 h-8 text-gray-400 dark:text-gray-500" />
                  <span class="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span class="block w-[140%] h-0.5 bg-gray-400 dark:bg-gray-500 origin-center rotate-45" aria-hidden="true" />
                  </span>
                </div>
                <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-1">Nothing found</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">Please select at least one filter.</p>
                <button
                  type="button"
                  class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                  @click="activityFilterComments = true; activityFilterUpdates = true"
                >
                  Reset filters
                </button>
              </div>
              <RecordActivityTimeline
                v-else
                :key="isThreadViewActive ? `thread-${activeThreadRootCommentId}` : 'activity-main'"
                ref="activityTimelineRef"
                :events="activityTimelineEvents"
                :allow-comments="true"
                :allow-attachments="true"
                :allow-interactions="true"
                :expand-to-fill="true"
                :show-item-borders="false"
                item-padding-class="py-1.5"
                class="[&_ul]:py-1"
                @comment="handleAddComment"
              >
                <template #commentInput="{ submit }">
                  <CommentInput
                    v-model="newCommentText"
                    :show-submit="true"
                    variant="activity"
                    :placeholder="isThreadViewActive ? 'Reply to comment...' : 'Write a comment...'"
                    @submit="submit"
                  />
                </template>
                <template #event="{ event, index }">
                  <div
                    v-if="isThreadViewActive && index === 1 && threadReplyCount > 0"
                    class="mb-3 flex items-center gap-3"
                  >
                    <span class="text-sm text-gray-500 dark:text-gray-400">{{ threadReplyCount }} {{ threadReplyCount === 1 ? 'reply' : 'replies' }}</span>
                    <span class="h-px flex-1 bg-gray-200 dark:bg-gray-700"></span>
                  </div>
                  <!-- System events / Update logs -->
                  <div v-if="event.type === 'system'" class="flex items-start gap-2.5 py-0.5 text-[13px] text-gray-500 dark:text-slate-400 max-[480px]:flex-wrap max-[480px]:gap-x-2.5 max-[480px]:gap-y-1.5">
                    <span class="h-1.5 w-1.5 mt-[0.45rem] rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" aria-hidden="true"></span>
                    <div class="flex-1 min-w-0 space-y-1.5">
                      <p class="text-[12px] leading-[1.4] text-gray-500 dark:text-slate-400">
                        {{ getSystemEventMessage(event) }}
                        <a v-if="event.showMore" href="#" @click.prevent="handleShowMore(event)" class="ml-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                          Show more
                        </a>
                      </p>
                      <div
                        v-if="event.descriptionDiffHtml"
                        class="rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50 px-3 py-2 text-[12px] leading-[1.5] text-gray-700 dark:text-gray-300 [&_del]:bg-red-100 [&_del]:dark:bg-red-900/40 [&_del]:text-red-800 [&_del]:dark:text-red-200 [&_del]:line-through [&_ins]:bg-green-100 [&_ins]:dark:bg-green-900/40 [&_ins]:text-green-800 [&_ins]:dark:text-green-200 [&_ins]:no-underline"
                        v-html="event.descriptionDiffHtml"
                      />
                    </div>
                    <span v-if="event.createdAt" class="ml-auto pl-2 whitespace-nowrap text-[12px] text-gray-400 dark:text-slate-500 max-[480px]:ml-4 max-[480px]:pl-0 self-start">
                      {{ formatDate(event.createdAt) }}
                    </span>
                  </div>
                  
                  <!-- Comment events -->
                  <div v-else-if="event.type === 'comment'" class="w-full">
                    <div
                      :class="[
                        'group/comment overflow-hidden rounded-md border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900',
                        commentMentionsCurrentUser(event) ? 'border-l-2 border-l-indigo-500 dark:border-l-indigo-400' : ''
                      ]"
                    >
                      <div class="flex items-start justify-between gap-2 px-4 pt-3 pb-2">
                        <div class="flex items-center gap-3 min-w-0">
                          <Avatar
                            v-if="event.author && typeof event.author === 'object'"
                            :user="event.author"
                            size="sm"
                          />
                          <div v-else class="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs font-medium">
                            {{ getInitials(event.author) }}
                          </div>
                          <div class="min-w-0 flex items-baseline gap-2 flex-wrap">
                            <span class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {{ getAuthorName(event.author) }}
                            </span>
                            <span v-if="event.createdAt" class="text-xs text-gray-500 dark:text-gray-400">
                              {{ formatDate(event.createdAt) }}
                            </span>
                            <span v-if="event.editedAt" class="text-xs text-gray-400 dark:text-gray-500">(edited)</span>
                          </div>
                        </div>
                        <Menu
                          v-if="canEditComment(event)"
                          as="div"
                          class="relative ml-2 opacity-0 group-hover/comment:opacity-100 transition-opacity"
                        >
                          <MenuButton
                            class="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <EllipsisVerticalIcon class="w-4 h-4" />
                          </MenuButton>
                          <MenuItems
                            class="absolute right-0 mt-1 w-36 rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black/5 focus:outline-none z-10"
                          >
                            <MenuItem v-slot="{ active }">
                              <button
                                type="button"
                                :class="[active ? 'bg-gray-100 dark:bg-gray-700' : '', 'flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300']"
                                @click="startEditComment(event)"
                              >
                                <PencilSquareIcon class="w-4 h-4" />
                                Edit
                              </button>
                            </MenuItem>
                          </MenuItems>
                        </Menu>
                      </div>
                      <!-- Edit mode -->
                      <div v-if="editingCommentId === event.id" class="px-4 pb-3.5 text-sm leading-[1.55] text-gray-700 dark:text-gray-300 space-y-2">
                        <CommentInput
                          ref="editCommentInputRef"
                          v-model="editingCommentText"
                          v-model:existing-attachments="editingCommentAttachments"
                          :show-submit="true"
                          :submit-on-enter="true"
                          variant="activity"
                          placeholder="Edit comment..."
                          class="mb-2"
                          @files-change="handleEditCommentFilesChange"
                          @submit="saveEditComment"
                        >
                          <template #footerActions="{ canSubmit }">
                            <button
                              type="button"
                              class="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                              @click="cancelEditComment"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              :disabled="!canSubmit || !isEditingCommentDirty"
                              class="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              @click="handleSaveEditCommentClick"
                            >
                              Save
                            </button>
                          </template>
                        </CommentInput>
                      </div>
                      <!-- View mode -->
                      <div v-else class="px-4 pb-3.5 text-sm leading-[1.55] text-gray-700 dark:text-gray-300 [&_p]:m-0 [&_p]:leading-[1.55]">
                        <div
                          v-if="activitySearchQuery.trim()"
                          v-html="highlightSearchText(event.content || event.text)"
                          class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
                        ></div>
                        <CommentContent v-else :content="event.content || event.text" />
                        <!-- Attachments -->
                        <div v-if="event.attachments && event.attachments.length > 0" class="mt-3 grid gap-2.5">
                          <component
                            v-for="(attachment, idx) in event.attachments"
                            :key="idx"
                            :is="hasAttachmentUrl(attachment) ? 'a' : 'div'"
                            :href="hasAttachmentUrl(attachment) ? getAttachmentUrl(attachment) : undefined"
                            :target="hasAttachmentUrl(attachment) ? '_blank' : undefined"
                            :rel="hasAttachmentUrl(attachment) ? 'noopener noreferrer' : undefined"
                            :class="[
                              'group/attachment block overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 transition',
                              isImageAttachment(attachment) ? '' : 'p-2.5',
                              hasAttachmentUrl(attachment)
                                ? (
                                    isImageAttachment(attachment)
                                      ? 'cursor-pointer'
                                      : 'hover:-translate-y-px hover:border-indigo-300 hover:shadow-sm dark:hover:border-indigo-500'
                                  )
                                : 'cursor-default'
                            ]"
                          >
                            <div v-if="isImageAttachment(attachment) && hasAttachmentUrl(attachment)" class="relative max-h-[240px] overflow-hidden bg-slate-50 dark:bg-gray-800">
                              <button
                                type="button"
                                class="pointer-events-none absolute right-2 top-2 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300/90 bg-white/90 text-gray-600 opacity-0 shadow-sm transition-opacity duration-150 hover:bg-white group-hover/attachment:pointer-events-auto group-hover/attachment:opacity-100 dark:border-gray-600 dark:bg-gray-800/90 dark:text-gray-200 dark:hover:bg-gray-800"
                                :aria-label="`Download ${getAttachmentName(attachment)}`"
                                @click.prevent.stop="downloadAttachment(attachment)"
                              >
                                <ArrowDownTrayIcon class="h-5 w-5" />
                              </button>
                              <object
                                v-if="isSvgAttachment(attachment)"
                                :data="getAttachmentUrl(attachment)"
                                type="image/svg+xml"
                                class="block max-h-[240px] w-full object-contain"
                              />
                              <img
                                v-else
                                :src="getAttachmentUrl(attachment)"
                                :alt="getAttachmentName(attachment)"
                                class="block max-h-[240px] w-full object-contain"
                                loading="lazy"
                              />
                              <div class="flex items-center justify-between gap-2 border-t border-gray-100 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
                                <span class="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{{ getAttachmentName(attachment) }}</span>
                                <span v-if="attachment.size" class="text-xs text-gray-500 dark:text-gray-400">{{ formatFileSize(attachment.size) }}</span>
                              </div>
                            </div>
                            <div v-else class="flex items-center gap-2.5">
                              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                                <PaperClipIcon class="w-4 h-4" />
                              </div>
                              <div class="min-w-0 flex flex-col gap-0.5">
                                <span class="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{{ getAttachmentName(attachment) }}</span>
                                <span class="text-xs text-gray-500 dark:text-gray-400">{{ getAttachmentLabel(attachment) }}</span>
                              </div>
                            </div>
                          </component>
                        </div>
                      </div>
                      <div v-if="editingCommentId !== event.id" class="flex items-center gap-2 border-t border-gray-200 px-4 py-2 dark:border-gray-700">
                        <div class="flex flex-wrap items-center gap-1.5">
                          <template v-if="hasCommentReactions(event)">
                            <button
                              v-for="reaction in getCommentReactions(event)"
                              :key="`${event.id || event.createdAt}-${reaction.emoji}`"
                              type="button"
                              :class="[
                                'inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[1rem] leading-none transition-colors',
                                isCommentReactionSelected(event, reaction.emoji)
                                  ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-200'
                                  : 'border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-900/20'
                              ]"
                              :aria-label="`${reaction.emoji} ${reaction.count} reactions`"
                              @click="toggleCommentReaction(event, reaction.emoji)"
                              @mouseenter="handleShowCommentReactionTooltip($event, reaction)"
                              @mouseleave="handleHideCommentReactionTooltip"
                            >
                              <span aria-hidden="true">{{ reaction.emoji }}</span>
                              <span class="text-xs font-normal leading-none">{{ reaction.count }}</span>
                            </button>
                            <button
                              v-if="!isCommentReactionSelected(event, '👍')"
                              type="button"
                              class="inline-flex h-[1.875rem] w-[1.875rem] items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                              aria-label="Like comment"
                              @click="toggleCommentReaction(event, '👍')"
                            >
                              <HandThumbUpIcon class="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              class="inline-flex h-[1.875rem] w-[1.875rem] items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                              aria-label="React to comment"
                              :ref="(el) => setCommentReactionButtonRef(event, el)"
                              @click="toggleCommentReactionPicker(event)"
                            >
                              <FaceSmileIcon class="w-4 h-4" />
                            </button>
                          </template>
                          <template v-else>
                            <button
                              type="button"
                              class="inline-flex h-[1.875rem] w-[1.875rem] items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                              aria-label="Like comment"
                              @click="toggleCommentReaction(event, '👍')"
                            >
                              <HandThumbUpIcon class="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              class="inline-flex h-[1.875rem] w-[1.875rem] items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                              aria-label="React to comment"
                              :ref="(el) => setCommentReactionButtonRef(event, el)"
                              @click="toggleCommentReactionPicker(event)"
                            >
                              <FaceSmileIcon class="w-4 h-4" />
                            </button>
                          </template>
                        </div>
                        <button
                          v-if="!isThreadViewActive"
                          type="button"
                          class="ml-auto inline-flex items-center gap-2 text-[13px] font-normal text-gray-400 transition-colors hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                          @click="openCommentThread(event)"
                        >
                          <span>
                            {{ getCommentThreadReplyCount(event) > 0
                              ? `${getCommentThreadReplyCount(event)} ${getCommentThreadReplyCount(event) === 1 ? 'reply' : 'replies'}`
                              : 'Reply' }}
                          </span>
                          <template v-if="getCommentThreadReplyCount(event) > 0 && getCommentThreadLatestReplyAuthor(event)">
                            <Avatar
                              v-if="typeof getCommentThreadLatestReplyAuthor(event) === 'object'"
                              :user="getCommentThreadLatestReplyAuthor(event)"
                              size="sm"
                            />
                            <div v-else class="h-6 w-6 rounded-full bg-gray-500 flex items-center justify-center text-white text-[10px] font-semibold">
                              {{ getInitials(getCommentThreadLatestReplyAuthor(event)) }}
                            </div>
                          </template>
                        </button>
                      </div>
                    </div>
                  </div>
                </template>
              </RecordActivityTimeline>
            </div>
          </div>
        </template>
        <template #tab-related>
          <div class="flex flex-col h-full">
            <!-- Related Records header with Link action -->
            <div class="record-context-panel__header flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-900">
              <h2 class="text-base font-semibold text-gray-900 dark:text-white">Related</h2>
              <button
                v-if="canLinkRecords"
                type="button"
                @click="openLinkRecordDrawer"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
              >
                <PlusIcon class="w-4 h-4" />
                Link record
              </button>
            </div>
            <!-- Related Records content -->
            <div class="flex-1 min-h-0 overflow-y-auto p-4">
              <!-- Empty state when no related records -->
              <div
                v-if="!hasRelatedRecords"
                class="flex flex-col items-center justify-center py-12 text-center"
              >
                <div class="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <LinkIcon class="w-6 h-6 text-gray-400 dark:text-gray-500" />
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">No related records yet.</p>
                <p class="text-xs text-gray-400 dark:text-gray-500">
                  Link this task to projects, deals, events, or forms.
                </p>
              </div>
              <!-- Related records list (flat groups, no nested accordion) -->
              <div v-else class="space-y-5">
                <details
                  v-if="task.projectId"
                  class="group/right-related-module"
                  :open="rightRelatedModuleOpen.project"
                  @toggle="(event) => handleRightRelatedModuleToggle('project', event)"
                >
                  <summary class="flex cursor-pointer list-none items-center rounded-lg px-1 py-1 hover:bg-gray-50 dark:hover:bg-gray-800/60 [&::-webkit-details-marker]:hidden [&::marker]:content-['']">
                    <div class="flex items-center gap-2">
                      <ChevronRightIcon :class="['h-4 w-4 shrink-0 text-gray-400 transition-transform duration-150', rightRelatedModuleOpen.project ? 'rotate-90' : '']" />
                      <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Project</h3>
                      <span class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">1</span>
                    </div>
                  </summary>
                  <div class="mt-2 space-y-2">
                    <div
                      class="group/right-related-card flex items-start justify-between gap-3 rounded-xl border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-800/60 px-3 py-2.5 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/20 transition-colors"
                    >
                      <button
                        type="button"
                        @click="handleOpenRelated('project', getRelatedRecordId(typeof task.projectId === 'object' ? task.projectId : { _id: task.projectId }))"
                        class="min-w-0 flex-1 text-left"
                      >
                        <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {{ getRelatedRecordTitle('project', typeof task.projectId === 'object' ? task.projectId : { _id: task.projectId }) }}
                        </p>
                        <p
                          v-if="getRelatedRecordMeta('project', typeof task.projectId === 'object' ? task.projectId : { _id: task.projectId })"
                          class="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate"
                        >
                          {{ getRelatedRecordMeta('project', typeof task.projectId === 'object' ? task.projectId : { _id: task.projectId }) }}
                        </p>
                      </button>
                      <div class="flex items-center gap-1.5 shrink-0">
                        <Menu v-if="canLinkRecords" as="div" class="relative">
                          <MenuButton
                            class="inline-flex items-center justify-center rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200 opacity-0 transition-opacity duration-150 group-hover/right-related-card:opacity-100 focus:opacity-100"
                            aria-label="Related record actions"
                            @click.stop
                          >
                            <EllipsisVerticalIcon class="h-4 w-4" />
                          </MenuButton>
                          <transition
                            enter-active-class="transition ease-out duration-100"
                            enter-from-class="transform opacity-0 scale-95"
                            enter-to-class="transform opacity-100 scale-100"
                            leave-active-class="transition ease-in duration-75"
                            leave-from-class="transform opacity-100 scale-100"
                            leave-to-class="transform opacity-0 scale-95"
                          >
                            <MenuItems
                              class="absolute right-0 top-full z-20 mt-1 w-32 rounded-lg bg-white py-1 shadow-xl ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10"
                            >
                              <MenuItem v-slot="{ active }">
                                <button
                                  type="button"
                                  @click.stop="handleUnlinkRelated('project', typeof task.projectId === 'object' ? task.projectId : { _id: task.projectId })"
                                  :class="[
                                    'w-full px-3 py-2 text-left text-sm transition-colors duration-150',
                                    active ? 'bg-gray-100 dark:bg-gray-700 text-red-600 dark:text-red-400' : 'text-red-600 dark:text-red-400'
                                  ]"
                                >
                                  Unlink
                                </button>
                              </MenuItem>
                            </MenuItems>
                          </transition>
                        </Menu>
                      </div>
                    </div>
                  </div>
                </details>

                <details
                  v-if="taskEvents && taskEvents.length > 0"
                  class="group/right-related-module"
                  :open="rightRelatedModuleOpen.events"
                  @toggle="(event) => handleRightRelatedModuleToggle('events', event)"
                >
                  <summary class="flex cursor-pointer list-none items-center rounded-lg px-1 py-1 hover:bg-gray-50 dark:hover:bg-gray-800/60 [&::-webkit-details-marker]:hidden [&::marker]:content-['']">
                    <div class="flex items-center gap-2">
                      <ChevronRightIcon :class="['h-4 w-4 shrink-0 text-gray-400 transition-transform duration-150', rightRelatedModuleOpen.events ? 'rotate-90' : '']" />
                      <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Events</h3>
                      <span class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">{{ taskEvents.length }}</span>
                    </div>
                  </summary>
                  <div class="mt-2 space-y-2">
                    <div
                      v-for="event in (taskEvents || []).slice(0, 10)"
                      :key="event._id"
                      class="group/right-related-card flex items-start justify-between gap-3 rounded-xl border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-800/60 px-3 py-2.5 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/20 transition-colors"
                    >
                      <button
                        type="button"
                        @click="handleOpenRelated('event', event._id)"
                        class="min-w-0 flex-1 text-left"
                      >
                        <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {{ getRelatedRecordTitle('event', event) }}
                        </p>
                        <p v-if="getRelatedRecordMeta('event', event)" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                          {{ getRelatedRecordMeta('event', event) }}
                        </p>
                      </button>
                      <div class="flex items-center gap-1.5 shrink-0">
                        <Menu v-if="canLinkRecords" as="div" class="relative">
                          <MenuButton
                            class="inline-flex items-center justify-center rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200 opacity-0 transition-opacity duration-150 group-hover/right-related-card:opacity-100 focus:opacity-100"
                            aria-label="Related record actions"
                            @click.stop
                          >
                            <EllipsisVerticalIcon class="h-4 w-4" />
                          </MenuButton>
                          <transition
                            enter-active-class="transition ease-out duration-100"
                            enter-from-class="transform opacity-0 scale-95"
                            enter-to-class="transform opacity-100 scale-100"
                            leave-active-class="transition ease-in duration-75"
                            leave-from-class="transform opacity-100 scale-100"
                            leave-to-class="transform opacity-0 scale-95"
                          >
                            <MenuItems
                              class="absolute right-0 top-full z-20 mt-1 w-32 rounded-lg bg-white py-1 shadow-xl ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10"
                            >
                              <MenuItem v-slot="{ active }">
                                <button
                                  type="button"
                                  @click.stop="handleUnlinkRelated('event', event)"
                                  :class="[
                                    'w-full px-3 py-2 text-left text-sm transition-colors duration-150',
                                    active ? 'bg-gray-100 dark:bg-gray-700 text-red-600 dark:text-red-400' : 'text-red-600 dark:text-red-400'
                                  ]"
                                >
                                  Unlink
                                </button>
                              </MenuItem>
                            </MenuItems>
                          </transition>
                        </Menu>
                      </div>
                    </div>
                  </div>
                </details>

                <details
                  v-if="taskDeals && taskDeals.length > 0"
                  class="group/right-related-module"
                  :open="rightRelatedModuleOpen.deals"
                  @toggle="(event) => handleRightRelatedModuleToggle('deals', event)"
                >
                  <summary class="flex cursor-pointer list-none items-center rounded-lg px-1 py-1 hover:bg-gray-50 dark:hover:bg-gray-800/60 [&::-webkit-details-marker]:hidden [&::marker]:content-['']">
                    <div class="flex items-center gap-2">
                      <ChevronRightIcon :class="['h-4 w-4 shrink-0 text-gray-400 transition-transform duration-150', rightRelatedModuleOpen.deals ? 'rotate-90' : '']" />
                      <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Deals</h3>
                      <span class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">{{ taskDeals.length }}</span>
                    </div>
                  </summary>
                  <div class="mt-2 space-y-2">
                    <div
                      v-for="deal in (taskDeals || []).slice(0, 10)"
                      :key="deal._id"
                      class="group/right-related-card flex items-start justify-between gap-3 rounded-xl border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-800/60 px-3 py-2.5 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/20 transition-colors"
                    >
                      <button
                        type="button"
                        @click="handleOpenRelated('deal', deal._id)"
                        class="min-w-0 flex-1 text-left"
                      >
                        <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {{ getRelatedRecordTitle('deal', deal) }}
                        </p>
                        <p v-if="getRelatedRecordMeta('deal', deal)" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                          {{ getRelatedRecordMeta('deal', deal) }}
                        </p>
                      </button>
                      <div class="flex items-center gap-1.5 shrink-0">
                        <Menu v-if="canLinkRecords" as="div" class="relative">
                          <MenuButton
                            class="inline-flex items-center justify-center rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200 opacity-0 transition-opacity duration-150 group-hover/right-related-card:opacity-100 focus:opacity-100"
                            aria-label="Related record actions"
                            @click.stop
                          >
                            <EllipsisVerticalIcon class="h-4 w-4" />
                          </MenuButton>
                          <transition
                            enter-active-class="transition ease-out duration-100"
                            enter-from-class="transform opacity-0 scale-95"
                            enter-to-class="transform opacity-100 scale-100"
                            leave-active-class="transition ease-in duration-75"
                            leave-from-class="transform opacity-100 scale-100"
                            leave-to-class="transform opacity-0 scale-95"
                          >
                            <MenuItems
                              class="absolute right-0 top-full z-20 mt-1 w-32 rounded-lg bg-white py-1 shadow-xl ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10"
                            >
                              <MenuItem v-slot="{ active }">
                                <button
                                  type="button"
                                  @click.stop="handleUnlinkRelated('deal', deal)"
                                  :class="[
                                    'w-full px-3 py-2 text-left text-sm transition-colors duration-150',
                                    active ? 'bg-gray-100 dark:bg-gray-700 text-red-600 dark:text-red-400' : 'text-red-600 dark:text-red-400'
                                  ]"
                                >
                                  Unlink
                                </button>
                              </MenuItem>
                            </MenuItems>
                          </transition>
                        </Menu>
                      </div>
                    </div>
                  </div>
                </details>

                <details
                  v-if="taskForms && taskForms.length > 0"
                  class="group/right-related-module"
                  :open="rightRelatedModuleOpen.forms"
                  @toggle="(event) => handleRightRelatedModuleToggle('forms', event)"
                >
                  <summary class="flex cursor-pointer list-none items-center rounded-lg px-1 py-1 hover:bg-gray-50 dark:hover:bg-gray-800/60 [&::-webkit-details-marker]:hidden [&::marker]:content-['']">
                    <div class="flex items-center gap-2">
                      <ChevronRightIcon :class="['h-4 w-4 shrink-0 text-gray-400 transition-transform duration-150', rightRelatedModuleOpen.forms ? 'rotate-90' : '']" />
                      <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Forms</h3>
                      <span class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">{{ taskForms.length }}</span>
                    </div>
                  </summary>
                  <div class="mt-2 space-y-2">
                    <div
                      v-for="form in (taskForms || []).slice(0, 10)"
                      :key="form._id"
                      class="group/right-related-card flex items-start justify-between gap-3 rounded-xl border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-800/60 px-3 py-2.5 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/20 transition-colors"
                    >
                      <button
                        type="button"
                        @click="handleOpenRelated('form', form._id)"
                        class="min-w-0 flex-1 text-left"
                      >
                        <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {{ getRelatedRecordTitle('form', form) }}
                        </p>
                        <p v-if="getRelatedRecordMeta('form', form)" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                          {{ getRelatedRecordMeta('form', form) }}
                        </p>
                      </button>
                      <div class="flex items-center gap-1.5 shrink-0">
                        <Menu v-if="canLinkRecords" as="div" class="relative">
                          <MenuButton
                            class="inline-flex items-center justify-center rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200 opacity-0 transition-opacity duration-150 group-hover/right-related-card:opacity-100 focus:opacity-100"
                            aria-label="Related record actions"
                            @click.stop
                          >
                            <EllipsisVerticalIcon class="h-4 w-4" />
                          </MenuButton>
                          <transition
                            enter-active-class="transition ease-out duration-100"
                            enter-from-class="transform opacity-0 scale-95"
                            enter-to-class="transform opacity-100 scale-100"
                            leave-active-class="transition ease-in duration-75"
                            leave-from-class="transform opacity-100 scale-100"
                            leave-to-class="transform opacity-0 scale-95"
                          >
                            <MenuItems
                              class="absolute right-0 top-full z-20 mt-1 w-32 rounded-lg bg-white py-1 shadow-xl ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10"
                            >
                              <MenuItem v-slot="{ active }">
                                <button
                                  type="button"
                                  @click.stop="handleUnlinkRelated('form', form)"
                                  :class="[
                                    'w-full px-3 py-2 text-left text-sm transition-colors duration-150',
                                    active ? 'bg-gray-100 dark:bg-gray-700 text-red-600 dark:text-red-400' : 'text-red-600 dark:text-red-400'
                                  ]"
                                >
                                  Unlink
                                </button>
                              </MenuItem>
                            </MenuItems>
                          </transition>
                        </Menu>
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </template>
        <template #tab-integrations>
          <div class="flex flex-col h-full">
            <!-- Integrations header -->
            <div class="record-context-panel__header flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-900">
              <h2 class="text-base font-semibold text-gray-900 dark:text-white">Integrations</h2>
            </div>
            <!-- Integrations content -->
            <div class="flex-1 min-h-0 overflow-y-auto p-4">
              <div class="text-sm text-gray-600 dark:text-gray-400 italic">No integrations configured.</div>
            </div>
          </div>
        </template>
      </RecordRightPane>
    </template>
  </RecordPageLayout>
  <Teleport to="body">
    <div
      v-if="showCommentReactionPicker"
      ref="commentReactionPickerRef"
      class="fixed z-[110] rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg dark:border-gray-700 dark:bg-gray-800"
      :style="commentReactionPickerStyle"
    >
      <div class="flex items-center gap-1">
        <button
          v-for="emoji in commentReactionEmojiOptions"
          :key="emoji"
          type="button"
          class="inline-flex h-8 w-8 items-center justify-center rounded-md text-[20px] leading-none transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
          @mousedown.prevent="addCommentReactionFromPicker(emoji)"
        >
          <span aria-hidden="true">{{ emoji }}</span>
        </button>
      </div>
    </div>
  </Teleport>
  <Teleport to="body">
    <div
      v-if="showCommentReactionTooltip && commentReactionTooltipData"
      ref="commentReactionTooltipRef"
      :class="[
        'fixed z-[115] rounded-lg bg-slate-950 px-3 py-2 text-white shadow-2xl',
        getReactionTooltipMode(commentReactionTooltipData) === 'single' ? 'w-[10rem]' : 'w-[17rem]'
      ]"
      :style="commentReactionTooltipStyle"
      @mouseenter="cancelCommentReactionTooltipHide"
      @mouseleave="handleHideCommentReactionTooltip"
    >
      <template v-if="getReactionTooltipMode(commentReactionTooltipData) === 'single'">
        <p class="text-center text-3xl leading-none">{{ commentReactionTooltipData.emoji }}</p>
        <p class="mt-2 text-center text-xs leading-4 text-slate-200">
          {{ getReactionTooltipSingleText(commentReactionTooltipData) }}
        </p>
      </template>
      <template v-else-if="getReactionTooltipMode(commentReactionTooltipData) === 'few'">
        <p class="text-center text-3xl leading-none">{{ commentReactionTooltipData.emoji }}</p>
        <p class="mt-2 text-xs leading-4 text-slate-200">
          {{ getReactionTooltipInlineText(commentReactionTooltipData) }}
        </p>
      </template>
      <template v-else>
        <p class="text-xs font-semibold leading-4">
          {{ commentReactionTooltipData.emoji }} {{ commentReactionTooltipData.count }}
          {{ commentReactionTooltipData.count === 1 ? 'person reacted' : 'people reacted' }}
        </p>
        <ul
          v-if="commentReactionTooltipData.reactors.length > 0"
          class="mt-2 max-h-44 space-y-1 overflow-y-auto pr-1"
        >
          <li
            v-for="reactor in commentReactionTooltipData.reactors.slice(0, 12)"
            :key="`${commentReactionTooltipData.emoji}-${reactor.id || reactor.name}`"
            class="flex items-center gap-2 text-xs text-slate-200"
          >
            <span class="inline-flex h-5 w-5 items-center justify-center rounded bg-slate-800 text-[10px] font-medium uppercase text-slate-100">
              {{ getReactionUserInitial(reactor) }}
            </span>
            <span class="truncate">{{ getReactionUserDisplayName(reactor) }}</span>
          </li>
        </ul>
        <p v-else class="mt-1.5 text-xs leading-4 text-slate-300">Reactor details unavailable</p>
      </template>
      <span
        :class="[
          'pointer-events-none absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-950',
          commentReactionTooltipPlacement === 'above' ? 'top-full -mt-1' : 'bottom-full -mb-1'
        ]"
      ></span>
    </div>
  </Teleport>
  
  <!-- Link Record Drawer (right side, same pattern as Link Organization) -->
  <LinkRecordsDrawer
    :isOpen="showLinkRecordDrawer"
    :module-key="''"
    :record-types="linkRecordDrawerTypes"
    :multiple="true"
    title="Link Record"
    :context="linkRecordDrawerContext"
    :preselected-ids="linkedRecordIds"
    @close="showLinkRecordDrawer = false"
    @linked="handleLinkRecordDrawerLinked"
  />

  <Teleport to="body">
    <div
      v-if="showTagPopover"
      ref="tagPopoverRef"
      :style="tagPopoverStyle"
      class="fixed z-[120] w-[360px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl"
    >
      <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Tags</h3>
          <button
            v-if="hasInstanceTags"
            type="button"
            class="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            @click="openCreateTagEditor()"
          >
            New Tag
          </button>
        </div>

        <div class="mt-2">
          <input
            ref="tagSearchInputRef"
            v-model="tagSearchQuery"
            type="text"
            placeholder="Search or create a tag"
            class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            @focus="tagListOpen = true"
            @click="tagListOpen = true"
            @blur="handleTagSearchBlur"
          />
        </div>

        <div v-if="task?.tags?.length" class="mt-2 flex flex-wrap gap-1.5">
          <span
            v-for="tagName in task.tags"
            :key="`selected-${tagName}`"
            :class="['inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs', getTagChipClass(tagName)]"
          >
            <span class="truncate max-w-[180px]">{{ tagName }}</span>
            <button
              type="button"
              class="text-current/80 hover:text-current"
              @click="removeTagFromRecord(tagName)"
            >
              <XMarkIcon class="w-3.5 h-3.5" />
            </button>
          </span>
        </div>
      </div>

      <div class="max-h-72 overflow-y-auto px-2 py-2">
        <div v-if="!tagListOpen && !isTagEditorOpen" class="px-2 py-3 text-sm text-gray-500 dark:text-gray-400">
          Click the search box to view available tags.
        </div>

        <div v-else-if="!hasInstanceTags && !isTagEditorOpen" class="px-2 py-3 text-sm text-gray-500 dark:text-gray-400">
          <p>No tags created yet in this instance.</p>
          <button
            type="button"
            class="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            @click="openCreateTagEditor(tagSearchQuery)"
          >
            Create first tag
          </button>
        </div>

        <template v-else-if="!isTagEditorOpen">
          <button
            v-if="canCreateTagFromSearch"
            type="button"
            class="w-full rounded-lg px-3 py-2 text-left text-sm text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
            @click="openCreateTagEditor(tagSearchQuery)"
          >
            Create "{{ normalizedTagSearch }}"
          </button>

          <button
            v-for="tagDef in filteredInstanceTags"
            :key="tagDef.name"
            type="button"
            class="group w-full rounded-lg px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="toggleTagForRecord(tagDef.name)"
          >
            <div class="flex items-center gap-2">
              <span :class="['h-2.5 w-2.5 rounded-full', getTagDotClass(tagDef.name)]"></span>
              <span class="flex-1 truncate text-sm text-gray-900 dark:text-white">{{ tagDef.name }}</span>
              <span
                v-if="tagDef.isPublic"
                class="rounded px-1.5 py-0.5 text-[10px] font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
              >
                Public
              </span>
              <CheckIcon
                v-if="isTagAssigned(tagDef.name)"
                class="w-4 h-4 text-indigo-600 dark:text-indigo-400"
              />
              <button
                type="button"
                class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                @click.stop="openEditTagEditor(tagDef)"
                aria-label="Edit tag"
              >
                <PencilSquareIcon class="w-4 h-4" />
              </button>
            </div>
          </button>
        </template>

        <template v-else>
          <div class="px-2 py-2 space-y-3">
            <div>
              <label class="text-xs text-gray-500 dark:text-gray-400">Tag Name</label>
              <input
                v-model="tagEditor.name"
                type="text"
                maxlength="50"
                class="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter tag name"
              />
            </div>

            <div>
              <label class="text-xs text-gray-500 dark:text-gray-400">Color</label>
              <div class="mt-1 flex items-center gap-2">
                <button
                  v-for="option in TAG_COLOR_OPTIONS"
                  :key="option.key"
                  type="button"
                  :class="[
                    'h-6 w-6 rounded-full border-2 transition-colors',
                    option.swatchClass,
                    tagEditor.color === option.key ? 'border-gray-900 dark:border-white' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-500'
                  ]"
                  @click="tagEditor.color = option.key"
                ></button>
              </div>
            </div>

            <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                v-model="tagEditor.isPublic"
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Make tag public
            </label>

            <div class="flex items-center justify-between gap-2 pt-1">
              <button
                v-if="tagEditorMode === 'edit'"
                type="button"
                class="text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
                @click="deleteEditingTag"
              >
                Delete tag
              </button>
              <div class="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  class="rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  @click="closeTagEditor"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="!canSaveTagEditor || isSavingTagState"
                  @click="saveTagEditor"
                >
                  {{ tagEditorMode === 'create' ? 'Create' : 'Save' }}
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </Teleport>

  <!-- Related To field popover (details section inline edit) -->
  <Teleport to="body">
    <div
      v-if="showRelatedToPopover"
      ref="relatedToPopoverRef"
      :style="relatedToPopoverStyle"
      class="fixed z-[120] w-[min(440px,calc(100vw-24px))] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl"
    >
      <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Related To</h3>
        <button
          type="button"
          class="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Close"
          @click="closeRelatedToPopover"
        >
          <XMarkIcon class="w-5 h-5" />
        </button>
      </div>
      <div class="p-4">
        <TaskRelatedToField
          :model-value="relatedToPopoverValue"
          label=""
          :required="false"
          :error="relatedToPopoverError"
          @update:model-value="relatedToPopoverValue = $event"
        />
        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-md px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
            @click="closeRelatedToPopover"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="relatedToSaving || !hasRelatedToPopoverChanges"
            @click="saveRelatedToFromPopover"
          >
            {{ relatedToSaving ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Edit task drawer (Quick Edit / Full Edit progressive disclosure) -->
  <TaskEditDrawer
    v-if="task"
    :isOpen="showEditDrawer"
    :record="task"
    @close="showEditDrawer = false"
    @saved="handleTaskEditSaved"
  />

  <!-- Delete Confirmation Modal -->
  <DeleteConfirmationModal
    :show="showDeleteModal"
    :record-name="task?.title || ''"
    record-type="tasks"
    :deleting="deleting"
    @close="showDeleteModal = false"
    @confirm="confirmDeleteTask"
  />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Menu, MenuButton, MenuItem, MenuItems, Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/vue';
import {
  RecordPageLayout,
  RecordHeader,
  RecordStateSection,
  RecordFieldsSection,
  CustomFieldsSection,
  RecordActivityTimeline,
  RecordRightPane,
  EditableLabeledValue
} from '@/components/record-page';
import CommentInput from '@/components/record-page/CommentInput.vue';
import CommentContent from '@/components/record-page/CommentContent.vue';
import EditableTitle from '@/components/record-page/EditableTitle.vue';
import TaskDescriptionEditor from '@/components/record-page/TaskDescriptionEditor.vue';
import LinkRecordsDrawer from '@/components/common/LinkRecordsDrawer.vue';
import TaskEditDrawer from '@/components/tasks/TaskEditDrawer.vue';
import TaskRelatedToField from '@/components/tasks/TaskRelatedToField.vue';
import DeleteConfirmationModal from '@/components/common/DeleteConfirmationModal.vue';
import DOMPurify from 'dompurify';
import {
  ChatBubbleLeftRightIcon,
  ClockIcon,
  LinkIcon,
  PuzzlePieceIcon,
  StarIcon,
  CheckIcon,
  XMarkIcon,
  EllipsisVerticalIcon,
  CalendarIcon,
  UserIcon,
  FlagIcon,
  CheckCircleIcon,
  PaperClipIcon,
  MagnifyingGlassIcon,
  BellIcon,
  FunnelIcon,
  TagIcon,
  PencilSquareIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
  PlusIcon,
  TrashIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  HandThumbUpIcon,
  FaceSmileIcon
} from '@heroicons/vue/24/outline';
import {
  StarIcon as StarIconSolid,
  FlagIcon as FlagIconSolid
} from '@heroicons/vue/24/solid';
import Avatar from '@/components/common/Avatar.vue';
import DateCell from '@/components/common/table/DateCell.vue';
import { getKeyFields } from '@/utils/fieldDisplay';
import apiClient from '@/utils/apiClient';
import { openDatePicker } from '@/utils/dateUtils';
import { useAuthStore } from '@/stores/auth';
import { 
  TASK_FIELD_METADATA, 
  getCoreTaskFields,
  getTaskFieldMetadata
} from '@/platform/fields/taskFieldModel';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const props = defineProps({
  /** When true, renders in embed mode for QuickPreviewDrawer (mobile layout, no header, close button) */
  embed: { type: Boolean, default: false },
  /** Task ID when embed - used instead of route.params.id */
  taskId: { type: String, default: null }
});

const emit = defineEmits(['close']);

const effectiveTaskId = computed(() => props.embed && props.taskId ? props.taskId : route.params.id);

const handleEmbedClose = () => {
  if (props.embed) emit('close');
};

const task = ref(null);
const loading = ref(false);
const error = ref(null);
const isFollowing = ref(false);
const showDeleteModal = ref(false);
const deleting = ref(false);
const showEditDrawer = ref(false);
const taskEvents = ref([]);
const taskDeals = ref([]);
const taskForms = ref([]);
const DEFAULT_TASK_STATUS_OPTIONS = Object.freeze([
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
]);
const DEFAULT_TASK_PRIORITY_OPTIONS = Object.freeze([
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
]);
const DEFAULT_TASK_STATUS_COLOR_MAP = Object.freeze({
  todo: '#6B7280',
  in_progress: '#2563EB',
  waiting: '#D97706',
  completed: '#16A34A',
  cancelled: '#DC2626'
});
const DEFAULT_TASK_PRIORITY_COLOR_MAP = Object.freeze({
  low: '#6B7280',
  medium: '#2563EB',
  high: '#D97706',
  urgent: '#DC2626'
});
const taskStatusFieldOptions = ref([]);
const taskPriorityFieldOptions = ref([]);
const taskModuleDefinition = ref(null);
const RIGHT_RELATED_DEFAULT_OPEN_STATE = Object.freeze({
  project: true,
  events: true,
  deals: true,
  forms: true
});
const rightRelatedModuleOpen = ref({
  ...RIGHT_RELATED_DEFAULT_OPEN_STATE
});
const activityEvents = ref([]);
const customFields = ref([]);
const users = ref([]);
const activityTimelineRef = ref(null);
const activityPaneReady = ref(false); // hide activity content until scrolled to bottom (avoids top flash)
const leftPaneScrollTop = ref(0);
const leftPaneScrollElement = ref(null);
const isLeftTitleSticky = ref(false);
const STICKY_TITLE_ENABLE_OFFSET = 10;
const STICKY_TITLE_DISABLE_OFFSET = 2;
const TASK_MODULE_NAME = 'Task';
const isCreatingSubtask = ref(false);
const isSavingNewSubtask = ref(false);
const isDeletingSubtask = ref(false);
const deletingSubtaskId = ref('');
const newSubtaskTitle = ref('');
const newSubtaskInputRef = ref(null);
// Activity search state (searches comments)
const activitySearchQuery = ref('');
const activitySearchInputRef = ref(null);
const activitySearchOpen = ref(false);

const ACTIVITY_FILTER_STORAGE_KEY = 'litedesk-activity-filter';
function loadActivityFilter() {
  try {
    const raw = localStorage.getItem(ACTIVITY_FILTER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.comments === 'boolean' && typeof parsed?.updates === 'boolean') {
        return { comments: parsed.comments, updates: parsed.updates };
      }
    }
  } catch (_) {}
  return { comments: true, updates: true };
}
const savedFilter = loadActivityFilter();
const activityFilterComments = ref(savedFilter.comments);
const activityFilterUpdates = ref(savedFilter.updates);
const newCommentText = ref('');
const activeThreadRootCommentId = ref(null);
const editingCommentId = ref(null);
const editingCommentText = ref('');
const editingCommentAttachments = ref([]);
const editingCommentOriginalText = ref('');
const editingCommentOriginalAttachments = ref([]);
const editingCommentHasPendingFiles = ref(false);
const editCommentInputRef = ref(null);
const isEditingDescription = ref(false);
const descriptionDisplayRef = ref(null);
const descriptionMinHeight = ref(null);
const isDescriptionExpanded = ref(false);
const expandedLeftSection = ref(null);
const DESCRIPTION_PREVIEW_LINES = 7;
const DESCRIPTION_PREVIEW_LINE_HEIGHT_REM = 1.5;
const DESCRIPTION_PREVIEW_CHAR_THRESHOLD = 600;
const commentReactionEmojiOptions = ['👍', '😘', '👉', '❤️', '😂', '🙂', '🤫'];
const commentReactionPickerRef = ref(null);
const commentReactionPickerCommentKey = ref('');
const commentReactionPickerPosition = ref({ top: 0, left: 0 });
const showCommentReactionPicker = ref(false);
const commentReactionTooltipRef = ref(null);
const commentReactionTooltipPosition = ref({ top: 0, left: 0 });
const commentReactionTooltipPlacement = ref('above');
const showCommentReactionTooltip = ref(false);
const commentReactionTooltipData = ref(null);
const commentReactionTooltipAnchorEl = ref(null);
const commentReactionButtonRefs = new Map();
const COMMENT_REACTION_TOOLTIP_SHOW_DELAY_MS = 220;
let commentReactionTooltipHideTimer = null;
let commentReactionTooltipShowTimer = null;

// Link Record Drawer state (right side drawer, same as Link Organization)
const showLinkRecordDrawer = ref(false);
const linkRecordDrawerTypes = [
  { key: 'projects', label: 'Project' },
  { key: 'deals', label: 'Deal' },
  { key: 'events', label: 'Event' },
  { key: 'forms', label: 'Form' }
];
const linkRecordDrawerContext = computed(() => (task.value?._id ? { taskId: task.value._id } : {}));
const openLinkRecordDrawer = () => { showLinkRecordDrawer.value = true; };
const openLeftSection = (sectionKey) => {
  expandedLeftSection.value = sectionKey;
};
const closeExpandedLeftSection = () => {
  expandedLeftSection.value = null;
};

// Description version history (full-page)
const descriptionVersionsLoading = ref(false);
const descriptionRestoreLoading = ref(false);
const descriptionVersionsData = ref({ currentDescription: '', versions: [] });
const selectedDescriptionVersionIndex = ref(0);

const openDescriptionHistory = () => {
  expandedLeftSection.value = 'description-history';
  selectedDescriptionVersionIndex.value = 0;
  fetchDescriptionVersions();
};

const descriptionHistoryList = computed(() => {
  const taskVal = task.value;
  const data = descriptionVersionsData.value;
  if (!taskVal) return [];
  const current = {
    isCurrent: true,
    createdAt: taskVal.updatedAt || taskVal.createdAt || new Date(),
    createdBy: null,
    content: taskVal.description || ''
  };
  const currentUserName = authStore.user
    ? [authStore.user.firstName, authStore.user.lastName].filter(Boolean).join(' ').trim() || authStore.user.email
    : 'You';
  const list = [
    { ...current, createdBy: currentUserName }
  ];
  (data.versions || []).forEach((v) => {
    list.push({
      isCurrent: false,
      createdAt: v.createdAt,
      createdBy: v.createdBy,
      content: v.content
    });
  });
  return list;
});

function formatDescriptionVersionDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

async function fetchDescriptionVersions() {
  const id = task.value?._id;
  if (!id) return;
  descriptionVersionsLoading.value = true;
  try {
    const res = await apiClient.get(`/tasks/${id}/description-versions`);
    descriptionVersionsData.value = res?.data ?? { currentDescription: '', versions: [] };
  } catch (err) {
    console.error('Fetch description versions failed:', err);
    descriptionVersionsData.value = { currentDescription: '', versions: [] };
  } finally {
    descriptionVersionsLoading.value = false;
  }
}

async function restoreDescriptionVersion() {
  if (selectedDescriptionVersionIndex.value === 0) return;
  const id = task.value?._id;
  if (!id) return;
  const apiIndex = selectedDescriptionVersionIndex.value - 1;
  descriptionRestoreLoading.value = true;
  try {
    const res = await apiClient.post(`/tasks/${id}/description-versions/restore`, { versionIndex: apiIndex });
    if (res?.data) {
      task.value = res.data;
      localDescription.value = (res.data.description || '').trim();
      closeExpandedLeftSection();
    }
  } catch (err) {
    console.error('Restore description version failed:', err);
  } finally {
    descriptionRestoreLoading.value = false;
  }
}

const statusSelectOptions = computed(() => {
  const normalized = (taskStatusFieldOptions.value || [])
    .filter(option => option && option.value)
    .filter(option => option.enabled !== false)
    .map(option => ({ value: option.value, label: option.label || option.value, color: option.color || null }));

  return normalized.length > 0
    ? normalized
    : DEFAULT_TASK_STATUS_OPTIONS.map(option => ({ ...option, color: null }));
});

const prioritySelectOptions = computed(() => {
  const normalized = (taskPriorityFieldOptions.value || [])
    .filter(option => option && option.value)
    .filter(option => option.enabled !== false)
    .map(option => ({ value: option.value, label: option.label || option.value, color: option.color || null }));

  return normalized.length > 0
    ? normalized
    : DEFAULT_TASK_PRIORITY_OPTIONS.map(option => ({ ...option, color: DEFAULT_TASK_PRIORITY_COLOR_MAP[option.value] || null }));
});

const getRightRelatedAccordionStorageKey = () => {
  const id = task.value?._id || route.params.id || 'unknown';
  return `task-record-right-related-modules-${id}`;
};

const loadRightRelatedAccordionState = () => {
  try {
    const raw = sessionStorage.getItem(getRightRelatedAccordionStorageKey());
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
    rightRelatedModuleOpen.value = {
      ...rightRelatedModuleOpen.value,
      ...parsed
    };
  } catch {}
};

const persistRightRelatedAccordionState = () => {
  try {
    sessionStorage.setItem(
      getRightRelatedAccordionStorageKey(),
      JSON.stringify(rightRelatedModuleOpen.value)
    );
  } catch {}
};

const handleRightRelatedModuleToggle = (key, event) => {
  rightRelatedModuleOpen.value = {
    ...rightRelatedModuleOpen.value,
    [key]: !!event?.target?.open
  };
};
const localDescription = ref('');
const descriptionEditorRef = ref(null);

// RecordStateSection editable fields state
const isEditingStartDate = ref(false);
const isEditingDueDate = ref(false);
const localStartDate = ref('');
const localDueDate = ref('');
const startDateInputRef = ref(null);
const dueDateInputRef = ref(null);

const isEditingTimeEstimate = ref(false);
const localTimeEstimate = ref(0);
const timeEstimateInputRef = ref(null);

const relatedToPopoverAnchorEl = ref(null);
const relatedToPopoverRef = ref(null);
const showRelatedToPopover = ref(false);
const relatedToPopoverStyle = ref({ top: '0px', left: '0px' });
const relatedToPopoverValue = ref({ type: 'none', id: null });
const relatedToPopoverInitialValue = ref({ type: 'none', id: null });
const relatedToPopoverError = ref('');
const relatedToSaving = ref(false);

const tagHeaderButtonRef = ref(null);
const tagFieldButtonRef = ref(null);
const tagPopoverRef = ref(null);
const tagSearchInputRef = ref(null);
const showTagPopover = ref(false);
const tagListOpen = ref(false);
const tagPopoverAnchor = ref('header');
const activeTagAnchorEl = ref(null);
const tagPopoverStyle = ref({ top: '0px', left: '0px' });
const tagSearchQuery = ref('');
const instanceTagDefinitions = ref([]);
const tagEditorMode = ref('none');
const editingTagName = ref('');
const isSavingTagState = ref(false);
const tagEditor = ref({
  name: '',
  color: 'slate',
  isPublic: false
});

const TAG_COLOR_OPTIONS = [
  {
    key: 'slate',
    chipClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    dotClass: 'bg-slate-500',
    swatchClass: 'bg-slate-500'
  },
  {
    key: 'blue',
    chipClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    dotClass: 'bg-blue-500',
    swatchClass: 'bg-blue-500'
  },
  {
    key: 'indigo',
    chipClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    dotClass: 'bg-indigo-500',
    swatchClass: 'bg-indigo-500'
  },
  {
    key: 'violet',
    chipClass: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    dotClass: 'bg-violet-500',
    swatchClass: 'bg-violet-500'
  },
  {
    key: 'emerald',
    chipClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    dotClass: 'bg-emerald-500',
    swatchClass: 'bg-emerald-500'
  },
  {
    key: 'amber',
    chipClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    dotClass: 'bg-amber-500',
    swatchClass: 'bg-amber-500'
  },
  {
    key: 'orange',
    chipClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    dotClass: 'bg-orange-500',
    swatchClass: 'bg-orange-500'
  },
  {
    key: 'rose',
    chipClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    dotClass: 'bg-rose-500',
    swatchClass: 'bg-rose-500'
  }
];

const toReadableFieldLabel = (label, key = '') => {
  const fallback = String(key || '').trim();
  const source = String(label || fallback || '').trim();
  if (!source) return source;

  return source
    .replace(/_/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
};

// Get field label from module field configuration (so labels match create/edit and settings)
const getFieldLabel = (fieldKey) => {
  const moduleField = taskModuleDefinition.value?.fields?.find(
    (f) => (f.key || '').toLowerCase() === (fieldKey || '').toLowerCase()
  );
  return toReadableFieldLabel(moduleField?.label, fieldKey);
};

// Get field type for EditableLabeledValue component based on field metadata
const getFieldType = (fieldKey) => {
  const metadata = getTaskFieldMetadata(fieldKey);
  if (!metadata) return 'text';
  
  // Map field intents/types to EditableLabeledValue types
  if (fieldKey === 'assignedTo') return 'user';
  if (fieldKey === 'dueDate' || fieldKey === 'startDate') return 'date';
  if (fieldKey === 'priority' || fieldKey === 'status') return 'select';
  if (fieldKey === 'estimatedHours' || fieldKey === 'actualHours') return 'number';
  if (fieldKey === 'tags') return 'tags';
  
  return 'text';
};

// Get select options for select-type fields
const getFieldOptions = (fieldKey) => {
  if (fieldKey === 'priority') {
    return prioritySelectOptions.value.map(option => ({
      value: option.value,
      label: option.label
    }));
  }
  if (fieldKey === 'status') {
    return statusSelectOptions.value.map(option => ({
      value: option.value,
      label: option.label
    }));
  }
  return undefined;
};

const getPlainTextFromHtml = (html) => {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

// Word-level diff for version history: compare oldText (selected) vs newText (current), return HTML with added/removed highlights
function diffWordsToHtml(oldText, newText) {
  if (oldText == null) oldText = '';
  if (newText == null) newText = '';
  const a = String(oldText).split(/(\s+)/);
  const b = String(newText).split(/(\s+)/);
  const escape = (s) => {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  };
  const parts = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      parts.push({ op: 0, text: a[i] });
      i++;
      j++;
      continue;
    }
    if (i >= a.length) {
      parts.push({ op: 1, text: b[j] });
      j++;
      continue;
    }
    if (j >= b.length) {
      parts.push({ op: -1, text: a[i] });
      i++;
      continue;
    }
    const nextI = a.indexOf(b[j], i + 1);
    const nextJ = b.indexOf(a[i], j + 1);
    const distI = nextI === -1 ? Infinity : nextI - i;
    const distJ = nextJ === -1 ? Infinity : nextJ - j;
    if (distI <= distJ && distI !== Infinity) {
      for (let k = i; k < nextI; k++) parts.push({ op: -1, text: a[k] });
      i = nextI;
    } else if (distJ !== Infinity) {
      for (let k = j; k < nextJ; k++) parts.push({ op: 1, text: b[k] });
      j = nextJ;
    } else {
      parts.push({ op: -1, text: a[i] });
      parts.push({ op: 1, text: b[j] });
      i++;
      j++;
    }
  }
  let html = '';
  for (const p of parts) {
    const escaped = escape(p.text);
    if (p.op === 0) html += escaped;
    else if (p.op === -1) html += `<del class="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 line-through">${escaped}</del>`;
    else html += `<ins class="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 no-underline">${escaped}</ins>`;
  }
  return html;
}

const hasDescription = computed(() => {
  const desc = task.value?.description || '';
  return getPlainTextFromHtml(desc).length > 0;
});

const shouldShowDescriptionViewMore = computed(() => {
  const descriptionText = task.value?.description || '';
  if (!descriptionText) return false;
  const plainText = getPlainTextFromHtml(descriptionText);
  return plainText.length > DESCRIPTION_PREVIEW_CHAR_THRESHOLD;
});

const ALLOWED_DESCRIPTION_TAGS = ['p', 'br', 'strong', 'em', 's', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'blockquote'];

const sanitizedDescription = computed(() => {
  const raw = task.value?.description || '';
  if (!raw) return '';
  return DOMPurify.sanitize(raw, { ALLOWED_TAGS: ALLOWED_DESCRIPTION_TAGS });
});

// In version history view, show the selected version's content (not always current)
const descriptionHistorySelectedContent = computed(() => {
  const list = descriptionHistoryList.value;
  const idx = selectedDescriptionVersionIndex.value;
  const ver = list[idx];
  if (!ver || ver.content == null) return '';
  const raw = String(ver.content);
  if (!raw.trim()) return '';
  return DOMPurify.sanitize(raw, { ALLOWED_TAGS: ALLOWED_DESCRIPTION_TAGS });
});

// Show diff for every version when we have at least two to compare (current vs previous, or selected past vs current)
const descriptionHistoryShowDiff = computed(() => {
  const list = descriptionHistoryList.value;
  return list.length > 1;
});
const descriptionHistoryDiffHtml = computed(() => {
  if (!descriptionHistoryShowDiff.value) return '';
  const list = descriptionHistoryList.value;
  const idx = selectedDescriptionVersionIndex.value;
  const currentVer = list[0];
  const oldVer = idx === 0 ? list[1] : list[idx];
  if (!currentVer || !oldVer) return '';
  const oldPlain = getPlainTextFromHtml(oldVer.content);
  const newPlain = getPlainTextFromHtml(currentVer.content);
  const diffHtml = diffWordsToHtml(oldPlain, newPlain);
  return DOMPurify.sanitize(diffHtml, { ALLOWED_TAGS: ['ins', 'del'], ALLOWED_ATTR: ['class'] });
});

const descriptionHistorySelectedHasContent = computed(() => {
  const list = descriptionHistoryList.value;
  const idx = selectedDescriptionVersionIndex.value;
  const ver = list[idx];
  return ver && String(ver.content || '').trim().length > 0;
});

const descriptionContentStyle = computed(() => {
  if (!shouldShowDescriptionViewMore.value) return null;
  return {
    maxHeight: isDescriptionExpanded.value
      ? '1000px'
      : `${DESCRIPTION_PREVIEW_LINES * DESCRIPTION_PREVIEW_LINE_HEIGHT_REM}rem`,
    overflow: 'hidden',
    transition: 'max-height 450ms cubic-bezier(0.25, 0.1, 0.25, 1)'
  };
});

const KEY_FIELD_SECTION_EXCLUDED_KEYS = Object.freeze(['title', 'description', 'subtasks']);
const TASK_KEY_FIELD_DISPLAY_ORDER = Object.freeze([
  'status',
  'priority',
  'startDate',
  'dueDate',
  'assignedTo',
  'estimatedHours'
]);

const keyFieldKeys = computed(() => {
  const configured = getKeyFields(taskModuleDefinition.value)
    .map(field => String(field?.key || '').trim())
    .filter(Boolean)
    .filter(key => !KEY_FIELD_SECTION_EXCLUDED_KEYS.includes(key));

  return [...configured].sort((a, b) => {
    const aPinnedIndex = TASK_KEY_FIELD_DISPLAY_ORDER.indexOf(a);
    const bPinnedIndex = TASK_KEY_FIELD_DISPLAY_ORDER.indexOf(b);
    const aPinned = aPinnedIndex !== -1;
    const bPinned = bPinnedIndex !== -1;

    if (aPinned && bPinned) return aPinnedIndex - bPinnedIndex;
    if (aPinned) return -1;
    if (bPinned) return 1;
    return configured.indexOf(a) - configured.indexOf(b);
  });
});

const keyFieldIconMap = {
  status: CheckCircleIcon,
  startDate: CalendarIcon,
  dueDate: CalendarIcon,
  estimatedHours: ClockIcon,
  assignedTo: UserIcon,
  priority: FlagIcon,
  tags: TagIcon
};

const keyFieldSlotMap = {
  assignedTo: 'owner',
  estimatedHours: 'timeEstimate'
};

const keySectionFields = computed(() => {
  return keyFieldKeys.value.map((fieldKey) => {
    const moduleField = getKeyFields(taskModuleDefinition.value).find(field => field?.key === fieldKey);
    return {
      key: fieldKey,
      label: toReadableFieldLabel(moduleField?.label, fieldKey),
      icon: keyFieldIconMap[fieldKey] || null,
      slotKey: keyFieldSlotMap[fieldKey] || fieldKey
    };
  });
});

const getKeyFieldDisplayValue = (fieldKey) => {
  if (!task.value) return null;

  if (fieldKey === 'status') return formatStatus(task.value.status) || 'Empty';
  if (fieldKey === 'assignedTo') return getAssignedToDisplay(task.value.assignedTo) || 'Empty';
  if (fieldKey === 'startDate') return formatStateDate(task.value.startDate) || 'Empty';
  if (fieldKey === 'dueDate') return formatStateDate(task.value.dueDate) || 'Empty';
  if (fieldKey === 'priority') return formatPriority(task.value.priority) || 'Empty';
  if (fieldKey === 'estimatedHours') return task.value.estimatedHours ? `${task.value.estimatedHours}h` : 'Empty';
  if (fieldKey === 'tags') {
    return Array.isArray(task.value.tags) && task.value.tags.length > 0 ? task.value.tags.join(', ') : 'Empty';
  }
  if (fieldKey === 'relatedTo') return getRelatedToDisplay(task.value) || 'Empty';

  const rawValue = task.value[fieldKey];
  if (rawValue == null || rawValue === '') return 'Empty';
  if (typeof rawValue === 'object') {
    return rawValue.name || rawValue.label || rawValue.title || rawValue._id || 'Empty';
  }
  return String(rawValue);
};

function getRelatedToDisplay(t) {
  if (!t) return null;
  const rt = t.relatedTo ?? (t.relatedToType != null || t.relatedToId != null ? { type: t.relatedToType || 'none', id: t.relatedToId } : null);
  if (!rt || rt.type === 'none' || !rt.id) return null;
  const typeLabel = { contact: 'People', deal: 'Deal', organization: 'Organization', project: 'Project' }[rt.type] || rt.type;
  // Prefer display name: populated object (name/title), or stored name (e.g. from popover save), else raw id
  let nameVal = null;
  if (rt.id && typeof rt.id === 'object') {
    nameVal = rt.id.name || rt.id.title || rt.id._id;
  } else if (rt.name) {
    nameVal = rt.name;
  } else {
    nameVal = rt.id;
  }
  return nameVal ? `${typeLabel}: ${nameVal}` : typeLabel;
}

function getNormalizedRelatedTo(t) {
  if (!t) return { type: 'none', id: null };
  const rt = t.relatedTo ?? (t.relatedToType != null || t.relatedToId != null ? { type: t.relatedToType || 'none', id: t.relatedToId } : null);
  if (!rt || typeof rt !== 'object') return { type: 'none', id: null };
  const id = rt.id != null && typeof rt.id === 'object' && rt.id._id != null ? rt.id._id : (rt.id ?? null);
  return { type: rt.type || 'none', id };
}

function getRelatedToRecordPath(t) {
  const rt = getNormalizedRelatedTo(t);
  if (!rt || rt.type === 'none' || !rt.id) return null;
  const routes = {
    contact: '/people',
    deal: '/deals',
    organization: '/organizations',
    project: '/projects'
  };
  const base = routes[rt.type];
  return base ? `${base}/${rt.id}` : null;
}

const keyFieldDisplayValues = computed(() => {
  const values = {};
  keyFieldKeys.value.forEach((fieldKey) => {
    values[fieldKey] = getKeyFieldDisplayValue(fieldKey);
  });
  return values;
});

const detailsSectionExcludedFields = computed(() => {
  const baseExcluded = ['title', 'description', 'subtasks', 'projectId'];
  return Array.from(new Set([...baseExcluded, ...keyFieldKeys.value]));
});

const showAllDetails = ref(false);

const detailGroupFieldsMap = computed(() => {
  const coreFields = getCoreTaskFields();
  const excludedFields = detailsSectionExcludedFields.value;
  const displayableFields = coreFields.filter(field => !excludedFields.includes(field));

  const core = displayableFields.filter((field) => {
    const metadata = getTaskFieldMetadata(field);
    return metadata && (metadata.intent === 'primary' || metadata.intent === 'state' || metadata.intent === 'scheduling');
  });

  const planning = displayableFields.filter((field) => {
    const metadata = getTaskFieldMetadata(field);
    return metadata && metadata.intent === 'tracking';
  });

  const relationships = displayableFields.filter((field) => {
    const metadata = getTaskFieldMetadata(field);
    return metadata && metadata.intent === 'detail';
  });

  // Add tags to planning only if not already in another group (tags has intent 'detail' so it appears in relationships)
  if (displayableFields.includes('tags') && !relationships.includes('tags') && !planning.includes('tags')) {
    planning.push('tags');
  }

  return {
    core: Array.from(new Set(core)),
    planning: Array.from(new Set(planning)),
    relationships: Array.from(new Set(relationships))
  };
});

const detailFieldsOrdered = computed(() => {
  const ordered = [
    ...detailGroupFieldsMap.value.core,
    ...detailGroupFieldsMap.value.planning,
    ...(detailGroupFieldsMap.value.relationships || [])
  ];
  return Array.from(new Set(ordered));
});

const detailFieldCount = computed(() => detailFieldsOrdered.value.length);

const shouldShowDetailsViewAll = computed(() => {
  return !showAllDetails.value && detailFieldCount.value > 5;
});

const visibleDetailFieldSet = computed(() => {
  if (showAllDetails.value || detailFieldCount.value <= 5) {
    return new Set(detailFieldsOrdered.value);
  }
  return new Set(detailFieldsOrdered.value.slice(0, 5));
});

// Computed: Get core fields grouped by intent for display
const fieldGroups = computed(() => {
  const coreFields = getCoreTaskFields();
  
  // Filter out system fields and fields we don't want to show in RecordFieldsSection
  // (title and description are shown separately, subtasks are shown separately,
  // and RecordStateSection fields are shown in the state section above)
  const excludedFields = detailsSectionExcludedFields.value;
  const displayableFields = coreFields.filter(field => !excludedFields.includes(field));
  
  // Group fields by intent
  const groups = [];
  
  // Core fields group (primary, state, scheduling)
  const coreGroupFields = displayableFields.filter(field => {
    const metadata = getTaskFieldMetadata(field);
    return metadata && (metadata.intent === 'primary' || metadata.intent === 'state' || metadata.intent === 'scheduling');
  });
  
  if (coreGroupFields.length > 0) {
    groups.push({
      key: 'core',
      label: 'Core',
      fields: coreGroupFields
    });
  }
  
  // Planning group (tracking fields)
  const planningGroupFields = displayableFields.filter(field => {
    const metadata = getTaskFieldMetadata(field);
    return metadata && metadata.intent === 'tracking';
  });

  // Relationships group (detail intent: relatedTo, tags, etc.)
  const relationshipsGroupFields = displayableFields.filter(field => {
    const metadata = getTaskFieldMetadata(field);
    return metadata && metadata.intent === 'detail';
  });
  
  // Only add tags to planning if not already in relationships (tags has intent 'detail')
  if (displayableFields.includes('tags') && !relationshipsGroupFields.includes('tags') && !planningGroupFields.includes('tags')) {
    planningGroupFields.push('tags');
  }
  
  if (planningGroupFields.length > 0) {
    groups.push({
      key: 'planning',
      label: 'Planning',
      fields: planningGroupFields
    });
  }
  
  if (relationshipsGroupFields.length > 0) {
    groups.push({
      key: 'relationships',
      label: 'Relationships',
      fields: relationshipsGroupFields
    });
  }
  
  return groups.map(group => ({ key: group.key, label: group.label }));
});

// Computed: Get fields for each group
const getGroupFields = (groupKey) => {
  const rows = detailGroupFieldsMap.value[groupKey] || [];
  return rows.filter(fieldKey => visibleDetailFieldSet.value.has(fieldKey));
};

const completedSubtasksCount = computed(() => {
  return task.value?.subtasks?.filter(st => st.completed).length || 0;
});

const showAllSubtasks = ref(false);
const subtasksRenderLimit = ref(20);

const allSubtasks = computed(() => Array.isArray(task.value?.subtasks) ? task.value.subtasks : []);
const totalSubtasksCount = computed(() => allSubtasks.value.length);

const visibleSubtasks = computed(() => {
  if (!showAllSubtasks.value) {
    if (totalSubtasksCount.value <= 5) return allSubtasks.value;
    return allSubtasks.value.slice(0, 5);
  }

  if (totalSubtasksCount.value >= 50) {
    return allSubtasks.value.slice(0, subtasksRenderLimit.value);
  }

  return allSubtasks.value;
});

const shouldShowSubtasksViewAll = computed(() => {
  return !showAllSubtasks.value && totalSubtasksCount.value > 5;
});

const canLoadMoreSubtasks = computed(() => {
  return showAllSubtasks.value
    && totalSubtasksCount.value >= 50
    && visibleSubtasks.value.length < totalSubtasksCount.value;
});

const loadMoreSubtasks = () => {
  subtasksRenderLimit.value = Math.min(subtasksRenderLimit.value + 20, totalSubtasksCount.value);
};

// Check if user can edit tasks
const canEditTask = computed(() => {
  return authStore.can('tasks', 'edit');
});

// Check if user can link records (same as edit for now, can be refined)
const canLinkRecords = computed(() => {
  return authStore.can('tasks', 'edit');
});

// Check if there are any related records
const hasRelatedRecords = computed(() => {
  return !!(
    task.value?.projectId ||
    (taskEvents.value && taskEvents.value.length > 0) ||
    (taskDeals.value && taskDeals.value.length > 0) ||
    (taskForms.value && taskForms.value.length > 0)
  );
});

const hasTaskTags = computed(() => Array.isArray(task.value?.tags) && task.value.tags.length > 0);

const tagStorageKey = computed(() => {
  const organizationId = authStore.user?.organizationId || authStore.organization?._id || 'default-org';
  return `litedesk-task-tag-definitions-${organizationId}`;
});

const hasInstanceTags = computed(() => instanceTagDefinitions.value.length > 0);

const normalizedTagSearch = computed(() => normalizeTagName(tagSearchQuery.value));

const filteredInstanceTags = computed(() => {
  const search = normalizedTagSearch.value.toLowerCase();
  const rows = [...instanceTagDefinitions.value].sort((a, b) => a.name.localeCompare(b.name));
  if (!search) return rows;
  return rows.filter(tagDef => tagDef.name.toLowerCase().includes(search));
});

const canCreateTagFromSearch = computed(() => {
  const search = normalizedTagSearch.value;
  if (!search) return false;
  return !instanceTagDefinitions.value.some(tagDef => tagDef.name.toLowerCase() === search.toLowerCase());
});

const isTagEditorOpen = computed(() => tagEditorMode.value === 'create' || tagEditorMode.value === 'edit');

const canSaveTagEditor = computed(() => {
  const normalizedName = normalizeTagName(tagEditor.value.name);
  if (!normalizedName) return false;

  return !instanceTagDefinitions.value.some((tagDef) => {
    if (tagEditorMode.value === 'edit' && tagDef.name.toLowerCase() === String(editingTagName.value).toLowerCase()) {
      return false;
    }
    return tagDef.name.toLowerCase() === normalizedName.toLowerCase();
  });
});

const normalizeTagName = (value) => String(value || '').trim().replace(/\s+/g, ' ');

const getTagColorOption = (tagName) => {
  const definition = instanceTagDefinitions.value.find(tagDef => tagDef.name === tagName);
  const key = definition?.color || 'slate';
  return TAG_COLOR_OPTIONS.find(option => option.key === key) || TAG_COLOR_OPTIONS[0];
};

const getTagChipClass = (tagName) => getTagColorOption(tagName).chipClass;
const getTagDotClass = (tagName) => getTagColorOption(tagName).dotClass;

const computeDefaultTagColorKey = (tagName) => {
  const normalized = normalizeTagName(tagName);
  if (!normalized) return TAG_COLOR_OPTIONS[0].key;
  const hash = normalized.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return TAG_COLOR_OPTIONS[hash % TAG_COLOR_OPTIONS.length].key;
};

const saveTagDefinitionsToStorage = () => {
  try {
    localStorage.setItem(tagStorageKey.value, JSON.stringify(instanceTagDefinitions.value));
  } catch (err) {
    console.error('Failed to persist tag definitions:', err);
  }
};

const loadTagDefinitionsFromStorage = () => {
  try {
    const raw = localStorage.getItem(tagStorageKey.value);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;

    instanceTagDefinitions.value = parsed
      .map((row) => {
        const name = normalizeTagName(row?.name);
        if (!name) return null;
        const color = TAG_COLOR_OPTIONS.some(option => option.key === row?.color)
          ? row.color
          : computeDefaultTagColorKey(name);
        return {
          name,
          color,
          isPublic: !!row?.isPublic
        };
      })
      .filter(Boolean);
  } catch (err) {
    console.error('Failed to read tag definitions:', err);
  }
};

const mergeTagDefinitions = (tagNames = []) => {
  const existingByName = new Map(instanceTagDefinitions.value.map(def => [def.name.toLowerCase(), def]));

  tagNames.forEach((name) => {
    const normalizedName = normalizeTagName(name);
    if (!normalizedName) return;
    const key = normalizedName.toLowerCase();
    if (existingByName.has(key)) return;
    const color = computeDefaultTagColorKey(normalizedName);
    existingByName.set(key, {
      name: normalizedName,
      color,
      isPublic: false
    });
  });

  instanceTagDefinitions.value = Array.from(existingByName.values())
    .sort((a, b) => a.name.localeCompare(b.name));
  saveTagDefinitionsToStorage();
};

const fetchInstanceTagDefinitions = async () => {
  const collectedTags = new Set(Array.isArray(task.value?.tags) ? task.value.tags : []);
  let page = 1;
  let totalPages = 1;

  try {
    while (page <= totalPages && page <= 5) {
      const response = await apiClient.get('/tasks', {
        params: {
          page,
          limit: 200,
          sortBy: 'updatedAt',
          sortOrder: 'desc'
        }
      });

      if (!response?.success || !Array.isArray(response.data)) break;

      response.data.forEach((row) => {
        if (!Array.isArray(row?.tags)) return;
        row.tags.forEach((tagName) => {
          const normalizedName = normalizeTagName(tagName);
          if (!normalizedName) return;
          collectedTags.add(normalizedName);
        });
      });

      totalPages = Number(response.pagination?.totalPages || 1);
      page += 1;
    }
  } catch (err) {
    console.error('Failed to fetch instance tags:', err);
  }

  mergeTagDefinitions(Array.from(collectedTags));
};

const isTagAssigned = (tagName) => Array.isArray(task.value?.tags) && task.value.tags.includes(tagName);

const persistRecordTags = async (nextTagNames) => {
  if (!task.value || !canEditTask.value) return;
  const cleaned = Array.from(new Set((nextTagNames || []).map(normalizeTagName).filter(Boolean)));

  try {
    isSavingTagState.value = true;
    const response = await apiClient.put(`/tasks/${task.value._id}`, { tags: cleaned });
    if (response?.success && response.data) {
      task.value.tags = Array.isArray(response.data.tags) ? response.data.tags : cleaned;
    } else {
      task.value.tags = cleaned;
    }
    mergeTagDefinitions(cleaned);
  } catch (err) {
    console.error('Error updating task tags:', err);
    await fetchTask();
  } finally {
    isSavingTagState.value = false;
  }
};

const toggleTagForRecord = async (tagName) => {
  const currentTags = Array.isArray(task.value?.tags) ? task.value.tags : [];
  if (currentTags.includes(tagName)) {
    await persistRecordTags(currentTags.filter(name => name !== tagName));
    return;
  }
  await persistRecordTags([...currentTags, tagName]);
};

const removeTagFromRecord = async (tagName) => {
  const currentTags = Array.isArray(task.value?.tags) ? task.value.tags : [];
  if (!currentTags.includes(tagName)) return;
  await persistRecordTags(currentTags.filter(name => name !== tagName));
};

const closeTagEditor = () => {
  tagEditorMode.value = 'none';
  editingTagName.value = '';
  tagEditor.value = {
    name: '',
    color: TAG_COLOR_OPTIONS[0].key,
    isPublic: false
  };
};

const openCreateTagEditor = (prefill = '') => {
  const normalized = normalizeTagName(prefill);
  tagEditorMode.value = 'create';
  editingTagName.value = '';
  tagEditor.value = {
    name: normalized,
    color: computeDefaultTagColorKey(normalized),
    isPublic: false
  };
};

const openEditTagEditor = (tagDef) => {
  if (!tagDef?.name) return;
  tagEditorMode.value = 'edit';
  editingTagName.value = tagDef.name;
  tagEditor.value = {
    name: tagDef.name,
    color: tagDef.color || TAG_COLOR_OPTIONS[0].key,
    isPublic: !!tagDef.isPublic
  };
};

const saveTagEditor = async () => {
  if (!canSaveTagEditor.value) return;

  const nextName = normalizeTagName(tagEditor.value.name);
  const nextColor = TAG_COLOR_OPTIONS.some(option => option.key === tagEditor.value.color)
    ? tagEditor.value.color
    : computeDefaultTagColorKey(nextName);
  const nextIsPublic = !!tagEditor.value.isPublic;

  if (tagEditorMode.value === 'create') {
    instanceTagDefinitions.value = [
      ...instanceTagDefinitions.value,
      { name: nextName, color: nextColor, isPublic: nextIsPublic }
    ].sort((a, b) => a.name.localeCompare(b.name));
    saveTagDefinitionsToStorage();
    await persistRecordTags([...(task.value?.tags || []), nextName]);
    tagSearchQuery.value = '';
    closeTagEditor();
    return;
  }

  if (tagEditorMode.value === 'edit' && editingTagName.value) {
    const previousName = editingTagName.value;
    instanceTagDefinitions.value = instanceTagDefinitions.value
      .map((tagDef) => {
        if (tagDef.name !== previousName) return tagDef;
        return {
          name: nextName,
          color: nextColor,
          isPublic: nextIsPublic
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    saveTagDefinitionsToStorage();

    if (isTagAssigned(previousName)) {
      const nextTaskTags = (task.value?.tags || []).map(name => (name === previousName ? nextName : name));
      await persistRecordTags(nextTaskTags);
    }
    tagSearchQuery.value = '';
    closeTagEditor();
  }
};

const deleteEditingTag = async () => {
  if (tagEditorMode.value !== 'edit' || !editingTagName.value) return;
  const deletingName = editingTagName.value;
  instanceTagDefinitions.value = instanceTagDefinitions.value.filter(tagDef => tagDef.name !== deletingName);
  saveTagDefinitionsToStorage();
  if (isTagAssigned(deletingName)) {
    await removeTagFromRecord(deletingName);
  }
  closeTagEditor();
};

const resolveMaybeElement = (refValue) => {
  if (!refValue) return null;

  if (Array.isArray(refValue)) {
    for (let i = refValue.length - 1; i >= 0; i -= 1) {
      const el = resolveMaybeElement(refValue[i]);
      if (el) return el;
    }
    return null;
  }

  if (refValue instanceof HTMLElement) return refValue;
  if (refValue?.$el instanceof HTMLElement) return refValue.$el;
  return null;
};

const getAnchorElementForPopover = () => {
  if (activeTagAnchorEl.value instanceof HTMLElement) return activeTagAnchorEl.value;
  if (tagPopoverAnchor.value === 'field') return resolveMaybeElement(tagFieldButtonRef.value);
  return resolveMaybeElement(tagHeaderButtonRef.value);
};

const updateTagPopoverPosition = () => {
  if (!showTagPopover.value) return;
  const anchor = getAnchorElementForPopover();
  if (!anchor) return;

  const rect = anchor.getBoundingClientRect();
  const width = 360;
  const margin = 12;
  const popoverHeight = tagPopoverRef.value?.offsetHeight || 320;
  const left = Math.min(
    Math.max(rect.left + window.scrollX, margin),
    window.scrollX + window.innerWidth - width - margin
  );

  const belowTop = rect.bottom + window.scrollY + 8;
  const aboveTop = rect.top + window.scrollY - popoverHeight - 8;
  const canPlaceBelow = rect.bottom + popoverHeight + margin <= window.innerHeight;
  const top = canPlaceBelow ? belowTop : Math.max(margin, aboveTop);

  tagPopoverStyle.value = {
    top: `${top}px`,
    left: `${left}px`
  };
};

const openTagPopover = async (anchor = 'header', anchorEl = null) => {
  tagPopoverAnchor.value = anchor;
  activeTagAnchorEl.value = resolveMaybeElement(anchorEl);
  tagListOpen.value = false;
  showTagPopover.value = true;
  await nextTick();
  updateTagPopoverPosition();
  requestAnimationFrame(updateTagPopoverPosition);
};

const closeTagPopover = () => {
  showTagPopover.value = false;
  tagSearchQuery.value = '';
  tagListOpen.value = false;
  activeTagAnchorEl.value = null;
  closeTagEditor();
};

const handleTagSearchBlur = () => {
  window.setTimeout(() => {
    if (document.activeElement !== tagSearchInputRef.value) {
      tagListOpen.value = false;
    }
  }, 120);
};

const handleTagIconClick = (event) => {
  if (showTagPopover.value) {
    closeTagPopover();
    return;
  }
  openTagPopover('header', event?.currentTarget || event?.target || null);
};

const openTagPopoverFromField = (event) => {
  openTagPopover('field', event?.currentTarget || event?.target || null);
};

const handleTagPopoverOutsideClick = (event) => {
  if (!showTagPopover.value) return;
  const target = event?.target;
  if (!target) return;

  const popoverEl = tagPopoverRef.value;
  const clickedInsidePopover = popoverEl && popoverEl.contains(target);
  const headerButtonEl = resolveMaybeElement(tagHeaderButtonRef.value);
  const fieldButtonEl = resolveMaybeElement(tagFieldButtonRef.value);
  const clickedHeaderButton = headerButtonEl && headerButtonEl.contains(target);
  const clickedFieldButton = fieldButtonEl && fieldButtonEl.contains(target);

  if (clickedInsidePopover || clickedHeaderButton || clickedFieldButton) return;
  closeTagPopover();
};

const updateRelatedToPopoverPosition = () => {
  if (!showRelatedToPopover.value) return;
  const anchor = relatedToPopoverAnchorEl.value;
  if (!anchor || typeof anchor.getBoundingClientRect !== 'function') return;
  const rect = anchor.getBoundingClientRect();
  const width = 440;
  const margin = 12;
  const gap = 8;
  const popoverEl = relatedToPopoverRef.value;
  const popoverHeight = popoverEl?.offsetHeight || 280;
  // Fixed positioning uses viewport coordinates (no scroll offset)
  const left = Math.min(
    Math.max(rect.left, margin),
    window.innerWidth - width - margin
  );
  const belowTop = rect.bottom + gap;
  const aboveTop = rect.top - popoverHeight - gap;
  const canPlaceBelow = rect.bottom + popoverHeight + margin <= window.innerHeight;
  const top = canPlaceBelow ? belowTop : Math.max(margin, aboveTop);
  relatedToPopoverStyle.value = { top: `${top}px`, left: `${left}px` };
};

const openRelatedToPopover = (event) => {
  if (!task.value) return;
  const el = event?.currentTarget;
  if (el && typeof el.getBoundingClientRect === 'function') {
    relatedToPopoverAnchorEl.value = el;
  } else {
    relatedToPopoverAnchorEl.value = null;
  }
  const initial = getNormalizedRelatedTo(task.value);
  relatedToPopoverValue.value = { ...initial };
  relatedToPopoverInitialValue.value = { type: initial.type, id: initial.id };
  relatedToPopoverError.value = '';
  showRelatedToPopover.value = true;
  nextTick(() => {
    updateRelatedToPopoverPosition();
    requestAnimationFrame(updateRelatedToPopoverPosition);
  });
};

const hasRelatedToPopoverChanges = computed(() => {
  const current = relatedToPopoverValue.value;
  const initial = relatedToPopoverInitialValue.value;
  const currentType = current?.type || 'none';
  const initialType = initial?.type || 'none';
  const currentId = current?.id != null && current?.id !== '' ? String(current.id) : null;
  const initialId = initial?.id != null && initial?.id !== '' ? String(initial.id) : null;
  return currentType !== initialType || currentId !== initialId;
});

const closeRelatedToPopover = () => {
  showRelatedToPopover.value = false;
  relatedToPopoverAnchorEl.value = null;
};

const saveRelatedToFromPopover = async () => {
  if (!task.value || !canEditTask.value) return;
  relatedToPopoverError.value = '';
  relatedToSaving.value = true;
  try {
    const payload = { type: relatedToPopoverValue.value?.type || 'none', id: relatedToPopoverValue.value?.id ?? null };
    const response = await apiClient.put(`/tasks/${task.value._id}`, { relatedTo: payload });
    if (response.success && response.data) {
      const displayName = relatedToPopoverValue.value?.displayLabel;
      task.value.relatedTo = displayName ? { ...payload, name: displayName } : payload;
      if (!displayName && payload.id) await resolveRelatedToDisplayName();
      closeRelatedToPopover();
    } else {
      relatedToPopoverError.value = response.message || 'Failed to save';
    }
  } catch (e) {
    relatedToPopoverError.value = e?.message || 'Failed to save';
  } finally {
    relatedToSaving.value = false;
  }
};

const handleRelatedToPopoverOutsideClick = (event) => {
  if (!showRelatedToPopover.value) return;
  const target = event?.target;
  if (!target) return;
  const popoverEl = relatedToPopoverRef.value;
  const clickedInsidePopover = popoverEl && popoverEl.contains(target);
  const anchorEl = relatedToPopoverAnchorEl.value;
  const clickedAnchor = anchorEl && anchorEl.contains(target);
  if (clickedInsidePopover || clickedAnchor) return;
  closeRelatedToPopover();
};

// Available modules for linking
const linkableModules = [
  { key: 'projects', label: 'Project', endpoint: '/projects' },
  { key: 'deals', label: 'Deal', endpoint: '/deals' },
  { key: 'events', label: 'Event', endpoint: '/events' },
  { key: 'forms', label: 'Form', endpoint: '/forms' }
];

// Get IDs of already linked records to exclude from search
const linkedRecordIds = computed(() => {
  const ids = [];
  if (task.value?.projectId) {
    ids.push(typeof task.value.projectId === 'object' ? task.value.projectId._id : task.value.projectId);
  }
  if (taskEvents.value) {
    ids.push(...taskEvents.value.map(e => e._id));
  }
  if (taskDeals.value) {
    ids.push(...taskDeals.value.map(d => d._id));
  }
  if (taskForms.value) {
    ids.push(...taskForms.value.map(f => f._id));
  }
  return ids;
});

const getRelatedRecordId = (record) => record?._id || record?.recordId || record?.id || null;

const formatCompactDate = (dateValue) => {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatCompactCurrency = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: num >= 1000 ? 0 : 2
    }).format(num);
  } catch {
    return '';
  }
};

const getRelatedTypeLabel = (type) => ({
  project: 'Project',
  event: 'Event',
  deal: 'Deal',
  form: 'Form'
}[type] || 'Record');

const getRelatedTypeBadgeClass = (type) => {
  const base = 'inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide';
  const variants = {
    project: 'bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-200',
    event: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    deal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    form: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
  };
  return `${base} ${variants[type] || variants.project}`;
};

const getRelatedRecordTitle = (type, record) => {
  const id = getRelatedRecordId(record);
  const suffix = id ? String(id).slice(-8) : '';

  if (type === 'event') {
    return record?.eventName || record?.name || record?.title || `Event ${suffix}`;
  }
  if (type === 'deal') {
    return record?.name || record?.title || `Deal ${suffix}`;
  }
  if (type === 'form') {
    return record?.name || record?.title || `Form ${suffix}`;
  }
  if (type === 'project') {
    return record?.name || record?.title || `Project ${suffix}`;
  }
  return record?.name || record?.title || suffix || 'Record';
};

const getRelatedRecordMeta = (type, record) => {
  if (!record) return '';

  if (type === 'event') {
    const parts = [
      record.eventType || record.status,
      formatCompactDate(record.startDateTime || record.startDate || record.createdAt)
    ].filter(Boolean);
    return parts.join(' • ');
  }

  if (type === 'deal') {
    const amount =
      formatCompactCurrency(record.amount) ||
      formatCompactCurrency(record.value) ||
      formatCompactCurrency(record.totalValue);
    const parts = [record.stage || record.status, amount].filter(Boolean);
    return parts.join(' • ');
  }

  if (type === 'form') {
    const parts = [record.formType || record.type, record.status].filter(Boolean);
    return parts.join(' • ');
  }

  if (type === 'project') {
    return record.status || '';
  }

  return '';
};

const RELATED_DETAIL_ENDPOINTS = {
  events: '/events',
  deals: '/deals',
  forms: '/forms'
};

const enrichRelatedRecords = async (moduleKey, rows) => {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const endpoint = RELATED_DETAIL_ENDPOINTS[moduleKey];
  if (!endpoint) return rows;

  const enriched = await Promise.all(rows.map(async (row) => {
    const id = getRelatedRecordId(row);
    if (!id) return row;

    try {
      const detailRes = await apiClient.get(`${endpoint}/${id}`);
      const detail = detailRes?.success ? detailRes.data : null;
      if (!detail) return row;
      return { ...row, ...detail, _id: id };
    } catch {
      return row;
    }
  }));

  return enriched;
};

// Combined activity events (comments + timeline) sorted chronologically (oldest first, newest at bottom)
const combinedActivityEvents = computed(() => {
  // Combine all events and sort by createdAt (oldest first)
  const allEvents = [...activityEvents.value];
  return allEvents.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateA - dateB; // Oldest first (newest at bottom)
  });
});

const getCommentEventId = (event) => {
  if (!event) return '';
  return String(event.id || event._id || '');
};

const getParentCommentId = (event) => {
  const rawParentId = event?.parentCommentId;
  if (!rawParentId) return '';
  if (typeof rawParentId === 'object') {
    return String(rawParentId._id || rawParentId.id || '');
  }
  return String(rawParentId);
};

const commentActivityEvents = computed(() => (
  combinedActivityEvents.value.filter((event) => event.type === 'comment')
));

const commentEventsById = computed(() => {
  const map = new Map();
  commentActivityEvents.value.forEach((event) => {
    const id = getCommentEventId(event);
    if (id) map.set(id, event);
  });
  return map;
});

const getThreadRootCommentId = (event) => {
  const eventId = getCommentEventId(event);
  if (!eventId) return '';
  let cursor = getParentCommentId(event) || eventId;
  const visited = new Set();

  while (cursor && !visited.has(cursor)) {
    visited.add(cursor);
    const current = commentEventsById.value.get(cursor);
    if (!current) break;
    const parentId = getParentCommentId(current);
    if (!parentId) return cursor;
    cursor = parentId;
  }

  return getParentCommentId(event) || eventId;
};

const activeThreadRootComment = computed(() => {
  if (!activeThreadRootCommentId.value) return null;
  return commentEventsById.value.get(String(activeThreadRootCommentId.value)) || null;
});

const threadReplyEvents = computed(() => {
  if (!activeThreadRootCommentId.value) return [];
  const rootId = String(activeThreadRootCommentId.value);
  return commentActivityEvents.value
    .filter((event) => getParentCommentId(event) === rootId)
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateA - dateB;
    });
});

const threadReplyCount = computed(() => threadReplyEvents.value.length);
const isThreadViewActive = computed(() => Boolean(activeThreadRootCommentId.value && activeThreadRootComment.value));

const commentThreadRepliesByRootId = computed(() => {
  const map = new Map();
  commentActivityEvents.value.forEach((event) => {
    const eventId = getCommentEventId(event);
    if (!eventId) return;
    const rootId = getThreadRootCommentId(event);
    if (!rootId || rootId === eventId) return;
    const bucket = map.get(rootId) || [];
    bucket.push(event);
    map.set(rootId, bucket);
  });

  map.forEach((events, rootId) => {
    events.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateA - dateB;
    });
    map.set(rootId, events);
  });

  return map;
});

const getCommentThreadReplyCount = (event) => {
  const rootId = getCommentEventId(event);
  if (!rootId) return 0;
  return (commentThreadRepliesByRootId.value.get(rootId) || []).length;
};

const getCommentThreadLatestReplyAuthor = (event) => {
  const rootId = getCommentEventId(event);
  if (!rootId) return null;
  const replies = commentThreadRepliesByRootId.value.get(rootId) || [];
  const latestReply = replies[replies.length - 1];
  return latestReply?.author || null;
};

// Filtered activity events based on selected activity types (Comments and/or Updates; both selected by default)
const filteredActivityEvents = computed(() => {
  const events = combinedActivityEvents.value;
  const showComments = activityFilterComments.value;
  const showUpdates = activityFilterUpdates.value;
  if (!showComments && !showUpdates) return [];

  const q = (activitySearchQuery.value || '').trim().toLowerCase();

  // If there's an active search query, show only comments and filter by content/author
  if (q) {
    return events.filter(e => {
      if (e.type === 'comment' && !getParentCommentId(e)) {
        const text = ((e.content || e.text || '') + ' ' + (e.author && (typeof e.author === 'string' ? e.author : (e.author.firstName || e.author.first_name || e.author.lastName || e.author.last_name || e.author.username || e.author.email || '')))).toLowerCase();
        return text.indexOf(q) !== -1;
      }
      return false; // hide system events when searching
    });
  }

  // No search query: filter by the activity type toggles
  return events.filter(e =>
    ((e.type === 'comment' && !getParentCommentId(e)) && showComments) || (e.type === 'system' && showUpdates)
  );
});

const activityTimelineEvents = computed(() => {
  if (!isThreadViewActive.value || !activeThreadRootComment.value) {
    return filteredActivityEvents.value;
  }
  return [activeThreadRootComment.value, ...threadReplyEvents.value];
});

// Persist activity filter so it survives reload
watch([activityFilterComments, activityFilterUpdates], ([comments, updates]) => {
  try {
    localStorage.setItem(ACTIVITY_FILTER_STORAGE_KEY, JSON.stringify({ comments, updates }));
  } catch (_) {}
});

watch(activeThreadRootComment, (threadRoot) => {
  if (!activeThreadRootCommentId.value) return;
  if (threadRoot) return;
  activeThreadRootCommentId.value = null;
});

const contextTabs = [
  {
    key: 'activity',
    label: 'Activity',
    icon: ClockIcon
  },
  {
    key: 'related',
    label: 'Related Records',
    icon: LinkIcon
  },
  {
    key: 'integrations',
    label: 'Integrations',
    icon: PuzzlePieceIcon
  }
];

// Map contextTabs to RecordRightPane format
const rightPaneTabs = computed(() => {
  return contextTabs.map(tab => ({
    id: tab.key,
    name: tab.label,
    icon: tab.icon
  }));
});

const contextRelatedGroups = computed(() => {
  const groups = [];
  if (task.value?.projectId) {
    groups.push({ key: 'project', label: 'Project', count: 1 });
  }
  if (taskEvents.value && taskEvents.value.length > 0) {
    groups.push({ key: 'events', label: 'Events', count: taskEvents.value.length });
  }
  if (taskDeals.value && taskDeals.value.length > 0) {
    groups.push({ key: 'deals', label: 'Deals', count: taskDeals.value.length });
  }
  if (taskForms.value && taskForms.value.length > 0) {
    groups.push({ key: 'forms', label: 'Forms', count: taskForms.value.length });
  }
  return groups;
});

// Fetch task data
/** When task.relatedTo has type+id but no display name, fetch the record and set relatedTo.name so details show name instead of raw id */
const resolveRelatedToDisplayName = async () => {
  const t = task.value;
  if (!t?.relatedTo) return;
  const rt = t.relatedTo;
  if (rt.type === 'none' || !rt.id) return;
  if (rt.name) return;
  if (rt.id && typeof rt.id === 'object' && (rt.id.name || rt.id.title)) return;
  const id = typeof rt.id === 'object' ? rt.id._id : rt.id;
  if (!id) return;
  const endpoints = {
    contact: (id) => apiClient.get(`/people/${id}`),
    deal: (id) => apiClient.get(`/deals/${id}`),
    organization: (id) => apiClient.get(`/v2/organization/${id}`),
    project: (id) => apiClient.get(`/projects/${id}`)
  };
  const fetchFn = endpoints[rt.type];
  if (!fetchFn) return;
  try {
    const res = await fetchFn(id);
    const data = res?.data?.data ?? res?.data;
    const name = data?.name || data?.title || (data?.first_name && data?.last_name ? `${data.first_name} ${data.last_name}`.trim() : null) || data?.email;
    if (name && task.value?.relatedTo) {
      task.value.relatedTo = { ...task.value.relatedTo, name };
    }
  } catch {
    // non-fatal
  }
};

const fetchTask = async () => {
  const id = effectiveTaskId.value;
  if (!id) return;
  loading.value = true;
  error.value = null;
  try {
    const response = await apiClient(`/tasks/${id}`);
    if (response.success) {
      task.value = response.data;
      // TODO: Load follow state from API if available
      // isFollowing.value = response.data.isFollowing || false;
      await Promise.all([
        fetchRelatedRecords(),
        fetchActivityEvents(),
        fetchCustomFields(),
        fetchUsers(),
        fetchInstanceTagDefinitions()
      ]);
      await resolveRelatedToDisplayName();
    }
  } catch (err) {
    console.error('Error fetching task:', err);
    error.value = err.message || 'Failed to load task';
  } finally {
    loading.value = false;
  }
};

const fetchRelatedRecords = async () => {
  if (!task.value) return;
  try {
    const contextCandidates = [
      { appKey: 'platform', moduleKey: 'tasks' },
      { appKey: 'sales', moduleKey: 'tasks' },
      { appKey: 'crm', moduleKey: 'tasks' }
    ];

    const linkResponses = await Promise.all(
      contextCandidates.map(candidate =>
        apiClient.get('/relationships/links', {
          params: {
            appKey: candidate.appKey,
            moduleKey: candidate.moduleKey,
            recordId: task.value._id
          }
        }).catch(() => null)
      )
    );

    const links = linkResponses.flatMap((response) => (
      response?.success && Array.isArray(response.data)
        ? response.data
        : []
    ));

    const contextResponses = await Promise.all(
      contextCandidates.map(candidate =>
        apiClient.get('/relationships/record-context', {
          params: {
            appKey: candidate.appKey,
            moduleKey: candidate.moduleKey,
            recordId: task.value._id
          }
        }).catch(() => null)
      )
    );

    const contextRelationships = contextResponses.flatMap((response) => (
      response?.success && Array.isArray(response.data?.relationships)
        ? response.data.relationships
        : []
    ));

    const toRow = (record) => {
      const id = record?.recordId || record?.id || record?._id;
      if (!id) return null;
      return {
        ...record,
        _id: id
      };
    };

    const collectFromLinksByKeys = (...keys) => {
      const keySet = new Set(keys.map(k => String(k).toLowerCase()));
      const rows = [];
      links.forEach((link) => {
        const relKey = String(link?.relationshipKey || '').toLowerCase();
        const moduleKey = String(link?.relatedRecord?.moduleKey || '').toLowerCase();
        if (!keySet.has(relKey) && !keySet.has(moduleKey)) return;
        const row = toRow(link?.relatedRecord);
        if (row) rows.push(row);
      });
      return rows;
    };

    const collectFromContextByKeys = (...keys) => {
      const keySet = new Set(keys.map(k => String(k).toLowerCase()));
      const rows = [];
      contextRelationships.forEach((rel) => {
        const relKey = String(rel?.relationshipKey || '').toLowerCase();
        const targetKey = String(rel?.target?.moduleKey || '').toLowerCase();
        if (!keySet.has(relKey) && !keySet.has(targetKey)) return;
        (rel.records || []).forEach((rec) => {
          const row = toRow(rec);
          if (row) rows.push(row);
        });
      });
      return rows;
    };

    const dedupeRows = (rows) => {
      const seen = new Set();
      return rows.filter((row) => {
        const key = String(row._id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    const rawEvents = dedupeRows([
      ...collectFromLinksByKeys('events', 'event'),
      ...collectFromContextByKeys('events', 'event')
    ]);
    const rawDeals = dedupeRows([
      ...collectFromLinksByKeys('deals', 'deal'),
      ...collectFromContextByKeys('deals', 'deal')
    ]);
    const rawForms = dedupeRows([
      ...collectFromLinksByKeys('forms', 'form'),
      ...collectFromContextByKeys('forms', 'form')
    ]);

    const [enrichedEvents, enrichedDeals, enrichedForms] = await Promise.all([
      enrichRelatedRecords('events', rawEvents),
      enrichRelatedRecords('deals', rawDeals),
      enrichRelatedRecords('forms', rawForms)
    ]);

    taskEvents.value = enrichedEvents;
    taskDeals.value = enrichedDeals;
    taskForms.value = enrichedForms;
  } catch (err) {
    taskEvents.value = [];
    taskDeals.value = [];
    taskForms.value = [];
    console.error('Error fetching related records:', err);
  }
};

const fetchActivityEvents = async () => {
  if (!task.value) return;
  
  const events = [];
  
  // Fetch activity logs (system events)
  try {
    const response = await apiClient(`/tasks/${task.value._id}/activity-logs`);
    if (response.success && response.data) {
      // Convert activity logs to activity events format
      const systemEvents = response.data.map((log) => {
        const ev = {
          type: 'system',
          message: formatActivityLog(log),
          createdAt: log.timestamp,
          author: log.user || log.userId,
          action: log.action,
          details: log.details
        };
        if (log.action === 'field_changed' && log.details?.field === 'description') {
          const fromPlain = getPlainTextFromHtml(log.details.from ?? log.details.oldValue ?? '');
          const toPlain = getPlainTextFromHtml(log.details.to ?? log.details.newValue ?? '');
          ev.message = `${resolveActorLabel(log.user, log.userId)} changed description`;
          ev.descriptionDiffHtml = DOMPurify.sanitize(diffWordsToHtml(fromPlain, toPlain), { ALLOWED_TAGS: ['ins', 'del'], ALLOWED_ATTR: ['class'] });
        }
        return ev;
      });
      events.push(...systemEvents);
    }
  } catch (err) {
    // If 404, fall through to generate from task metadata
    if (err.status !== 404 && !err.is404) {
      console.error('Error fetching activity logs:', err);
    }
  }
  
  // If no activity logs found, generate from task metadata
  if (events.length === 0) {
    const generatedEvents = generateUpdateLogsFromTask();
    events.push(...generatedEvents);
  }
  
  // Fetch comments
  try {
    const commentsResponse = await apiClient(`/tasks/${task.value._id}/comments`);
    if (commentsResponse.success && Array.isArray(commentsResponse.data)) {
      const commentEvents = commentsResponse.data.map(comment => ({
        type: 'comment',
        id: comment._id,
        content: comment.content || comment.text,
        createdAt: comment.createdAt || comment.timestamp,
        author: comment.author || comment.user || comment.userId,
        editedAt: comment.editedAt,
        parentCommentId: comment.parentCommentId || null,
        attachments: comment.attachments || [],
        reactions: comment.reactions || comment.reactionSummary || comment.emojiReactions,
        myReactions: comment.myReactions || comment.currentUserReactions || [],
        likes: comment.likes || comment.likedBy,
        likesCount: comment.likesCount ?? comment.likeCount
      }));
      events.push(...commentEvents);
    }
  } catch (err) {
    // Comments endpoint might not exist yet, that's okay
    if (err.status !== 404 && !err.is404) {
      console.error('Error fetching comments:', err);
    }
  }
  
  // Sort all events by date (oldest first, newest at bottom)
  events.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateA - dateB; // Oldest first (newest at bottom)
  });
  
  activityEvents.value = events;
};

const generateUpdateLogsFromTask = () => {
  if (!task.value) return [];
  
  const events = [];
  
  // Task created
  if (task.value.createdAt) {
    const createdBy = task.value.createdBy;
    const creatorName = createdBy 
      ? (typeof createdBy === 'object' 
        ? getUserDisplayName(createdBy) 
        : createdBy)
      : 'System';
    
    events.push({
      type: 'system',
      message: `created this task`,
      createdAt: task.value.createdAt,
      author: createdBy || 'System',
      action: 'created'
    });
  }
  
  // Task updated (if updatedAt differs from createdAt)
  if (task.value.updatedAt && 
      new Date(task.value.updatedAt).getTime() !== new Date(task.value.createdAt).getTime()) {
    events.push({
      type: 'system',
      message: `updated this task`,
      createdAt: task.value.updatedAt,
      action: 'updated'
    });
  }
  
  // Status changes (if completed)
  if (task.value.status === 'completed' && task.value.completedDate) {
    events.push({
      type: 'system',
      message: `marked this task as completed`,
      createdAt: task.value.completedDate,
      action: 'status_changed',
      details: { status: 'completed' }
    });
  }
  
  return events;
};

const getCurrentUserId = () => String(authStore.user?._id || authStore.user?.id || '');

const isCurrentUserById = (value) => {
  const currentUserId = getCurrentUserId();
  if (!currentUserId || !value) return false;

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value) === currentUserId;
  }

  if (typeof value === 'object') {
    const id = value._id || value.id;
    return id ? String(id) === currentUserId : false;
  }

  return false;
};

const isCurrentUserByName = (value) => {
  const candidate = String(value || '').trim().toLowerCase();
  if (!candidate) return false;
  const firstName = authStore.user?.firstName || authStore.user?.first_name || '';
  const lastName = authStore.user?.lastName || authStore.user?.last_name || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim().toLowerCase();
  const username = String(authStore.user?.username || '').trim().toLowerCase();
  const email = String(authStore.user?.email || '').trim().toLowerCase();
  return Boolean(candidate && (candidate === fullName || candidate === username || candidate === email));
};

const resolveActorLabel = (name, userId) => {
  if (isCurrentUserById(userId) || isCurrentUserByName(name)) return 'You';
  return name || 'System';
};

const formatActivityLog = (log) => {
  if (!log) return 'Activity logged';
  const action = log.action || 'updated';
  const user = resolveActorLabel(log.user, log.userId);
  const details = log.details || {};

  const normalizeDisplayValue = (value) => {
    if (value === undefined || value === null || value === '') return 'Empty';
    return String(value);
  };

  const toFieldLabel = (value) => {
    if (!value) return 'field';
    return String(value).replace(/_/g, ' ');
  };

  if (action === 'field_changed' || action === 'status_changed') {
    const fieldLabel = details.fieldLabel || toFieldLabel(details.field);
    const fromValue = normalizeDisplayValue(details.from ?? details.oldValue);
    const toValue = normalizeDisplayValue(details.to ?? details.newValue);
    return `${user} changed ${fieldLabel} from ${fromValue} to ${toValue}`;
  }

  if (action === 'subtask_changed') {
    const title = details.title ? `"${details.title}"` : 'a subtask';
    const fromValue = normalizeDisplayValue(details.from);
    const toValue = normalizeDisplayValue(details.to);
    return `${user} changed ${title} from ${fromValue} to ${toValue}`;
  }

  if (action === 'record_linked') {
    const rawModuleKey = String(details.relatedModuleKey || details.moduleKey || '').toLowerCase();
    const moduleLabel = ({
      project: 'project',
      projects: 'project',
      event: 'event',
      events: 'event',
      deal: 'deal',
      deals: 'deal',
      form: 'form',
      forms: 'form'
    })[rawModuleKey] || 'record';
    const relatedRecordId = String(details.relatedRecordId || details.recordId || '').trim();
    const idSuffix = relatedRecordId ? ` (${relatedRecordId.slice(-8)})` : '';
    return `${user} linked a ${moduleLabel}${idSuffix}`;
  }

  // Format legacy actions
  const actionMap = {
    created: 'created this task',
    updated: 'updated this task',
    assigned: `assigned to ${details.assignedTo || 'user'}`,
    commented: 'added a comment'
  };

  const actionText = actionMap[action] || action.replace(/_/g, ' ');
  return `${user} ${actionText}`;
};

const normalizeStatusOption = (option) => {
  if (typeof option === 'string') {
    const value = option.trim();
    if (!value) return null;
    const normalizedKey = value.toLowerCase().replace(/\s+/g, '_');
    return {
      value,
      label: formatStatus(value) || value,
      enabled: true,
      color: DEFAULT_TASK_STATUS_COLOR_MAP[normalizedKey] || null
    };
  }

  if (!option || typeof option !== 'object') return null;

  const value = String(option.value ?? option.key ?? option.id ?? '').trim();
  if (!value) return null;

  const label = String(option.label ?? option.name ?? formatStatus(value) ?? value).trim();
  const enabled = option.enabled !== false;
  const normalizedKey = value.toLowerCase().replace(/\s+/g, '_');
  const color = typeof option.color === 'string' && option.color.trim()
    ? option.color.trim()
    : (DEFAULT_TASK_STATUS_COLOR_MAP[normalizedKey] || null);

  return { value, label: label || value, enabled, color };
};

const normalizePriorityOption = (option) => {
  if (typeof option === 'string') {
    const value = option.trim();
    if (!value) return null;
    const normalizedKey = value.toLowerCase().replace(/\s+/g, '_');
    return {
      value,
      label: formatPriority(value) || value,
      enabled: true,
      color: DEFAULT_TASK_PRIORITY_COLOR_MAP[normalizedKey] || null
    };
  }

  if (!option || typeof option !== 'object') return null;

  const value = String(option.value ?? option.key ?? option.id ?? '').trim();
  if (!value) return null;

  const label = String(option.label ?? option.name ?? formatPriority(value) ?? value).trim();
  const enabled = option.enabled !== false;
  const normalizedKey = value.toLowerCase().replace(/\s+/g, '_');
  const color = typeof option.color === 'string' && option.color.trim()
    ? option.color.trim()
    : (DEFAULT_TASK_PRIORITY_COLOR_MAP[normalizedKey] || null);

  return { value, label: label || value, enabled, color };
};

const fetchTaskLifecycleFieldOptions = async () => {
  try {
    const response = await apiClient.get('/modules');
    const modules = Array.isArray(response)
      ? response
      : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.data?.data)
          ? response.data.data
          : Array.isArray(response?.modules)
            ? response.modules
            : Array.isArray(response?.data?.modules)
              ? response.data.modules
              : [];
    const tasksModule = modules.find(module => String(module?.key || '').toLowerCase() === 'tasks');
    taskModuleDefinition.value = tasksModule || null;
    const taskFields = Array.isArray(tasksModule?.fields) ? tasksModule.fields : [];

    const statusField = taskFields.find(field => String(field?.key || '').toLowerCase() === 'status');
    const statusRawOptions = Array.isArray(statusField?.options) ? statusField.options : [];
    const priorityField = taskFields.find(field => String(field?.key || '').toLowerCase() === 'priority');
    const priorityRawOptions = Array.isArray(priorityField?.options) ? priorityField.options : [];

    const normalizedStatus = statusRawOptions
      .map(normalizeStatusOption)
      .filter(Boolean);

    const normalizedPriority = priorityRawOptions
      .map(normalizePriorityOption)
      .filter(Boolean);

    taskStatusFieldOptions.value = normalizedStatus;
    taskPriorityFieldOptions.value = normalizedPriority;
  } catch (err) {
    console.error('Error fetching task lifecycle field options:', err);
    taskModuleDefinition.value = null;
  }
};

const fetchCustomFields = async () => {
  if (!task.value) return;
  try {
    const response = await apiClient(`/tasks/${task.value._id}/custom-fields`);
    if (response.success) {
      customFields.value = response.data || [];
    }
  } catch (err) {
    // If 404, endpoint doesn't exist yet - that's okay, just use empty array
    if (err.status !== 404 && !err.is404) {
      console.error('Error fetching custom fields:', err);
    }
    customFields.value = [];
  }
};

const fetchUsers = async () => {
  try {
    const response = await apiClient.get('/users/list');
    if (response.success && Array.isArray(response.data)) {
      users.value = response.data;
    } else if (Array.isArray(response)) {
      users.value = response;
    } else {
      users.value = [];
    }
  } catch (err) {
    console.error('Error fetching users:', err);
    users.value = [];
  }
};

// Scroll activity feed (inside RecordActivityTimeline) to bottom (newest at bottom, chat-style)
// options.behavior: 'smooth' for tab open, 'auto' for new comment / data updates
const scrollActivityToBottom = (options = {}) => {
  const behavior = options.behavior ?? 'auto';
  nextTick(() => {
    const feedEl = activityTimelineRef.value?.feedEl;
    const el = feedEl?.value ?? feedEl;
    if (!el) return;
    const top = el.scrollHeight;
    if (behavior === 'smooth') {
      el.scrollTo({ top, behavior: 'smooth' });
    } else {
      el.scrollTop = top;
    }
  });
};

const scrollActivityToTop = (options = {}) => {
  const behavior = options.behavior ?? 'auto';
  nextTick(() => {
    const feedEl = activityTimelineRef.value?.feedEl;
    const el = feedEl?.value ?? feedEl;
    if (!el) return;
    if (behavior === 'smooth') {
      el.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      el.scrollTop = 0;
    }
  });
};

const openCommentThread = (event) => {
  if (!event || event.type !== 'comment') return;
  const rootId = getThreadRootCommentId(event);
  if (!rootId) return;
  activeThreadRootCommentId.value = rootId;
  closeCommentReactionPicker();
  handleHideCommentReactionTooltip();
  nextTick(() => {
    scrollActivityToTop();
  });
};

const closeCommentThread = () => {
  activeThreadRootCommentId.value = null;
  nextTick(() => {
    scrollActivityToBottom();
  });
};

// When Activity tab becomes visible (timeline ref is set): wait for layout, scroll feed to bottom, then reveal (no jitter)
watch(activityTimelineRef, (comp) => {
  if (!comp) {
    activityPaneReady.value = false;
    return;
  }
  activityPaneReady.value = false;
  nextTick(() => {
    const feedEl = comp.feedEl?.value ?? comp.feedEl;
    if (!feedEl) {
      activityPaneReady.value = true;
      return;
    }
    // Wait two frames so inner content has finished layout and scrollHeight is final
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        feedEl.scrollTop = isThreadViewActive.value ? 0 : feedEl.scrollHeight;
        requestAnimationFrame(() => {
          setTimeout(() => {
            activityPaneReady.value = true;
          }, 0);
        });
      });
    });
  });
}, { immediate: true });

const handleAddComment = async (payload) => {
  const content = typeof payload === 'string' ? payload.trim() : (payload?.content ?? '').trim();
  const files = typeof payload === 'object' && Array.isArray(payload?.files) ? payload.files : [];
  if (!task.value || (!content && files.length === 0)) return;
  try {
    const attachments = [];
    const token = authStore.user?.token;
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch(`/api/tasks/${task.value._id}/comment-attachments`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });
      if (uploadRes.ok) {
        const result = await uploadRes.json();
        if (result.success && result.url) {
          attachments.push({
            url: result.url,
            filename: result.originalname || file.name,
            size: result.size ?? file.size,
            mimetype: result.mimetype || file.type
          });
        }
      } else {
        const errData = await uploadRes.json().catch(() => ({}));
        console.error('Comment attachment upload failed:', uploadRes.status, errData.error || errData.message || uploadRes.statusText);
      }
    }
    const response = await apiClient.post(`/tasks/${task.value._id}/comments`, {
      content: content || 'Attached file(s)',
      attachments: attachments.length > 0 ? attachments : undefined,
      parentCommentId: isThreadViewActive.value ? activeThreadRootCommentId.value : undefined
    });
    if (response.success) {
      await fetchActivityEvents();
      scrollActivityToBottom();
    }
  } catch (err) {
    console.error('Error adding comment:', err);
  }
};

const canEditComment = (event) => {
  if (event.type !== 'comment') return false;
  const authorId = event.author?._id || event.author?.id;
  return authorId && authStore.user?._id && String(authorId) === String(authStore.user._id);
};

const startEditComment = (event) => {
  editingCommentId.value = event.id;
  const initialText = event.content || event.text || '';
  const initialAttachments = Array.isArray(event.attachments)
    ? event.attachments.map((attachment) => ({ ...attachment }))
    : [];
  editingCommentText.value = initialText;
  editingCommentAttachments.value = initialAttachments;
  editingCommentOriginalText.value = initialText;
  editingCommentOriginalAttachments.value = initialAttachments.map((attachment) => ({ ...attachment }));
  editingCommentHasPendingFiles.value = false;
};

const cancelEditComment = () => {
  editingCommentId.value = null;
  editingCommentText.value = '';
  editingCommentAttachments.value = [];
  editingCommentOriginalText.value = '';
  editingCommentOriginalAttachments.value = [];
  editingCommentHasPendingFiles.value = false;
  editCommentInputRef.value = null;
};

const handleEditCommentFilesChange = (files) => {
  editingCommentHasPendingFiles.value = Array.isArray(files) && files.length > 0;
};

const normalizeCommentTextForCompare = (value) => (
  typeof value === 'string' ? value.trim() : ''
);

const normalizeCommentAttachmentForCompare = (attachment) => ({
  url: attachment?.url || '',
  filename: attachment?.filename || attachment?.name || '',
  size: Number(attachment?.size) || 0,
  mimetype: attachment?.mimetype || attachment?.type || ''
});

const areCommentAttachmentListsEqual = (left, right) => {
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (left.length !== right.length) return false;
  return left.every((attachment, idx) => {
    const normalizedLeft = normalizeCommentAttachmentForCompare(attachment);
    const normalizedRight = normalizeCommentAttachmentForCompare(right[idx]);
    return normalizedLeft.url === normalizedRight.url
      && normalizedLeft.filename === normalizedRight.filename
      && normalizedLeft.size === normalizedRight.size
      && normalizedLeft.mimetype === normalizedRight.mimetype;
  });
};

const isEditingCommentDirty = computed(() => {
  if (!editingCommentId.value) return false;
  const textChanged = normalizeCommentTextForCompare(editingCommentText.value) !== normalizeCommentTextForCompare(editingCommentOriginalText.value);
  const attachmentsChanged = !areCommentAttachmentListsEqual(editingCommentAttachments.value, editingCommentOriginalAttachments.value);
  return textChanged || attachmentsChanged || editingCommentHasPendingFiles.value;
});

const isEditCommentSubmitPayload = (payload) => (
  Boolean(payload)
  && typeof payload === 'object'
  && (
    typeof payload.content === 'string'
    || Array.isArray(payload.files)
    || Array.isArray(payload.existingAttachments)
  )
);

const getEditCommentInputInstance = () => {
  const currentRef = editCommentInputRef.value;
  if (Array.isArray(currentRef)) return currentRef[0] || null;
  return currentRef || null;
};

const handleSaveEditCommentClick = () => {
  const payload = getEditCommentInputInstance()?.getSubmitPayload?.();
  saveEditComment(isEditCommentSubmitPayload(payload) ? payload : undefined);
};

const saveEditComment = async (submitPayload) => {
  if (!task.value || !editingCommentId.value) return;
  if (!isEditingCommentDirty.value) return;
  try {
    const fallbackPayload = getEditCommentInputInstance()?.getSubmitPayload?.();
    const resolvedPayload = isEditCommentSubmitPayload(submitPayload)
      ? submitPayload
      : (isEditCommentSubmitPayload(fallbackPayload) ? fallbackPayload : null);

    const rawContent = typeof resolvedPayload?.content === 'string'
      ? resolvedPayload.content
      : editingCommentText.value;
    const content = rawContent.trim();
    const files = Array.isArray(resolvedPayload?.files) ? resolvedPayload.files : [];
    const existingAttachments = Array.isArray(resolvedPayload?.existingAttachments)
      ? resolvedPayload.existingAttachments
      : editingCommentAttachments.value;

    const uploadedAttachments = [];
    const token = authStore.user?.token;
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch(`/api/tasks/${task.value._id}/comment-attachments`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });
      if (uploadRes.ok) {
        const result = await uploadRes.json();
        if (result.success && result.url) {
          uploadedAttachments.push({
            url: result.url,
            filename: result.originalname || file.name,
            size: result.size ?? file.size,
            mimetype: result.mimetype || file.type
          });
        }
      } else {
        const errData = await uploadRes.json().catch(() => ({}));
        console.error('Comment attachment upload failed:', uploadRes.status, errData.error || errData.message || uploadRes.statusText);
      }
    }

    const finalAttachments = [
      ...(Array.isArray(existingAttachments) ? existingAttachments : []),
      ...uploadedAttachments
    ].filter((attachment) => attachment && typeof attachment.url === 'string' && typeof attachment.filename === 'string');

    const finalContent = content || (finalAttachments.length > 0 ? 'Attached file(s)' : '');
    if (!finalContent) return;

    const response = await apiClient.put(
      `/tasks/${task.value._id}/comments/${editingCommentId.value}`,
      {
        content: finalContent,
        attachments: finalAttachments
      }
    );
    if (response.success) {
      await fetchActivityEvents();
      cancelEditComment();
    }
  } catch (err) {
    console.error('Error updating comment:', err);
  }
};

const handleClose = () => {
  router.push('/tasks');
};

const handleShowMore = (event) => {
  // TODO: Implement show more functionality
  console.log('Show more for event:', event.id);
};

// Format helpers
const formatStatus = (status) => {
  if (!status) return null;
  const configured = findConfiguredStatusOption(status);
  if (configured?.label) return configured.label;
  const map = {
    todo: 'To Do',
    in_progress: 'In Progress',
    waiting: 'Waiting',
    completed: 'Completed',
    cancelled: 'Cancelled'
  };
  return map[status] || status;
};

const getStatusPillClass = (status) => {
  const configured = findConfiguredStatusOption(status);
  if (configured?.color) return '';
  return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-100';
};

const getStatusPillDividerClass = (status) => {
  const configured = findConfiguredStatusOption(status);
  if (configured?.color) return '';
  return 'border-gray-300 dark:border-gray-500';
};

const hexToRgb = (hex) => {
  const normalized = String(hex || '').trim().replace('#', '');
  if (!/^[0-9a-fA-F]{3,8}$/.test(normalized)) return null;

  if (normalized.length === 3) {
    const [r, g, b] = normalized.split('').map(char => parseInt(char + char, 16));
    return { r, g, b };
  }

  if (normalized.length >= 6) {
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16)
    };
  }

  return null;
};

const getStatusTextColor = (bgColor) => {
  const rgb = hexToRgb(bgColor);
  if (!rgb) return '#ffffff';
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.62 ? '#111827' : '#ffffff';
};

const getStatusPillStyle = (status) => {
  const configured = findConfiguredStatusOption(status);
  if (!configured?.color) return null;

  return {
    backgroundColor: configured.color,
    color: getStatusTextColor(configured.color)
  };
};

const getStatusPillDividerStyle = (status) => {
  const configured = findConfiguredStatusOption(status);
  if (!configured?.color) return null;

  const textColor = getStatusTextColor(configured.color);
  return {
    borderColor: textColor === '#111827' ? 'rgba(17, 24, 39, 0.28)' : 'rgba(255, 255, 255, 0.35)'
  };
};

const normalizeStatusLookupKey = (value) => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
};

const findConfiguredStatusOption = (status) => {
  if (!status) return null;
  const raw = String(status).trim();
  if (!raw) return null;

  const options = statusSelectOptions.value || [];

  const exact = options.find(option => String(option?.value || '') === raw);
  if (exact) return exact;

  const normalizedRaw = normalizeStatusLookupKey(raw);
  if (!normalizedRaw) return null;

  return options.find(option => {
    const valueKey = normalizeStatusLookupKey(option?.value);
    const labelKey = normalizeStatusLookupKey(option?.label);
    return valueKey === normalizedRaw || labelKey === normalizedRaw;
  }) || null;
};

const formatPriority = (priority) => {
  if (!priority) return null;
  const configured = findConfiguredPriorityOption(priority);
  if (configured?.label) return configured.label;
  return priority.charAt(0).toUpperCase() + priority.slice(1);
};

const getPriorityTextClass = (priority) => {
  if (!priority) return 'text-gray-400 dark:text-gray-500';
  return 'text-gray-900 dark:text-white';
};

const getPriorityFlagStyle = (priority) => {
  if (!priority) return null;
  const configured = findConfiguredPriorityOption(priority);
  const normalizedKey = normalizeStatusLookupKey(priority);
  const color = configured?.color || DEFAULT_TASK_PRIORITY_COLOR_MAP[normalizedKey] || null;
  return color ? { color } : null;
};

const findConfiguredPriorityOption = (priority) => {
  if (!priority) return null;
  const raw = String(priority).trim();
  if (!raw) return null;

  const options = prioritySelectOptions.value || [];
  const exact = options.find(option => String(option?.value || '') === raw);
  if (exact) return exact;

  const normalizedRaw = normalizeStatusLookupKey(raw);
  if (!normalizedRaw) return null;

  return options.find(option => {
    const valueKey = normalizeStatusLookupKey(option?.value);
    const labelKey = normalizeStatusLookupKey(option?.label);
    return valueKey === normalizedRaw || labelKey === normalizedRaw;
  }) || null;
};

const formatDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  // Show relative time for recent items
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'min' : 'mins'}`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'}`;
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
  
  // Show full date with time for older items
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

const formatCreatedDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const formatStateDate = (date) => {
  if (!date) return null;
  return new Date(date).toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit'
  });
};

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const getAttachmentName = (attachment) => {
  if (!attachment) return 'Attachment';
  return attachment.name || attachment.filename || 'Attachment';
};

const getAttachmentUrl = (attachment) => {
  if (!attachment) return '#';
  return attachment.url || attachment.href || '#';
};

const hasAttachmentUrl = (attachment) => {
  const url = getAttachmentUrl(attachment);
  return Boolean(url && url !== '#');
};

const downloadAttachment = (attachment) => {
  const url = getAttachmentUrl(attachment);
  if (!url || url === '#') return;

  const link = document.createElement('a');
  link.href = url;
  link.download = getAttachmentName(attachment) || 'attachment';
  link.rel = 'noopener noreferrer';
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const commentReactionPickerStyle = computed(() => ({
  top: `${commentReactionPickerPosition.value.top}px`,
  left: `${commentReactionPickerPosition.value.left}px`
}));

const commentReactionTooltipStyle = computed(() => ({
  top: `${commentReactionTooltipPosition.value.top}px`,
  left: `${commentReactionTooltipPosition.value.left}px`
}));

const getCommentReactionKey = (event) => {
  const key = event?.id || event?._id || event?.createdAt;
  return key ? String(key) : '';
};

const setCommentReactionButtonRef = (event, el) => {
  const key = getCommentReactionKey(event);
  if (!key) return;
  if (el) {
    commentReactionButtonRefs.set(key, el);
    return;
  }
  commentReactionButtonRefs.delete(key);
};

const updateCommentReactionPickerPosition = () => {
  if (!showCommentReactionPicker.value || !commentReactionPickerCommentKey.value) return;
  const anchor = commentReactionButtonRefs.get(commentReactionPickerCommentKey.value);
  if (!anchor) return;

  const rect = anchor.getBoundingClientRect();
  const pickerWidth = commentReactionPickerRef.value?.offsetWidth || 304;
  const pickerHeight = commentReactionPickerRef.value?.offsetHeight || 44;
  const spaceAbove = rect.top;
  const spaceBelow = window.innerHeight - rect.bottom;

  let top;
  if (spaceAbove >= pickerHeight + 8 || spaceAbove >= spaceBelow) {
    top = rect.top - pickerHeight - 6;
  } else {
    top = rect.bottom + 6;
  }
  top = Math.max(8, Math.min(top, window.innerHeight - pickerHeight - 8));

  let left = rect.left;
  left = Math.max(8, Math.min(left, window.innerWidth - pickerWidth - 8));

  commentReactionPickerPosition.value = { top, left };
};

const closeCommentReactionPicker = () => {
  showCommentReactionPicker.value = false;
  commentReactionPickerCommentKey.value = '';
};

const openCommentReactionPicker = (event) => {
  const key = getCommentReactionKey(event);
  if (!key) return;
  commentReactionPickerCommentKey.value = key;
  showCommentReactionPicker.value = true;
  nextTick(() => {
    updateCommentReactionPickerPosition();
    requestAnimationFrame(() => updateCommentReactionPickerPosition());
  });
};

const toggleCommentReactionPicker = (event) => {
  const key = getCommentReactionKey(event);
  if (!key) return;
  if (showCommentReactionPicker.value && commentReactionPickerCommentKey.value === key) {
    closeCommentReactionPicker();
    return;
  }
  openCommentReactionPicker(event);
};

const normalizeReactionUser = (reactor) => {
  if (!reactor) return null;
  if (typeof reactor === 'string') {
    return { id: reactor, name: reactor, avatar: '' };
  }
  const rawId = reactor.id || reactor._id || reactor.userId || '';
  const rawName = reactor.name || [reactor.firstName, reactor.lastName].filter(Boolean).join(' ').trim() || reactor.username || reactor.email || '';
  if (!rawId && !rawName) return null;
  return {
    id: rawId ? String(rawId) : String(rawName).toLowerCase(),
    name: rawName || 'Unknown',
    avatar: reactor.avatar || ''
  };
};

const mergeReactionUsers = (existingUsers = [], incomingUsers = []) => {
  const merged = [];
  const seen = new Set();
  [...existingUsers, ...incomingUsers].forEach((reactor) => {
    const normalized = normalizeReactionUser(reactor);
    if (!normalized) return;
    const key = `${normalized.id}|${normalized.name}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(normalized);
  });
  return merged;
};

const isCurrentReactionUser = (reactor) => {
  const currentUserId = String(authStore.user?._id || authStore.user?.id || '');
  if (!currentUserId) return false;
  return String(reactor?.id || '') === currentUserId;
};

const getReactionUserDisplayName = (reactor) => {
  if (!reactor) return 'Unknown';
  return isCurrentReactionUser(reactor) ? 'You' : (reactor.name || 'Unknown');
};

const getReactionUserInitial = (reactor) => {
  const name = getReactionUserDisplayName(reactor);
  const firstChar = (name || '?').trim().charAt(0);
  return (firstChar || '?').toUpperCase();
};

const getReactionTooltipMode = (tooltipData) => {
  const count = Number(tooltipData?.count || 0);
  if (count <= 1) return 'single';
  if (count <= 7) return 'few';
  return 'many';
};

const getReactionTooltipSingleText = (tooltipData) => {
  if (!tooltipData) return '';
  const firstReactor = (tooltipData.reactors || [])[0] || null;
  const who = firstReactor ? getReactionUserDisplayName(firstReactor) : 'Someone';
  return `${who} reacted with ${tooltipData.emoji}`;
};

const getReactionTooltipInlineText = (tooltipData) => {
  if (!tooltipData) return '';
  const names = (tooltipData.reactors || []).slice(0, 7).map(getReactionUserDisplayName);
  if (!names.length) return `People reacted with ${tooltipData.emoji}`;
  return `${names.join(', ')} reacted with ${tooltipData.emoji}`;
};

const updateCommentReactionTooltipPosition = () => {
  if (!showCommentReactionTooltip.value || !commentReactionTooltipAnchorEl.value) return;
  const anchorRect = commentReactionTooltipAnchorEl.value.getBoundingClientRect();
  const mode = getReactionTooltipMode(commentReactionTooltipData.value);
  const fallbackWidth = mode === 'single' ? 160 : 272;
  const fallbackHeight = mode === 'single' ? 88 : (mode === 'few' ? 116 : 188);
  const tooltipWidth = commentReactionTooltipRef.value?.offsetWidth || fallbackWidth;
  const tooltipHeight = commentReactionTooltipRef.value?.offsetHeight || fallbackHeight;
  const spaceAbove = anchorRect.top;
  const spaceBelow = window.innerHeight - anchorRect.bottom;

  let top = 0;
  let placement = 'above';
  if (spaceAbove >= tooltipHeight + 10 || spaceAbove >= spaceBelow) {
    top = anchorRect.top - tooltipHeight - 8;
    placement = 'above';
  } else {
    top = anchorRect.bottom + 8;
    placement = 'below';
  }

  let left = anchorRect.left + (anchorRect.width / 2) - (tooltipWidth / 2);
  left = Math.max(8, Math.min(left, window.innerWidth - tooltipWidth - 8));
  top = Math.max(8, Math.min(top, window.innerHeight - tooltipHeight - 8));

  commentReactionTooltipPlacement.value = placement;
  commentReactionTooltipPosition.value = { top, left };
};

const cancelCommentReactionTooltipHide = () => {
  if (!commentReactionTooltipHideTimer) return;
  clearTimeout(commentReactionTooltipHideTimer);
  commentReactionTooltipHideTimer = null;
};

const cancelCommentReactionTooltipShow = () => {
  if (!commentReactionTooltipShowTimer) return;
  clearTimeout(commentReactionTooltipShowTimer);
  commentReactionTooltipShowTimer = null;
};

const handleShowCommentReactionTooltip = (domEvent, reaction) => {
  cancelCommentReactionTooltipShow();
  cancelCommentReactionTooltipHide();
  const reactors = mergeReactionUsers([], reaction?.reactors || []);
  const sortedReactors = reactors.sort((a, b) => {
    const aIsMe = isCurrentReactionUser(a);
    const bIsMe = isCurrentReactionUser(b);
    if (aIsMe && !bIsMe) return -1;
    if (!aIsMe && bIsMe) return 1;
    return getReactionUserDisplayName(a).localeCompare(getReactionUserDisplayName(b));
  });

  commentReactionTooltipData.value = {
    emoji: reaction?.emoji || '',
    count: Number(reaction?.count || sortedReactors.length || 0),
    reactors: sortedReactors
  };
  commentReactionTooltipAnchorEl.value = domEvent?.currentTarget || null;

  const reveal = () => {
    showCommentReactionTooltip.value = true;
    nextTick(() => {
      updateCommentReactionTooltipPosition();
      requestAnimationFrame(() => updateCommentReactionTooltipPosition());
    });
  };

  if (showCommentReactionTooltip.value) {
    reveal();
    return;
  }

  commentReactionTooltipShowTimer = setTimeout(() => {
    commentReactionTooltipShowTimer = null;
    reveal();
  }, COMMENT_REACTION_TOOLTIP_SHOW_DELAY_MS);
};

const handleHideCommentReactionTooltip = () => {
  cancelCommentReactionTooltipShow();
  cancelCommentReactionTooltipHide();
  commentReactionTooltipHideTimer = setTimeout(() => {
    showCommentReactionTooltip.value = false;
    commentReactionTooltipData.value = null;
    commentReactionTooltipAnchorEl.value = null;
    commentReactionTooltipHideTimer = null;
  }, 90);
};

const updateCommentEventReactions = (commentId, updatedComment) => {
  if (!commentId || !updatedComment) return;
  const commentIdString = String(commentId);
  activityEvents.value = activityEvents.value.map((event) => {
    if (event.type !== 'comment') return event;
    const eventId = String(event.id || event._id || '');
    if (eventId !== commentIdString) return event;

    return {
      ...event,
      reactions: updatedComment.reactions || updatedComment.reactionSummary || [],
      myReactions: Array.isArray(updatedComment.myReactions) ? updatedComment.myReactions : [],
      likesCount: updatedComment.likesCount ?? event.likesCount
    };
  });
};

const findCommentEventByKey = (commentKey) => (
  activityEvents.value.find((event) => event.type === 'comment' && getCommentReactionKey(event) === commentKey) || null
);

const getCommentMyReactions = (event) => {
  const raw = Array.isArray(event?.myReactions) ? event.myReactions : [];
  return raw
    .map((value) => normalizeReactionEmoji(value) || toReactionEmoji(value))
    .filter(Boolean);
};

const isCommentReactionSelectedByKey = (commentKey, emoji) => {
  const event = findCommentEventByKey(commentKey);
  if (!event) return false;
  return getCommentMyReactions(event).includes(emoji);
};

const isCommentReactionSelected = (event, emoji) => {
  if (!event || !emoji) return false;
  return getCommentMyReactions(event).includes(emoji);
};

const toggleCommentReactionByKey = async (commentKey, emoji) => {
  if (!commentKey || !emoji) return;
  const event = findCommentEventByKey(commentKey);
  if (!event) return;
  await toggleCommentReaction(event, emoji);
};

const toggleCommentReaction = async (event, emoji) => {
  const commentId = event?.id || event?._id;
  const normalizedEmoji = normalizeReactionEmoji(emoji);
  if (!task.value?._id || !commentId || !normalizedEmoji) return;

  try {
    const response = await apiClient.post(
      `/tasks/${task.value._id}/comments/${commentId}/reactions`,
      { emoji: normalizedEmoji }
    );
    if (response?.success && response.data) {
      updateCommentEventReactions(commentId, response.data);
    }
  } catch (error) {
    console.error('Error toggling comment reaction:', error);
  }
};

const addCommentReactionFromPicker = async (emoji) => {
  const key = commentReactionPickerCommentKey.value;
  if (!key || !emoji) return;
  if (!isCommentReactionSelectedByKey(key, emoji)) {
    await toggleCommentReactionByKey(key, emoji);
  }
  closeCommentReactionPicker();
};

const handleCommentReactionPickerOutsideClick = (event) => {
  if (!showCommentReactionPicker.value) return;
  const target = event.target;
  if (commentReactionPickerRef.value?.contains(target)) return;
  const activeButton = commentReactionButtonRefs.get(commentReactionPickerCommentKey.value);
  if (activeButton?.contains(target)) return;
  closeCommentReactionPicker();
};

const REACTION_KEY_TO_EMOJI = Object.freeze({
  like: '👍',
  likes: '👍',
  thumbsup: '👍',
  thumbs_up: '👍',
  'thumbs-up': '👍',
  love: '❤️',
  heart: '❤️',
  laugh: '😂',
  joy: '😂',
  smile: '🙂',
  wow: '😮',
  celebrate: '🎉',
  tada: '🎉',
  rocket: '🚀',
  clap: '👏',
  thinking: '🤔',
  party: '🥳',
  fire: '🔥'
});

const normalizeReactionEmoji = (value) => String(value || '').trim();
const normalizeReactionKey = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, '_');

const coerceReactionCount = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') {
    if (typeof value.count === 'number' && Number.isFinite(value.count)) return value.count;
    if (typeof value.total === 'number' && Number.isFinite(value.total)) return value.total;
    if (Array.isArray(value.users)) return value.users.length;
    if (Array.isArray(value.userIds)) return value.userIds.length;
    if (Array.isArray(value.reactors)) return value.reactors.length;
  }
  return 0;
};

const toReactionEmoji = (value) => {
  const key = normalizeReactionKey(value);
  if (!key) return '';
  if (REACTION_KEY_TO_EMOJI[key]) return REACTION_KEY_TO_EMOJI[key];
  if (/[^\x00-\x7F]/.test(key)) return String(value);
  return '';
};

const getCommentReactions = (event) => {
  if (!event || event.type !== 'comment') return [];

  const merged = new Map();
  const upsert = (emoji, count, reactors = []) => {
    const normalizedEmoji = normalizeReactionEmoji(emoji);
    if (!normalizedEmoji) return;
    const normalizedCount = Math.max(0, Number(count) || 0);
    const existing = merged.get(normalizedEmoji) || { count: 0, reactors: [] };
    const nextCount = existing.count + normalizedCount;
    const nextReactors = mergeReactionUsers(existing.reactors, reactors);
    if (!nextCount && !nextReactors.length) {
      merged.delete(normalizedEmoji);
      return;
    }
    merged.set(normalizedEmoji, {
      count: nextCount,
      reactors: nextReactors
    });
  };

  const reactions = event.reactions;
  if (Array.isArray(reactions)) {
    reactions.forEach((reaction) => {
      if (!reaction) return;
      const emoji = reaction.emoji || reaction.reaction || toReactionEmoji(reaction.type || reaction.name || reaction.key);
      const count = coerceReactionCount(reaction.count ?? reaction.total ?? reaction.users ?? reaction.userIds ?? reaction.reactors);
      const reactors = reaction.reactors || reaction.users || [];
      upsert(emoji, count, reactors);
    });
  } else if (reactions && typeof reactions === 'object') {
    Object.entries(reactions).forEach(([key, value]) => {
      if (!value) return;
      const emoji = value.emoji || value.reaction || toReactionEmoji(key);
      const count = coerceReactionCount(value);
      const reactors = value.reactors || value.users || [];
      upsert(emoji, count, reactors);
    });
  }

  const likesCount = coerceReactionCount(event.likesCount ?? event.likes);
  if (!merged.has('👍')) {
    upsert('👍', likesCount, []);
  }

  return Array.from(merged.entries())
    .map(([emoji, data]) => ({ emoji, count: data.count, reactors: data.reactors || [] }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);
};

const hasCommentReactions = (event) => getCommentReactions(event).length > 0;

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const commentMentionsCurrentUser = (event) => {
  if (!event || event.type !== 'comment') return false;
  const content = String(event.content || event.text || '');
  if (!content) return false;

  const currentUserId = authStore.user?._id || authStore.user?.id;
  if (currentUserId) {
    const mentionByIdRegex = new RegExp(`@\\[[^\\]]+\\]\\(user:${escapeRegExp(currentUserId)}\\)`, 'i');
    if (mentionByIdRegex.test(content)) return true;
  }

  // Legacy fallback for plain-text mentions without encoded IDs.
  const candidateNames = [
    [authStore.user?.firstName, authStore.user?.lastName].filter(Boolean).join(' ').trim(),
    authStore.user?.name,
    authStore.user?.username
  ].filter(Boolean);

  const lowered = content.toLowerCase();
  return candidateNames.some((name) => lowered.includes(`@${String(name).toLowerCase()}`));
};

const isImageAttachment = (attachment) => {
  if (!attachment) return false;
  const mimeType = (attachment.mimetype || attachment.mimeType || '').toLowerCase();
  if (mimeType.startsWith('image/')) return true;
  const name = getAttachmentName(attachment).toLowerCase();
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name);
};

const isSvgAttachment = (attachment) => {
  if (!attachment) return false;
  const mimeType = (attachment.mimetype || attachment.mimeType || '').toLowerCase();
  if (mimeType === 'image/svg+xml') return true;
  const name = getAttachmentName(attachment).toLowerCase();
  return name.endsWith('.svg');
};

const getAttachmentLabel = (attachment) => {
  if (!attachment) return '';
  const details = [];
  const mimeType = attachment.mimetype || attachment.mimeType;
  if (mimeType) {
    details.push(mimeType.startsWith('image/') ? 'Image' : mimeType.split('/')[1]?.toUpperCase() || 'File');
  }
  if (attachment.size) {
    details.push(formatFileSize(attachment.size));
  }
  return details.join(' • ') || 'File attachment';
};

const getInitials = (author) => {
  if (!author) return '?';
  if (typeof author === 'string') return author.substring(0, 2).toUpperCase();
  const firstName = author.firstName || author.first_name || '';
  const lastName = author.lastName || author.last_name || '';
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName[0].toUpperCase();
  if (author.email) return author.email[0].toUpperCase();
  return '?';
};

const getAuthorName = (author) => {
  if (!author) return 'Unknown';
  if (typeof author === 'string') return author;
  const firstName = author.firstName || author.first_name || '';
  const lastName = author.lastName || author.last_name || '';
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;
  if (author.username) return author.username;
  if (author.email) return author.email;
  return 'Unknown';
};

const formatSystemEvent = (event) => {
  if (event.action === 'created') {
    return `You created this task${event.source ? ` by copying ${event.source}` : ''}`;
  }
  return `${event.action || 'updated'} this record`;
};

const getSystemEventMessage = (event) => {
  if (!event) return 'Updated this record';
  const message = (event.message || '').trim();
  if (message) return message;
  return formatSystemEvent(event);
};

const getAssignedToDisplay = (assignedTo) => {
  if (!assignedTo) return null;
  if (typeof assignedTo === 'object') {
    return getUserDisplayName(assignedTo);
  }
  return null;
};

const getUserDisplayName = (user) => {
  if (!user) return null;
  const name = [user.firstName || user.first_name, user.lastName || user.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  return name || user.username || user.email || user._id || 'Unknown';
};

const computeSignals = (task) => {
  if (!task) return [];
  const signals = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (task.dueDate && task.status !== 'completed') {
    const due = new Date(task.dueDate);
    due.setHours(0, 0, 0, 0);
    if (due < today) {
      signals.push('Overdue');
    } else if (due.getTime() === today.getTime()) {
      signals.push('Due today');
    }
  }
  
  if (!task.assignedTo) {
    signals.push('Unassigned');
  }
  
  return signals;
};

const getNextActionHint = (task) => {
  if (!task) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (task.dueDate && task.status !== 'completed') {
    const due = new Date(task.dueDate);
    due.setHours(0, 0, 0, 0);
    if (due < today) {
      return 'Complete or reschedule';
    }
  }
  return null;
};

const formatEventActor = (event) => {
  if (event.actor) {
    if (typeof event.actor === 'object') {
      return getUserDisplayName(event.actor) || 'System';
    }
    return event.actor;
  }
  return 'System';
};

const formatEventAction = (event) => {
  const action = event.action || event.type || 'updated';
  return action.replace(/_/g, ' ');
};

// Event handlers
const handleTitleSave = async (newTitle) => {
  if (!task.value || !canEditTask.value) return;
  
  try {
    const response = await apiClient.put(`/tasks/${task.value._id}`, {
      title: newTitle
    });
    
    if (response.success && response.data) {
      task.value.title = newTitle;
      // Optionally update tab title if needed
      // updateTabTitle(activeTabId.value, newTitle);
    }
  } catch (err) {
    console.error('Error updating task title:', err);
    // Revert to original title on error
    // The EditableTitle component will handle this via the prop update
  }
};

const handleFieldSave = async (fieldName, newValue) => {
  if (!task.value || !canEditTask.value) return;
  
  try {
    const updateData = { [fieldName]: newValue };
    const response = await apiClient.put(`/tasks/${task.value._id}`, updateData);
    
    if (response.success && response.data) {
      // Update local state
      if (fieldName === 'assignedTo') {
        // If newValue is a user ID, find the user object
        if (newValue && typeof newValue === 'string') {
          const user = users.value.find(u => u._id === newValue);
          task.value[fieldName] = user || newValue;
        } else {
          task.value[fieldName] = newValue;
        }
      } else {
        task.value[fieldName] = newValue;
      }
    }
  } catch (err) {
    console.error(`Error updating task ${fieldName}:`, err);
    // Refresh task data to revert changes
    await fetchTask();
  }
};

// Watch task description to update local description
watch(() => task.value?.description, (newDesc) => {
  if (!isEditingDescription.value) {
    localDescription.value = newDesc || '';
  }
  isDescriptionExpanded.value = false;
});

// Watch task tags to update local tags
watch(() => task.value?.tags, (newTags) => {
  mergeTagDefinitions(Array.isArray(newTags) ? newTags : []);
}, { deep: true });

// Note: We no longer scroll on every activityEvents change to avoid jitter when opening the tab.
// Scrolling happens when: (1) Activity tab is shown (ref watcher), (2) User adds a comment (handleAddComment).

// Initialize local description
watch(() => task.value, (newTask) => {
  if (newTask) {
    localDescription.value = newTask.description || '';
    showAllDetails.value = false;
    showAllSubtasks.value = false;
    subtasksRenderLimit.value = 20;
    isDescriptionExpanded.value = false;
    expandedLeftSection.value = null;
  }
}, { immediate: true });

const startEditDescription = () => {
  const el = descriptionDisplayRef.value;
  descriptionMinHeight.value = el?.offsetHeight ?? null;
  isEditingDescription.value = true;
};

const handleDescriptionBlur = async () => {
  if (!isEditingDescription.value) return;

  const trimmedDescription = localDescription.value.trim();
  const originalDescription = task.value?.description || '';

  // Optimistic update: show new content immediately, then save in background
  if (trimmedDescription !== originalDescription) {
    task.value.description = trimmedDescription;
  }
  isEditingDescription.value = false;
  descriptionMinHeight.value = null;

  if (trimmedDescription !== originalDescription) {
    await handleFieldSave('description', trimmedDescription);
  } else {
    localDescription.value = originalDescription;
  }
};

const handleDescriptionCancel = () => {
  isEditingDescription.value = false;
  descriptionMinHeight.value = null;
  localDescription.value = task.value?.description || '';
};

// Focus textarea when editing starts
watch(isEditingDescription, async (isEditing) => {
  if (isEditing) {
    await nextTick();
    if (descriptionEditorRef.value) {
      descriptionEditorRef.value.focus();
    }
  }
});

// Initialize RecordStateSection editable fields
watch(() => task.value, (newTask) => {
  if (newTask) {
    localTimeEstimate.value = newTask.estimatedHours || 0;
    
    // Initialize dates
    if (newTask.startDate) {
      const startDate = new Date(newTask.startDate);
      localStartDate.value = startDate.toISOString().split('T')[0];
    } else {
      localStartDate.value = '';
    }
    if (newTask.dueDate) {
      const dueDate = new Date(newTask.dueDate);
      localDueDate.value = dueDate.toISOString().split('T')[0];
    } else {
      localDueDate.value = '';
    }
  }
}, { immediate: true });

// Handlers for RecordStateSection editable fields
const toIsoDateString = (dateValue) => {
  if (!dateValue) return null;
  return new Date(`${dateValue}T00:00:00`).toISOString();
};

const resetLocalStartDate = () => {
  if (task.value?.startDate) {
    localStartDate.value = new Date(task.value.startDate).toISOString().split('T')[0];
  } else {
    localStartDate.value = '';
  }
};

const resetLocalDueDate = () => {
  if (task.value?.dueDate) {
    localDueDate.value = new Date(task.value.dueDate).toISOString().split('T')[0];
  } else {
    localDueDate.value = '';
  }
};

const handleStartDateBlur = async () => {
  if (!isEditingStartDate.value) return;
  isEditingStartDate.value = false;

  const startDateISO = toIsoDateString(localStartDate.value);
  if (startDateISO !== (task.value?.startDate || null)) {
    await handleFieldSave('startDate', startDateISO);
  } else {
    resetLocalStartDate();
  }
};

const handleStartDateCancel = () => {
  isEditingStartDate.value = false;
  resetLocalStartDate();
};

const handleDueDateBlur = async () => {
  if (!isEditingDueDate.value) return;
  isEditingDueDate.value = false;

  const dueDateISO = toIsoDateString(localDueDate.value);
  if (dueDateISO !== (task.value?.dueDate || null)) {
    await handleFieldSave('dueDate', dueDateISO);
  } else {
    resetLocalDueDate();
  }
};

const handleDueDateCancel = () => {
  isEditingDueDate.value = false;
  resetLocalDueDate();
};

const handleTimeEstimateBlur = async () => {
  if (!isEditingTimeEstimate.value) return;
  isEditingTimeEstimate.value = false;
  const newValue = localTimeEstimate.value || 0;
  if (newValue !== (task.value?.estimatedHours || 0)) {
    await handleFieldSave('estimatedHours', newValue);
  } else {
    localTimeEstimate.value = task.value?.estimatedHours || 0;
  }
};

const handleTimeEstimateCancel = () => {
  isEditingTimeEstimate.value = false;
  localTimeEstimate.value = task.value?.estimatedHours || 0;
};

// Focus inputs when editing starts
watch(isEditingStartDate, async (isEditing) => {
  if (isEditing) {
    await nextTick();
    if (startDateInputRef.value) {
      startDateInputRef.value.focus();
    }
  }
});

watch(isEditingDueDate, async (isEditing) => {
  if (isEditing) {
    await nextTick();
    if (dueDateInputRef.value) {
      dueDateInputRef.value.focus();
    }
  }
});

watch(isEditingTimeEstimate, async (isEditing) => {
  if (isEditing) {
    await nextTick();
    if (timeEstimateInputRef.value) {
      timeEstimateInputRef.value.focus();
      timeEstimateInputRef.value.select();
    }
  }
});

const handleMarkComplete = async () => {
  if (!task.value || task.value.status === 'completed') return;
  try {
    await apiClient.patch(`/tasks/${task.value._id}/status`, { status: 'completed' });
    task.value.status = 'completed';
    task.value.completedDate = new Date().toISOString();
    await fetchActivityEvents();
  } catch (err) {
    console.error('Error marking complete:', err);
  }
};

const handleSubtaskToggle = async (subtask) => {
  if (!task.value) return;
  try {
    await apiClient.patch(`/tasks/${task.value._id}/subtasks/${subtask._id}`, {
      completed: !subtask.completed
    });
    subtask.completed = !subtask.completed;
  } catch (err) {
    console.error('Error toggling subtask:', err);
    subtask.completed = !subtask.completed; // Revert on error
  }
};

const startCreateSubtask = () => {
  showAllSubtasks.value = true;
  isCreatingSubtask.value = true;
  nextTick(() => {
    if (newSubtaskInputRef.value) {
      newSubtaskInputRef.value.focus();
    }
  });
};

const cancelCreateSubtask = () => {
  isCreatingSubtask.value = false;
  newSubtaskTitle.value = '';
  isSavingNewSubtask.value = false;
};

const saveNewSubtask = async () => {
  if (!task.value || isSavingNewSubtask.value) return;
  const title = newSubtaskTitle.value.trim();
  if (!title) return;

  isSavingNewSubtask.value = true;
  try {
    const existingSubtasks = Array.isArray(task.value.subtasks) ? task.value.subtasks : [];
    const normalizedSubtasks = existingSubtasks
      .filter((subtask) => subtask && typeof subtask.title === 'string' && subtask.title.trim())
      .map((subtask) => ({
        ...(subtask._id ? { _id: subtask._id } : {}),
        title: subtask.title,
        completed: Boolean(subtask.completed)
      }));

    const response = await apiClient.put(`/tasks/${task.value._id}`, {
      subtasks: [
        ...normalizedSubtasks,
        { title, completed: false }
      ]
    });

    if (response?.success && response.data) {
      task.value = response.data;
      await fetchActivityEvents();
      cancelCreateSubtask();
    }
  } catch (err) {
    console.error('Error creating subtask:', err);
  } finally {
    isSavingNewSubtask.value = false;
  }
};

const handleDeleteSubtask = async (subtaskToDelete) => {
  if (!task.value || !canEditTask.value || isDeletingSubtask.value) return;

  const existingSubtasks = Array.isArray(task.value.subtasks) ? task.value.subtasks : [];
  const targetId = String(subtaskToDelete?._id || '').trim();
  const targetTitle = String(subtaskToDelete?.title || '').trim();

  const nextSubtasksRaw = existingSubtasks.filter((subtask) => {
    if (!subtask) return false;
    if (targetId) {
      return String(subtask._id || '') !== targetId;
    }
    if (subtask === subtaskToDelete) return false;
    return String(subtask.title || '').trim() !== targetTitle || Boolean(subtask.completed) !== Boolean(subtaskToDelete?.completed);
  });

  const normalizedSubtasks = nextSubtasksRaw
    .filter((subtask) => subtask && typeof subtask.title === 'string' && subtask.title.trim())
    .map((subtask) => ({
      ...(subtask._id ? { _id: subtask._id } : {}),
      title: subtask.title,
      completed: Boolean(subtask.completed)
    }));

  isDeletingSubtask.value = true;
  deletingSubtaskId.value = targetId;
  try {
    const response = await apiClient.put(`/tasks/${task.value._id}`, {
      subtasks: normalizedSubtasks
    });

    if (response?.success && response.data) {
      task.value = response.data;
      await fetchActivityEvents();
    }
  } catch (err) {
    console.error('Error deleting subtask:', err);
  } finally {
    isDeletingSubtask.value = false;
    deletingSubtaskId.value = '';
  }
};

const handleOpenRelated = (type, id) => {
  const routes = {
    project: `/projects/${id}`,
    event: `/events/${id}`,
    deal: `/deals/${id}`,
    form: `/forms/${id}`
  };
  if (routes[type]) {
    router.push(routes[type]);
  }
};

const handleUnlinkRelated = async (type, record) => {
  if (!task.value?._id) return;

  try {
    if (type === 'project') {
      const response = await apiClient.put(`/tasks/${task.value._id}`, { projectId: null });
      if (response?.success && response.data) {
        task.value = response.data;
      }
      await fetchRelatedRecords();
      return;
    }

    const moduleKey = ({
      event: 'events',
      deal: 'deals',
      form: 'forms'
    })[type];

    if (!moduleKey) return;

    const targetRecordId = getRelatedRecordId(record);
    if (!targetRecordId) return;

    const targetAppKeyByModule = {
      events: 'platform',
      deals: 'sales',
      forms: 'platform'
    };

    await apiClient.post('/relationships/unlink', {
      relationshipKey: moduleKey,
      source: {
        appKey: 'platform',
        moduleKey: 'tasks',
        recordId: task.value._id
      },
      target: {
        appKey: targetAppKeyByModule[moduleKey],
        moduleKey,
        recordId: targetRecordId
      }
    });

    await fetchRelatedRecords();
  } catch (err) {
    console.error('Error unlinking related record:', err);
    alert('Error unlinking record. Please try again.');
  }
};

// Handle linking records from the right-side Link Record drawer (same pattern as Link Organization)
const handleLinkRecordDrawerLinked = async ({ moduleKey, ids, context }) => {
  if (!task.value || !context?.taskId || task.value._id !== context.taskId) return;
  if (!ids?.length) return;

  try {
    const normalizedModuleKey = ({
      project: 'projects',
      deal: 'deals',
      event: 'events',
      form: 'forms'
    })[moduleKey] || moduleKey;

    // Refresh related cache first, then skip records already linked for this module.
    await fetchRelatedRecords();

    const existingIdsByModule = {
      projects: new Set(task.value?.projectId ? [String(typeof task.value.projectId === 'object' ? task.value.projectId._id : task.value.projectId)] : []),
      events: new Set((taskEvents.value || []).map(event => String(event?._id || event?.recordId || event?.id)).filter(Boolean)),
      deals: new Set((taskDeals.value || []).map(deal => String(deal?._id || deal?.recordId || deal?.id)).filter(Boolean)),
      forms: new Set((taskForms.value || []).map(form => String(form?._id || form?.recordId || form?.id)).filter(Boolean))
    };

    const existingIds = existingIdsByModule[normalizedModuleKey] || new Set();
    const idsToLink = ids.filter(id => !existingIds.has(String(id)));

    if (idsToLink.length === 0) {
      showLinkRecordDrawer.value = false;
      return;
    }

    if (normalizedModuleKey === 'projects') {
      // Task has a single project; use first selected id
      const response = await apiClient.put(`/tasks/${task.value._id}`, { projectId: idsToLink[0] });
      if (response.success && response.data) Object.assign(task.value, response.data);
    } else if (normalizedModuleKey === 'events' || normalizedModuleKey === 'deals' || normalizedModuleKey === 'forms') {
      const targetAppKeyByModule = {
        events: 'platform',
        deals: 'sales',
        forms: 'platform'
      };

      for (const recordId of idsToLink) {
        try {
          await apiClient.post('/relationships/link', {
            relationshipKey: normalizedModuleKey,
            source: {
              appKey: 'platform',
              moduleKey: 'tasks',
              recordId: task.value._id
            },
            target: {
              appKey: targetAppKeyByModule[normalizedModuleKey],
              moduleKey: normalizedModuleKey,
              recordId
            }
          });
        } catch (linkErr) {
          if (linkErr?.status === 409) continue; // already linked
          throw linkErr;
        }
      }
    } else {
      console.warn(`Unknown module type from drawer: ${normalizedModuleKey}`);
      return;
    }
    await fetchRelatedRecords();
    showLinkRecordDrawer.value = false;
  } catch (err) {
    console.error('Error linking record:', err);
    alert(`Error linking ${moduleKey}. Please try again.`);
  }
};

// Meta actions handlers
const handleToggleFollow = async () => {
  if (!task.value) return;
  try {
    // TODO: Implement follow/unfollow API call
    isFollowing.value = !isFollowing.value;
    // await apiClient.post(`/tasks/${task.value._id}/follow`);
  } catch (err) {
    console.error('Error toggling follow:', err);
  }
};

const handleCopyUrl = () => {
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    // TODO: Show toast notification instead of alert
    alert('URL copied to clipboard!');
  }).catch((err) => {
    console.error('Error copying URL:', err);
  });
};

// More actions handlers
const handleDuplicate = async () => {
  if (!task.value) return;
  try {
    // TODO: Implement duplicate API call
    console.log('Duplicate task:', task.value._id);
    // const response = await apiClient.post(`/tasks/${task.value._id}/duplicate`);
    // router.push(`/tasks/${response.data._id}`);
  } catch (err) {
    console.error('Error duplicating task:', err);
  }
};

const escapeCsvValue = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const formatExportDate = (dateValue) => {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
};

const handleExport = () => {
  if (!task.value) return;
  try {
    const assignedTo = task.value.assignedTo ? getUserDisplayName(task.value.assignedTo) : '';
    const tags = Array.isArray(task.value.tags) ? task.value.tags.join(', ') : '';

    const headers = [
      'id',
      'title',
      'description',
      'status',
      'priority',
      'start_date',
      'due_date',
      'completed_date',
      'assigned_to',
      'tags',
      'estimated_hours',
      'actual_hours',
      'created_at',
      'updated_at'
    ];

    const row = [
      task.value._id || '',
      task.value.title || '',
      task.value.description || '',
      task.value.status || '',
      task.value.priority || '',
      formatExportDate(task.value.startDate),
      formatExportDate(task.value.dueDate),
      formatExportDate(task.value.completedDate),
      assignedTo,
      tags,
      task.value.estimatedHours ?? '',
      task.value.actualHours ?? '',
      formatExportDate(task.value.createdAt),
      formatExportDate(task.value.updatedAt)
    ].map(escapeCsvValue);

    const csv = `${headers.join(',')}\n${row.join(',')}\n`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeId = task.value._id ? task.value._id.slice(-8) : 'task';
    link.download = `task_${safeId}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error exporting task:', err);
    alert('Error exporting task. Please try again.');
  }
};

const handleDelete = () => {
  if (!task.value) return;
  showDeleteModal.value = true;
};

const confirmDeleteTask = async () => {
  if (!task.value) return;
  deleting.value = true;
  try {
    await apiClient.delete(`/tasks/${task.value._id}`);
    showDeleteModal.value = false;
    router.push('/tasks');
  } catch (err) {
    console.error('Error deleting task:', err);
    alert('Error deleting task. Please try again.');
  } finally {
    deleting.value = false;
  }
};

const handleTaskEditSaved = async () => {
  showEditDrawer.value = false;
  await fetchTask();
};

watch(() => props.taskId, (id) => {
  if (props.embed && id) fetchTask();
}, { immediate: false });

watch(() => task.value?._id, (taskId) => {
  if (!taskId) return;
  rightRelatedModuleOpen.value = { ...RIGHT_RELATED_DEFAULT_OPEN_STATE };
  loadRightRelatedAccordionState();
}, { immediate: true });

watch(rightRelatedModuleOpen, () => {
  if (!task.value?._id) return;
  persistRightRelatedAccordionState();
}, { deep: true });

const updateStickyTitleState = (scrollTop) => {
  if (isLeftTitleSticky.value) {
    if (scrollTop <= STICKY_TITLE_DISABLE_OFFSET) {
      isLeftTitleSticky.value = false;
    }
    return;
  }

  if (scrollTop >= STICKY_TITLE_ENABLE_OFFSET) {
    isLeftTitleSticky.value = true;
  }
};

const handleLeftPaneScrollForStickyTitle = (event) => {
  const nextScrollTop = event?.target?.scrollTop || 0;
  leftPaneScrollTop.value = nextScrollTop;
  updateStickyTitleState(nextScrollTop);
};

const detachLeftPaneScrollListener = () => {
  if (!leftPaneScrollElement.value) return;
  leftPaneScrollElement.value.removeEventListener('scroll', handleLeftPaneScrollForStickyTitle);
  leftPaneScrollElement.value = null;
};

const attachLeftPaneScrollListener = () => {
  const leftPaneEl = document.querySelector('.record-page-layout__left');
  if (!leftPaneEl) return false;
  if (leftPaneScrollElement.value === leftPaneEl) {
    const nextScrollTop = leftPaneEl.scrollTop || 0;
    leftPaneScrollTop.value = nextScrollTop;
    updateStickyTitleState(nextScrollTop);
    return true;
  }
  detachLeftPaneScrollListener();
  leftPaneScrollElement.value = leftPaneEl;
  const nextScrollTop = leftPaneEl.scrollTop || 0;
  leftPaneScrollTop.value = nextScrollTop;
  updateStickyTitleState(nextScrollTop);
  leftPaneEl.addEventListener('scroll', handleLeftPaneScrollForStickyTitle, { passive: true });
  return true;
};

watch(loading, (isLoading) => {
  if (isLoading) return;
  nextTick(() => {
    if (attachLeftPaneScrollListener()) return;
    requestAnimationFrame(() => {
      attachLeftPaneScrollListener();
    });
  });
});

watch(tagStorageKey, () => {
  loadTagDefinitionsFromStorage();
}, { immediate: true });

onMounted(() => {
  fetchTask();
  fetchTaskLifecycleFieldOptions();
  window.addEventListener('scroll', updateCommentReactionPickerPosition, true);
  window.addEventListener('scroll', updateCommentReactionTooltipPosition, true);
  window.addEventListener('scroll', updateTagPopoverPosition, true);
  window.addEventListener('scroll', updateRelatedToPopoverPosition, true);
  window.addEventListener('resize', updateCommentReactionPickerPosition);
  window.addEventListener('resize', updateCommentReactionTooltipPosition);
  window.addEventListener('resize', updateTagPopoverPosition);
  window.addEventListener('resize', updateRelatedToPopoverPosition);
  document.addEventListener('click', handleCommentReactionPickerOutsideClick);
  document.addEventListener('click', handleTagPopoverOutsideClick);
  document.addEventListener('click', handleRelatedToPopoverOutsideClick);
});

onUnmounted(() => {
  cancelCommentReactionTooltipShow();
  cancelCommentReactionTooltipHide();
  detachLeftPaneScrollListener();
  window.removeEventListener('scroll', updateCommentReactionPickerPosition, true);
  window.removeEventListener('scroll', updateCommentReactionTooltipPosition, true);
  window.removeEventListener('scroll', updateTagPopoverPosition, true);
  window.removeEventListener('scroll', updateRelatedToPopoverPosition, true);
  window.removeEventListener('resize', updateCommentReactionPickerPosition);
  window.removeEventListener('resize', updateCommentReactionTooltipPosition);
  window.removeEventListener('resize', updateTagPopoverPosition);
  window.removeEventListener('resize', updateRelatedToPopoverPosition);
  document.removeEventListener('click', handleCommentReactionPickerOutsideClick);
  document.removeEventListener('click', handleTagPopoverOutsideClick);
  document.removeEventListener('click', handleRelatedToPopoverOutsideClick);
  commentReactionButtonRefs.clear();
});

// Activity search helpers (use functions so template expressions don't access `.value` directly)
const closeActivitySearch = () => {
  activitySearchQuery.value = '';
};

const clearActivitySearch = () => {
  activitySearchQuery.value = '';
  nextTick(() => {
    if (activitySearchInputRef.value) activitySearchInputRef.value.focus();
  });
};

// Highlight search text within content
const highlightSearchText = (text) => {
  if (!text) return '';
  const q = (activitySearchQuery.value || '').trim();
  if (!q) return text;
  
  const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 font-semibold">$1</mark>');
};
</script>

