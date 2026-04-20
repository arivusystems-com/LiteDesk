<template>
  <div ref="genericRecordContentRootRef" class="generic-record-content flex-1 min-h-0 overflow-hidden flex flex-col">
    <RecordPageShell
      :loading="loading"
      :error="error"
      :loading-message="`Loading ${moduleLabel}...`"
      :error-title="`Error Loading ${moduleLabel}`"
      :layout-props="layoutProps"
      @retry="fetchRecord"
    >
      <!-- No RecordHeader in embed (quick preview): drawer already has prev/next + close; header would fix to viewport and show as extra over the list -->
      <template v-if="record && !embed" #header>
        <RecordHeader
          :show-navigation="true"
          :can-previous="!!neighbors.previousId"
          :can-next="!!neighbors.nextId"
          :previous-label="`Previous ${moduleLabelSingular}`"
          :next-label="`Next ${moduleLabelSingular}`"
          @previous="goToPrevious"
          @next="goToNext"
        >
          <template #breadcrumbs>
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              {{ moduleLabel }} <span class="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500"></span> {{ recordTitle || (record?._id || '').slice(-8) || 'N/A' }}
            </span>
          </template>
          <template #pageActions>
            <button
              type="button"
              class="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Edit"
              title="Edit"
              @click="showEditModal = true"
            >
              <PencilSquareIcon class="w-5 h-5" />
            </button>
            <button
              v-if="supportsTags"
              ref="tagHeaderButtonRef"
              type="button"
              :class="[
                'relative inline-flex items-center justify-center p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                hasRecordTags
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              ]"
              aria-label="Tags"
              title="Tags"
              @click="handleTagIconClick($event)"
            >
              <TagIcon class="block w-5 h-5" />
              <span
                v-if="hasRecordTags"
                class="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"
              />
            </button>
            <button
              type="button"
              class="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Copy URL"
              title="Copy URL"
              @click="copyUrl"
            >
              <ClipboardDocumentIcon class="w-5 h-5" />
            </button>
            <Menu as="div" class="relative">
              <MenuButton
                class="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="More actions"
                title="More actions"
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
                      type="button"
                      :class="[
                        'w-full text-left px-4 py-2 text-sm transition-colors duration-150 flex items-center gap-2',
                        active ? 'bg-gray-100 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-200'
                      ]"
                      @click="handleDuplicate"
                    >
                      <DocumentDuplicateIcon class="w-4 h-4" />
                      <span>Duplicate</span>
                    </button>
                  </MenuItem>
                  <MenuItem v-slot="{ active }">
                    <button
                      type="button"
                      :class="[
                        'w-full text-left px-4 py-2 text-sm transition-colors duration-150 flex items-center gap-2',
                        active ? 'bg-gray-100 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-200'
                      ]"
                      @click="handleExport"
                    >
                      <ArrowDownTrayIcon class="w-4 h-4" />
                      <span>Export</span>
                    </button>
                  </MenuItem>
                  <MenuItem v-if="supportsEmail" v-slot="{ active }">
                    <button
                      type="button"
                      :class="[
                        'w-full text-left px-4 py-2 text-sm transition-colors duration-150 flex items-center gap-2',
                        active ? 'bg-gray-100 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-200'
                      ]"
                      @click="showEmailModal = true"
                    >
                      <EnvelopeIcon class="w-4 h-4" />
                      <span>Send email</span>
                    </button>
                  </MenuItem>
                  <hr class="my-1 border-gray-200 dark:border-gray-700" />
                  <MenuItem v-slot="{ active }">
                    <button
                      type="button"
                      :class="[
                        'w-full text-left px-4 py-2 text-sm transition-colors duration-150 flex items-center gap-2',
                        active ? 'bg-gray-100 dark:bg-gray-700' : 'text-red-600 dark:text-red-400'
                      ]"
                      @click="showDeleteModal = true"
                    >
                      <TrashIcon class="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </MenuItem>
                </MenuItems>
              </transition>
            </Menu>
          </template>
        </RecordHeader>
      </template>

      <template v-if="record" #left>
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
              <span>Back to {{ moduleLabelSingular }}</span>
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
          v-if="record && expandedLeftSection === 'description-history'"
          class="description-history-page flex-1 min-h-0 mt-4 flex flex-col gap-6"
        >
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white flex-shrink-0">{{ recordTitle || moduleLabelSingular }}</h2>
          <div class="grid grid-cols-1 lg:grid-cols-[1fr_320px] grid-rows-[1fr] gap-6 min-h-0 flex-1">
            <div class="flex flex-col min-h-0 min-w-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden h-full">
              <div class="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                <div
                  v-if="descriptionHistoryShowDiff && descriptionHistoryDiffHtml"
                  class="text-md text-gray-900 dark:text-white px-6 py-4 leading-[1.75] [&_del]:px-0.5 [&_ins]:px-0.5"
                  v-html="descriptionHistoryDiffHtml"
                />
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
                    :name="'generic-desc-version-' + (record?._id || '')"
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
                        {{ ver.createdBy || 'Someone' }}
                      </template>
                    </span>
                  </div>
                </label>
              </div>
              <p class="text-xs text-gray-400 dark:text-gray-500 px-4 py-2 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
                Version history is stored for up to 365 days.
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

        <div v-if="embed && !expandedLeftSection" class="pt-0 flex-shrink-0" aria-hidden="true" />
        <RecordPageTitleRow
          v-if="!expandedLeftSection"
          :sticky="isLeftTitleSticky"
          :embed="embed"
        >
          <Avatar
            v-if="recordAvatarUser"
            :user="recordAvatarUser"
            size="lg"
            class="shrink-0"
          />
          <Avatar
            v-else
            :record="{ name: recordTitle }"
            :icon="recordAvatarIcon"
            size="lg"
            class="shrink-0"
          />
          <div class="min-w-0 flex-1">
            <EditableTitle
              :title="recordTitle"
              :can-edit="canEditRecord"
              @save="handleTitleSave"
            />
            <!-- People: participation badges under name (Sales, Lead) -->
            <div
              v-if="isPeopleModule && peopleHeaderBadges.length"
              class="flex flex-wrap gap-1.5 mt-1.5"
            >
              <span
                v-for="(b, i) in peopleHeaderBadges"
                :key="`badge-${i}`"
                class="inline-flex px-2 py-0.5 rounded text-xs font-medium"
                :class="peopleContextIsAppView ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' : b.appKey ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'"
              >
                {{ b.label }}
              </span>
            </div>
          </div>
        </RecordPageTitleRow>

        <div
          v-if="genericStateFields.length && (!expandedLeftSection || expandedLeftSection === 'key-fields')"
          :class="['group/left-section', expandedLeftSection ? 'mt-8' : 'mt-4']"
        >
          <RecordStateSection
            heading="Key fields"
            :fields="genericStateFields"
            :field-values="genericStateValues"
          />
        </div>

        <!-- App Participation: people only, shows roles per app (e.g. Sales → Lead) -->
        <div
          v-if="isPeopleModule && record && (!expandedLeftSection || expandedLeftSection === 'key-fields')"
          :class="['group/left-section', expandedLeftSection ? 'mt-8' : 'mt-4']"
        >
          <section
            class="record-state-section mb-8 mt-4 group/app-participation"
            aria-labelledby="app-participation-heading"
          >
            <div class="pb-2 flex items-center justify-between gap-3 flex-wrap">
              <h3
                id="app-participation-heading"
                :class="[
                  'font-semibold text-gray-900 dark:text-white',
                  expandedLeftSection ? 'text-2xl' : 'text-base'
                ]"
              >
                App participation
              </h3>
              <div
                v-if="attachableAppsForRecordContext.length"
                :class="[
                  'inline-flex flex-wrap items-center justify-end gap-1.5 transition-opacity',
                  expandedLeftSection
                    ? 'opacity-100 lg:opacity-100'
                    : 'opacity-100 lg:opacity-0 lg:group-hover/app-participation:opacity-100'
                ]"
              >
                <button
                  v-for="app in attachableAppsForRecordContext"
                  :key="`attach-header-${app}`"
                  type="button"
                  class="inline-flex items-center justify-center gap-1.5 min-h-8 px-2.5 rounded-md border border-gray-200 bg-white text-gray-600 hover:text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-colors"
                  :title="`Add to ${getAppLabel(app)}`"
                  :aria-label="`Add to ${getAppLabel(app)}`"
                  @click="openAttachToAppModal(app)"
                >
                  <PlusIcon class="h-4 w-4 shrink-0" />
                  <span class="text-xs font-semibold">Add to {{ getAppLabel(app) }}</span>
                </button>
              </div>
            </div>
            <div class="space-y-2">
              <template v-if="peopleParticipationEntriesVisible.length">
                <div
                  v-for="(entry, i) in peopleParticipationEntriesVisible"
                  :key="`${entry.appKey}-${i}`"
                  class="flex flex-wrap items-center gap-x-3 gap-y-2 justify-between rounded-lg border border-gray-200/80 dark:border-gray-700/80 bg-gray-50/60 dark:bg-gray-800/40 px-3 py-2.5"
                >
                  <div class="flex flex-wrap items-center gap-2 min-w-0">
                    <template v-if="peopleContextIsAppView">
                      <span class="text-sm font-medium text-gray-900 dark:text-white">{{ entry.role }}</span>
                    </template>
                    <template v-else>
                      <span
                        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        :class="participationAppBadgeClass(entry.appLabel)"
                      >
                        {{ entry.appLabel }}
                      </span>
                      <BadgeCell
                        :value="entry.role"
                        :options="badgeOptionsForParticipationApp(entry.appKey)"
                        :variant-map="participationRoleBadgeVariantMap"
                      />
                    </template>
                  </div>
                  <div class="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      v-if="entry.appKey === 'SALES' && showPeopleConvertLeadPrimary"
                      type="button"
                      class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 rounded-md shadow-sm transition-colors"
                      @click="showConvertLeadModal = true"
                    >
                      <ArrowRightCircleIcon class="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      Convert to Contact
                    </button>
                    <button
                      v-if="canEditParticipationFor(entry.appKey)"
                      type="button"
                      class="inline-flex items-center justify-center gap-1.5 min-h-8 px-2.5 rounded-md border border-gray-200 bg-white text-gray-600 hover:text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-colors"
                      title="Edit participation"
                      aria-label="Edit participation"
                      @click="openParticipationEdit(entry.appKey)"
                    >
                      <PencilSquareIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span class="text-xs font-semibold">Edit</span>
                    </button>
                  </div>
                </div>
              </template>
              <template v-else>
                <span class="text-sm text-gray-500 dark:text-gray-400 italic">
                  <template v-if="peopleContextIsAppView">
                    Not participating in {{ getAppLabel(routeParticipationContext) }} yet
                  </template>
                  <template v-else>
                    This person is not part of any app yet
                  </template>
                </span>
              </template>
            </div>
          </section>
        </div>

        <!-- Section stack: show when collapsed, or when expanded to details/related (adapter returns only that section) -->
        <section
          v-if="record && genericSections.length && (!expandedLeftSection || expandedLeftSection === 'details' || expandedLeftSection === 'related')"
          :class="[expandedLeftSection ? 'mt-8' : 'mt-4']"
        >
          <SectionStack
            :sections="genericSections"
            :record="record"
            :adapter="genericAdapter"
            :context="sectionContext"
          />
        </section>
      </template>

      <template v-if="record" #right>
        <RecordRightPane
          ref="rightPaneRef"
          :tabs="rightPaneTabs"
          :default-tab="recordLayoutIsMobile ? undefined : 'activity'"
          :show-header="embed"
          :show-close-button="embed"
          :title="embed ? moduleLabel : ''"
          :persistence-key="`generic-${moduleKey}-${record._id}`"
          :record-id="record._id"
          @close="$emit('close')"
        >
          <template v-if="embed && quickPreviewNav" #header-prefix>
            <div class="flex items-center gap-1 mr-2">
              <button
                type="button"
                class="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-500 transition-colors dark:border-gray-700 dark:text-gray-400 shrink-0"
                :class="quickPreviewNav.canPrevious ? 'hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200' : 'opacity-40 cursor-not-allowed'"
                :disabled="!quickPreviewNav.canPrevious"
                :aria-label="`Previous ${moduleLabelSingular}`"
                :title="`Previous ${moduleLabelSingular}`"
                @click="quickPreviewNav.onPrev()"
              >
                <ArrowLeftIcon class="h-4 w-4" />
              </button>
              <button
                type="button"
                class="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-500 transition-colors dark:border-gray-700 dark:text-gray-400 shrink-0"
                :class="quickPreviewNav.canNext ? 'hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200' : 'opacity-40 cursor-not-allowed'"
                :disabled="!quickPreviewNav.canNext"
                :aria-label="`Next ${moduleLabelSingular}`"
                :title="`Next ${moduleLabelSingular}`"
                @click="quickPreviewNav.onNext()"
              >
                <ArrowRightIcon class="h-4 w-4" />
              </button>
            </div>
          </template>
          <template v-if="embed" #header-actions>
            <button
              type="button"
              class="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Open in new tab"
              title="Open in new tab"
              @click="openRecordInNewTab"
            >
              <ArrowTopRightOnSquareIcon class="w-5 h-5" />
            </button>
            <button
              type="button"
              class="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Edit"
              title="Edit"
              @click="showEditModal = true"
            >
              <PencilSquareIcon class="w-5 h-5" />
            </button>
            <button
              v-if="supportsTags"
              ref="tagHeaderButtonRef"
              type="button"
              :class="[
                'relative inline-flex items-center justify-center p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                hasRecordTags
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              ]"
              aria-label="Tags"
              title="Tags"
              @click="handleTagIconClick($event)"
            >
              <TagIcon class="block w-5 h-5" />
              <span
                v-if="hasRecordTags"
                class="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-indigo-600 dark:text-indigo-400"
              />
            </button>
            <button
              type="button"
              class="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Copy URL"
              title="Copy URL"
              @click="copyRecordUrl"
            >
              <ClipboardDocumentIcon class="w-5 h-5" />
            </button>
            <Menu as="div" class="relative">
              <MenuButton
                class="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="More actions"
                title="More actions"
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
                      type="button"
                      :class="[
                        'w-full text-left px-4 py-2 text-sm transition-colors duration-150 flex items-center gap-2',
                        active ? 'bg-gray-100 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-200'
                      ]"
                      @click="handleDuplicate"
                    >
                      <DocumentDuplicateIcon class="w-4 h-4" />
                      <span>Duplicate</span>
                    </button>
                  </MenuItem>
                  <MenuItem v-slot="{ active }">
                    <button
                      type="button"
                      :class="[
                        'w-full text-left px-4 py-2 text-sm transition-colors duration-150 flex items-center gap-2',
                        active ? 'bg-gray-100 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-200'
                      ]"
                      @click="handleExport"
                    >
                      <ArrowDownTrayIcon class="w-4 h-4" />
                      <span>Export</span>
                    </button>
                  </MenuItem>
                  <MenuItem v-if="supportsEmail" v-slot="{ active }">
                    <button
                      type="button"
                      :class="[
                        'w-full text-left px-4 py-2 text-sm transition-colors duration-150 flex items-center gap-2',
                        active ? 'bg-gray-100 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-200'
                      ]"
                      @click="showEmailModal = true"
                    >
                      <EnvelopeIcon class="w-4 h-4" />
                      <span>Send email</span>
                    </button>
                  </MenuItem>
                  <hr class="my-1 border-gray-200 dark:border-gray-700" />
                  <MenuItem v-slot="{ active }">
                    <button
                      type="button"
                      :class="[
                        'w-full text-left px-4 py-2 text-sm transition-colors duration-150 flex items-center gap-2',
                        active ? 'bg-gray-100 dark:bg-gray-700' : 'text-red-600 dark:text-red-400'
                      ]"
                      @click="showDeleteModal = true"
                    >
                      <TrashIcon class="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </MenuItem>
                </MenuItems>
              </transition>
            </Menu>
          </template>
          <template #tab-activity>
            <ActivitySection
              :events="filteredActivityEvents"
              :ui="activityUi"
              :activity-pane-ready="true"
              :activity-search-open="activitySearchOpen"
              :activity-search-query="activitySearchQuery"
              :activity-filter-comments="activityFilterComments"
              :activity-filter-updates="activityFilterUpdates"
              :activity-filter-email="activityFilterEmail"
              :new-comment-text="newCommentText"
              :show-notifications="false"
              @comment="handleAddComment"
              @update:activitySearchOpen="activitySearchOpen = $event"
              @update:activitySearchQuery="activitySearchQuery = $event"
              @update:activityFilterComments="activityFilterComments = $event"
              @update:activityFilterUpdates="activityFilterUpdates = $event"
              @update:activityFilterEmail="activityFilterEmail = $event"
              @update:newCommentText="newCommentText = $event"
            />
          </template>
          <template #tab-related>
            <div class="flex flex-col h-full">
              <div class="record-context-panel__header flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-900">
                <h2 class="text-base font-semibold text-gray-900 dark:text-white">Related</h2>
                <div v-if="canLinkRecords" class="flex items-center gap-2">
                  <button
                    type="button"
                    @click="openAddRecordDrawer"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                  >
                    <PlusIcon class="w-4 h-4" />
                    Add record
                  </button>
                  <button
                    type="button"
                    @click="openLinkRecordDrawer"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                  >
                    <LinkIcon class="w-4 h-4" />
                    Link record
                  </button>
                </div>
              </div>
              <div class="p-4 overflow-y-auto flex-1 min-h-0">
                <RelatedSection
                  :record="record"
                  :adapter="genericAdapter"
                  :context="{ hideHeader: true }"
                />
              </div>
            </div>
          </template>
          <template #tab-details>
            <div class="flex flex-col h-full min-h-0">
              <div class="record-context-panel__header flex flex-shrink-0 flex-col gap-2 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
                <div class="flex items-baseline justify-between gap-2">
                  <h2 class="text-sm font-normal text-gray-900 dark:text-white">Details</h2>
                  <span
                    v-if="detailsTabFieldCountLabel"
                    class="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  >
                    {{ detailsTabFieldCountLabel }}
                  </span>
                </div>
                <div class="flex items-center gap-3">
                  <div class="relative min-w-0 flex-1">
                    <MagnifyingGlassIcon class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                    <input
                      v-model="detailsTabSearchQuery"
                      type="search"
                      placeholder="Filter fields…"
                      autocomplete="off"
                      class="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-500 focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:border-gray-600 dark:bg-gray-800/80 dark:text-white dark:placeholder-gray-400"
                    />
                  </div>
                  <label class="flex shrink-0 cursor-pointer items-center gap-2 select-none text-xs text-gray-600 dark:text-gray-400">
                    <input
                      v-model="detailsShowEmptyFields"
                      type="checkbox"
                      class="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800"
                    />
                    Show empty fields
                  </label>
                </div>
              </div>
              <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-3">
                <template v-if="record?._id && genericAdapter">
                  <p
                    v-if="rightPaneAllModuleFields.length && !rightPaneDetailsFilteredFields.length && (detailsTabSearchQuery || '').trim()"
                    class="px-1 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No fields match your filter.
                  </p>
                  <p
                    v-else-if="rightPaneAllModuleFields.length && !rightPaneDetailsFilteredFields.length"
                    class="px-1 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No fields with values. Turn on “Show empty fields” to see the rest.
                  </p>
                  <DetailsSection
                    v-else-if="rightPaneDetailsFilteredFields.length"
                    :record="record"
                    :adapter="genericAdapter"
                    :context="recordDetailsTabContext"
                    :field-rows-override="rightPaneDetailsFilteredFields"
                    :show-all-fields="true"
                    variant="compact"
                  />
                  <p v-else class="px-1 py-10 text-center text-sm text-gray-500 dark:text-gray-400">No fields to show.</p>
                </template>
                <p v-else class="text-sm text-gray-500 dark:text-gray-400">No record loaded.</p>
              </div>
            </div>
          </template>
          <template #tab-integrations>
            <div class="flex flex-col h-full">
              <div class="record-context-panel__header flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-900">
                <h2 class="text-base font-semibold text-gray-900 dark:text-white">Integrations</h2>
              </div>
              <div class="p-4 overflow-y-auto flex-1 min-h-0">
                <AutomationContext
                  v-if="record?._id"
                  :entity-type="moduleKey"
                  :entity-id="record._id"
                />
                <div v-else class="text-sm text-gray-600 dark:text-gray-400 italic">No integrations configured.</div>
              </div>
            </div>
          </template>
        </RecordRightPane>
      </template>
    </RecordPageShell>

    <CreateRecordDrawer
      v-if="record"
      :is-open="showEditModal"
      :module-key="moduleKey"
      :record="record"
      @close="showEditModal = false"
      @saved="handleRecordUpdated"
    />
    <CreateRecordDrawer
      v-if="showAddRelatedRecordDrawer && addRelatedRecordModuleKey"
      :is-open="showAddRelatedRecordDrawer"
      :module-key="addRelatedRecordModuleKey"
      @close="closeAddRelatedRecordDrawer"
      @saved="handleAddRelatedRecordSaved"
    />

    <DeleteConfirmationModal
      :show="showDeleteModal"
      :record-name="recordTitle"
      :record-type="moduleKey"
      :deleting="deleting"
      @close="showDeleteModal = false"
      @confirm="confirmDelete"
    />

    <AttachToAppModal
      v-if="record && isPeopleModule"
      :key="attachModalTargetApp"
      :is-open="showAttachModal"
      :person-id="record._id"
      :app-key="attachModalTargetApp"
      :participation-type="attachModalParticipationType"
      @close="closeAttachToAppModal"
      @attached="handleAttachModalComplete"
    />

    <ParticipationEditModal
      v-if="record && isPeopleModule && participationEditAppKey"
      :is-open="!!participationEditAppKey"
      :person-id="record._id"
      :app-key="participationEditAppKey"
      :participation-data="participationEditData"
      @close="participationEditAppKey = null"
      @updated="handleParticipationEditUpdated"
    />

    <SalesConvertLeadModal
      v-if="record && isPeopleModule"
      :is-open="showConvertLeadModal"
      :person-id="String(record._id)"
      @close="showConvertLeadModal = false"
      @converted="handleConvertLeadCompleted"
    />

    <EmailComposeDrawer
      v-if="record && supportsEmail"
      :is-open="showEmailModal"
      :related-to="record?._id ? { moduleKey, recordId: String(record._id) } : null"
      :initial-to="record?.email || record?.primaryContact?.email || ''"
      @close="showEmailModal = false"
      @submit="handleEmailSubmit"
    />

    <LinkRecordsDrawer
      v-if="record"
      :is-open="showLinkRecordDrawer"
      :module-key="''"
      :source-app-key="recordContextAppKey"
      :source-module-key="moduleKey"
      :multiple="true"
      :allow-create="allowCreateFromLinkDrawer"
      :create-and-link="allowCreateFromLinkDrawer"
      :title="allowCreateFromLinkDrawer ? 'Add and Link Records' : 'Link Record'"
      :context="linkRecordDrawerContext"
      @close="closeLinkRecordDrawer"
      @linked="handleLinkRecordDrawerLinked"
      @create="handleLinkRecordDrawerCreate"
    />

    <Teleport to="body">
      <div
        v-if="supportsTags && record && showTagPopover"
        ref="tagPopoverRef"
        :style="tagPopoverStyle"
        class="fixed z-[120] w-[360px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl"
      >
        <RecordTagPopover
          :record="record"
          :tag-storage-key="tagStorageKey"
          :can-edit="canEditRecord"
          :persist-tags="persistRecordTags"
          :instance-tag-source="moduleKeyLower"
          :fetch-record="fetchRecord"
          :open="showTagPopover"
        />
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, inject } from 'vue';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useTabs } from '@/composables/useTabs';
import apiClient from '@/utils/apiClient';
import RecordPageShell from '@/components/record-page/RecordPageShell.vue';
import RecordHeader from '@/components/record-page/RecordHeader.vue';
import RecordStateSection from '@/components/record-page/RecordStateSection.vue';
import RecordPageTitleRow from '@/components/record-page/RecordPageTitleRow.vue';
import { useStickyTitleRow } from '@/components/record-page/composables/useStickyTitleRow';
import SectionStack from '@/components/record-page/sections/SectionStack.vue';
import RelatedSection from '@/components/record-page/sections/RelatedSection.vue';
import DetailsSection from '@/components/record-page/sections/DetailsSection.vue';
import RecordRightPane from '@/components/record-page/RecordRightPane.vue';
import EditableTitle from '@/components/record-page/EditableTitle.vue';
import RecordTagPopover from '@/components/record-page/RecordTagPopover.vue';
import { useRecordTagPopoverPosition } from '@/components/record-page/composables/useRecordTagPopoverPosition';
import { useRecordContext, invalidateRecordContext } from '@/composables/useRecordContext';
import ActivitySection from '@/components/activity/ActivitySection.vue';
import CreateRecordDrawer from '@/components/common/CreateRecordDrawer.vue';
import DeleteConfirmationModal from '@/components/common/DeleteConfirmationModal.vue';
import EmailComposeDrawer from '@/components/communications/EmailComposeDrawer.vue';
import AutomationContext from '@/components/automation/AutomationContext.vue';
import LinkRecordsDrawer from '@/components/common/LinkRecordsDrawer.vue';
import { createGenericRecordAdapter } from '@/components/record-page/adapters/genericRecordAdapter';
import { useRecordTags, getDefaultTagChipClass } from '@/components/record-page/composables/useRecordTags';
import {
  normalizeSystemActivityEvent,
  normalizeCommentActivityEvent,
  normalizeEmailThreadActivityEvent,
  sortActivityEventsByDate
} from '@/components/record-page/activityEventModel';
import { normalizeActivityUiContract } from '@/components/activity/activityUiContract';
import dateUtils from '@/utils/dateUtils';
import {
  PencilSquareIcon,
  ClipboardDocumentIcon,
  TrashIcon,
  UserCircleIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  CubeIcon,
  DocumentTextIcon,
  TagIcon,
  EllipsisVerticalIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  EnvelopeIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowsPointingInIcon,
  ArrowTopRightOnSquareIcon,
  ArrowRightCircleIcon
} from '@heroicons/vue/24/outline';
import Avatar from '@/components/common/Avatar.vue';
import BadgeCell from '@/components/common/table/BadgeCell.vue';
import DOMPurify from 'dompurify';
import { resolveFieldContext } from '@/utils/fieldContextFilter';
import { getParticipation } from '@/utils/getParticipation';
import { getAppLabel } from '@/utils/getRoleDisplay';
import {
  getPeopleParticipationEntries,
  filterParticipationEntriesByContext,
  isPeopleListAppContext,
  isPeopleSalesLeadFromFields,
  PEOPLE_PARTICIPATION_APP_KEYS
} from '@/utils/peopleParticipationUi';
import { usePeopleTypes } from '@/composables/usePeopleTypes';
import { typeDefsToBadgeOptions } from '@/utils/peopleTypeColors';
import AttachToAppModal from '@/components/people/AttachToAppModal.vue';
import ParticipationEditModal from '@/components/people/ParticipationEditModal.vue';
import SalesConvertLeadModal from '@/components/people/SalesConvertLeadModal.vue';
import { getParticipationFields } from '@/platform/fields/peopleFieldModel';
import { hasPeoplePermission } from '@/platform/permissions/peoplePermissionHelper';
import { PEOPLE_PERMISSIONS } from '@/platform/permissions/peoplePermissions';

const formatAppLabel = (appKey) => getAppLabel(appKey) || appKey || 'App';

const props = defineProps({
  moduleKey: { type: String, required: true },
  recordId: { type: String, required: true },
  embed: { type: Boolean, default: false }
});

const emit = defineEmits(['close']);

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { openTab, activeTabId, findTabById, updateTabTitle, replaceActiveTab } = useTabs();
const recordLayoutIsMobile = inject('recordLayoutIsMobile', ref(false));
const quickPreviewNav = inject('quickPreviewNav', null);

const record = ref(null);
const loading = ref(true);
const error = ref(null);
const moduleDefinition = ref(null);
const activityRaw = ref([]);
  const emailThreads = ref([]);
  const neighbors = ref({ previousId: null, nextId: null });
  const expandedLeftSection = ref('');
  const descriptionVersionsData = ref({ currentDescription: '', versions: [] });
  const selectedDescriptionVersionIndex = ref(0);
  const descriptionVersionsLoading = ref(false);
  const descriptionRestoreLoading = ref(false);
  const newCommentText = ref('');
  const activitySearchOpen = ref(false);
  const activitySearchQuery = ref('');
  const activityFilterComments = ref(true);
  const activityFilterUpdates = ref(true);
  const activityFilterEmail = ref(true);
  const detailsTabSearchQuery = ref('');
  const detailsShowEmptyFields = ref(true);
  const expandedTaskEmailThreads = ref(new Set());
  const showDeleteModal = ref(false);
const showEditModal = ref(false);
const showEmailModal = ref(false);
const showLinkRecordDrawer = ref(false);
const allowCreateFromLinkDrawer = ref(false);
const showAddRelatedRecordDrawer = ref(false);
const addRelatedRecordModuleKey = ref('');
const pendingAddRelatedLinkPayload = ref(null);
const showAttachModal = ref(false);
const showConvertLeadModal = ref(false);
const attachModalTargetApp = ref('SALES');
/** Preset SALES classifier (Lead/Contact); null for HELPDESK (picker uses tenant types). */
const attachModalParticipationType = ref('LEAD');

function openAttachToAppModal(appKey) {
  attachModalTargetApp.value = appKey;
  attachModalParticipationType.value = appKey === 'SALES' ? 'LEAD' : null;
  showAttachModal.value = true;
}

function closeAttachToAppModal() {
  showAttachModal.value = false;
}
const participationEditAppKey = ref(null);

/** Build participationData for ParticipationEditModal */
function buildParticipationDataForEdit(person, appKey) {
  const part = getParticipation(person, appKey);
  const fields = {};
  const upper = String(appKey || '').toUpperCase();

  if (part && upper === 'SALES') {
    if (part.role != null && part.role !== '') fields.sales_type = part.role;
    if (part.lead_status != null && part.lead_status !== '') fields.lead_status = part.lead_status;
    if (part.contact_status != null && part.contact_status !== '') fields.contact_status = part.contact_status;
  }
  if (part && upper === 'HELPDESK') {
    if (part.role != null && part.role !== '') fields.helpdesk_role = part.role;
  }

  const fieldKeys = getParticipationFields(appKey);
  for (const fk of fieldKeys) {
    const v = person?.[fk];
    if (v != null && v !== '' && fields[fk] == null) fields[fk] = v;
  }

  // Flattened people API aliases when participations block above did not set state
  if (upper === 'SALES' && (fields.sales_type == null || fields.sales_type === '')) {
    const st = person?.sales_type;
    if (st != null && st !== '') fields.sales_type = st;
  }
  if (upper === 'HELPDESK' && (fields.helpdesk_role == null || fields.helpdesk_role === '')) {
    const hr = person?.helpdesk_role;
    if (hr != null && hr !== '') fields.helpdesk_role = hr;
  }

  return { fields };
}

const participationEditData = computed(() => {
  if (!record.value || !participationEditAppKey.value) return { fields: {} };
  return buildParticipationDataForEdit(record.value, participationEditAppKey.value);
});

function canEditParticipationFor(appKey) {
  const perm = PEOPLE_PERMISSIONS.EDIT_PARTICIPATION[appKey] || PEOPLE_PERMISSIONS.EDIT_PARTICIPATION.BASE;
  return hasPeoplePermission(perm, authStore);
}

function openParticipationEdit(appKey) {
  participationEditAppKey.value = appKey;
}

async function handleParticipationEditUpdated(updated) {
  participationEditAppKey.value = null;
  if (updated && record.value) Object.assign(record.value, updated);
  await fetchRecord();
}
/** Organization list for people record page (organization field dropdown). Fetched when moduleKey is people. */
const peopleOrganizationList = ref([]);
/** Tenant user list used to render user lookup labels (e.g., assignedTo) in generic sections. */
const userLookupList = ref([]);
const deleting = ref(false);
const rightPaneRef = ref(null);

const genericRecordContentRootRef = ref(null);
const {
  isLeftTitleSticky,
  attachWhenReady: attachStickyTitleWhenReady,
  detach: detachStickyTitle,
  reset: resetStickyTitle
} = useStickyTitleRow(genericRecordContentRootRef);

const moduleKeyLower = computed(() => (props.moduleKey || '').toLowerCase());
const isPeopleModule = computed(() => moduleKeyLower.value === 'people');
const supportsTags = computed(() => ['people', 'organizations'].includes(moduleKeyLower.value));

const peopleParticipationEntries = computed(() => {
  const r = record.value;
  if (!r || !isPeopleModule.value) return [];
  return getPeopleParticipationEntries(r);
});

const routeParticipationContext = computed(() =>
  String(route.query?.context || route.query?.participationContext || 'ALL').toUpperCase()
);

/** Route context is SALES | HELPDESK: show only that app’s participation (role-only in header/section). */
const peopleContextIsAppView = computed(() =>
  isPeopleListAppContext(routeParticipationContext.value)
);

/** Participation rows visible for current route context (ALL = every app with data). */
const peopleParticipationEntriesVisible = computed(() =>
  filterParticipationEntriesByContext(
    peopleParticipationEntries.value,
    routeParticipationContext.value
  )
);

const participationRoleBadgeVariantMap = {
  Lead: 'warning',
  Contact: 'success',
  Qualified: 'info',
  Opportunity: 'primary',
  Customer: 'success',
  Agent: 'info',
  Lost: 'danger'
};

const { typeDefs: salesPeopleTypeDefsRecord } = usePeopleTypes('SALES');
const { typeDefs: helpdeskPeopleTypeDefsRecord } = usePeopleTypes('HELPDESK');

const peopleTypeBadgeOptionsByAppRecord = computed(() => ({
  SALES: typeDefsToBadgeOptions(salesPeopleTypeDefsRecord.value),
  HELPDESK: typeDefsToBadgeOptions(helpdeskPeopleTypeDefsRecord.value)
}));

function badgeOptionsForParticipationApp(appKey) {
  return peopleTypeBadgeOptionsByAppRecord.value[appKey] || [];
}

function participationAppBadgeClass(appLabel) {
  const classMap = {
    Sales: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    Helpdesk: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
    Audit: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
    Portal: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
    Projects: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200'
  };
  return classMap[appLabel] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-200';
}

/** Header badges for People — app route: current app role only; ALL: [App][Role] per participation */
const peopleHeaderBadges = computed(() => {
  if (!isPeopleModule.value) return [];
  const visible = peopleParticipationEntriesVisible.value;
  if (!visible.length) return [];
  const badges = [];
  for (const e of visible) {
    if (peopleContextIsAppView.value) {
      badges.push({ label: e.role });
    } else {
      badges.push({ label: e.appLabel, appKey: e.appKey });
      badges.push({ label: e.role });
    }
  }
  return badges;
});

/** Sales Lead: show “Convert to Contact” on the Sales app row (same lifecycle permission as ParticipationCard). */
const showPeopleConvertLeadPrimary = computed(() => {
  if (!isPeopleModule.value || !record.value) return false;
  const r = record.value;
  const salesType = r.sales_type ?? getParticipation(r, 'SALES')?.role;
  if (!isPeopleSalesLeadFromFields({ sales_type: salesType })) return false;
  return hasPeoplePermission(PEOPLE_PERMISSIONS.LIFECYCLE.SALES, authStore);
});

async function handleConvertLeadCompleted() {
  await fetchRecord();
}

/** Apps from PEOPLE_PARTICIPATION_APP_KEYS where the person has no participation and user may attach */
const attachableAppsMissingParticipation = computed(() => {
  const r = record.value;
  if (!isPeopleModule.value || !r) return [];
  return [...PEOPLE_PARTICIPATION_APP_KEYS].filter((app) => {
    if (getParticipation(r, app)) return false;
    const perm = PEOPLE_PERMISSIONS.ATTACH[app] || PEOPLE_PERMISSIONS.ATTACH.BASE;
    return hasPeoplePermission(perm, authStore);
  });
});

/** In app route context, only offer attach for that app */
const attachableAppsForRecordContext = computed(() => {
  const raw = attachableAppsMissingParticipation.value;
  const ctx = routeParticipationContext.value;
  if (isPeopleListAppContext(ctx)) {
    return raw.filter((app) => app === ctx);
  }
  return raw;
});
const supportsEmail = computed(() => MODULES_WITH_EMAIL.has(moduleKeyLower.value));

/** App key for record context / link drawer (must match relationship definitions). */
const recordContextAppKey = computed(() => {
  const key = moduleKeyLower.value;
  if (key === 'people' || key === 'organizations' || key === 'deals') return 'SALES';
  return 'PLATFORM';
});

const linkRecordDrawerContext = computed(() => {
  const id = record.value?._id;
  if (!id) return {};
  const key = (props.moduleKey || '').toLowerCase();
  if (key === 'people') return { personId: id };
  return { sourceRecordId: id };
});

const openLinkRecordDrawer = () => {
  allowCreateFromLinkDrawer.value = false;
  showLinkRecordDrawer.value = true;
};

const openAddRecordDrawer = () => {
  allowCreateFromLinkDrawer.value = true;
  showLinkRecordDrawer.value = true;
};

const closeLinkRecordDrawer = () => {
  showLinkRecordDrawer.value = false;
  allowCreateFromLinkDrawer.value = false;
};

const closeAddRelatedRecordDrawer = () => {
  showAddRelatedRecordDrawer.value = false;
  addRelatedRecordModuleKey.value = '';
  pendingAddRelatedLinkPayload.value = null;
};

const canLinkRecords = computed(() => authStore.can(props.moduleKey, 'edit'));

const { context: genericRecordContext, load: loadGenericRecordContext, canUnlink: genericRecordContextCanUnlink } = useRecordContext(
  () => recordContextAppKey.value,
  () => props.moduleKey,
  () => record.value?._id
);
watch(record, (r) => {
  if (r?._id) loadGenericRecordContext();
}, { immediate: true });

watch(() => props.recordId, () => {
  expandedLeftSection.value = '';
});

const genericRelatedGroupsFromContext = computed(() => {
  const isOrganizationModule = moduleKeyLower.value === 'organizations';
  const contextRelationships = Array.isArray(genericRecordContext.value?.relationships)
    ? genericRecordContext.value.relationships
    : [];

  // Organizations should always show default related groups (Contacts/Deals),
  // even when there are currently zero linked records.
  const fallbackRelationships = isOrganizationModule && contextRelationships.length === 0
    ? (Array.isArray(moduleDefinition.value?.relationships) ? moduleDefinition.value.relationships : []).map((rel) => ({
      relationshipKey: rel.relationshipKey || rel.key || rel.name || 'related',
      label: rel.label || rel.name || rel.relationshipKey || 'Related',
      ui: {
        label: rel.label || rel.name || rel.relationshipKey || 'Related'
      },
      direction: 'TARGET',
      records: []
    }))
    : [];

  const relationshipsForGroups = contextRelationships.length > 0
    ? contextRelationships
    : fallbackRelationships;

  const groups = Array.isArray(relationshipsForGroups)
    ? relationshipsForGroups
    .filter((rel) => {
      if (isOrganizationModule) return true;
      return rel.records && rel.records.length > 0;
    })
    .map((rel) => {
      const key = rel.relationshipKey || rel.label || 'related';
      const label = rel.ui?.label || rel.label || key;
      const direction = (rel.direction || 'SOURCE').toUpperCase();
      const items = (rel.records || []).map((r) => {
        const id = r.recordId ?? r.id ?? r._id;
        const moduleKey = (r.moduleKey || '').toLowerCase();
        const appKey = (r.appKey || 'SALES').toUpperCase();
        const path = moduleKey ? `/${moduleKey}/${id}` : null;
        const personName = [r.first_name || r.firstName || '', r.last_name || r.lastName || '']
          .filter(Boolean)
          .join(' ')
          .trim();
        return {
          id: id?.toString?.() ?? String(id),
          title: r.label || r.name || r.title || personName || (id ? String(id).slice(0, 8) : 'Untitled'),
          meta: r.secondaryText || r.status || '',
          onOpen: path ? () => openTab(path, { background: false, insertAdjacent: true }) : undefined,
          relationshipKey: key,
          appKey,
          moduleKey,
          direction
        };
      });
      return { key, label, items };
    })
    : [];

  return groups;
});

const {
  tagHeaderButtonRef,
  tagPopoverRef,
  showTagPopover,
  tagPopoverStyle,
  updateTagPopoverPosition,
  handleTagIconClick,
  openTagPopoverFromField,
  handleTagPopoverMousedown,
  handleTagPopoverOutsideClick
} = useRecordTagPopoverPosition();

const hasRecordTags = computed(() => Array.isArray(record.value?.tags) && record.value.tags.length > 0);

const tagStorageKey = computed(() => {
  const organizationId = authStore.user?.organizationId || authStore.organization?._id || 'default-org';
  return `litedesk-${moduleKeyLower.value || 'record'}-tag-definitions-${organizationId}`;
});

const persistRecordTags = async (cleaned) => {
  if (!record.value || !props.recordId) return;
  try {
    const moduleKey = moduleKeyLower.value;
    const supportsDedicatedTagsEndpoint = moduleKey === 'deals' || moduleKey === 'tasks';
    const response = supportsDedicatedTagsEndpoint
      ? await apiClient.put(`/${props.moduleKey}/${props.recordId}/tags`, { tags: cleaned })
      : await apiClient.put(`/${props.moduleKey}/${props.recordId}`, { tags: cleaned });
    if (response?.success && response?.data) {
      record.value.tags = Array.isArray(response.data.tags) ? response.data.tags : cleaned;
    } else {
      record.value.tags = cleaned;
    }
  } catch (e) {
    console.error('Save record tags error:', e);
    await fetchRecord();
  }
};

const moduleLabel = computed(() => {
  const key = (props.moduleKey || '').toLowerCase();
  const labels = { people: 'People', organizations: 'Organizations', events: 'Events', items: 'Items', forms: 'Forms' };
  return labels[key] || (key.charAt(0).toUpperCase() + key.slice(1));
});
const moduleLabelSingular = computed(() => {
  const s = moduleLabel.value;
  return s.endsWith('s') ? s.slice(0, -1) : s;
});

const recordTitle = computed(() => {
  const r = record.value;
  if (!r) return '';
  const first = (r.first_name ?? r.firstName ?? '').trim();
  const last = (r.last_name ?? r.lastName ?? '').trim();
  const namePart = [first, last].filter(Boolean).join(' ').trim() || null;
  return (r.name ?? r.title ?? namePart ?? r.email ?? (r._id || '').slice(-8)) || 'Record';
});

/** For People module: user-shaped object for Avatar (photo or initials). */
const recordAvatarUser = computed(() => {
  const r = record.value;
  if (!r || (props.moduleKey || '').toLowerCase() !== 'people') return null;
  const firstName = r.first_name ?? r.firstName ?? '';
  const lastName = r.last_name ?? r.lastName ?? '';
  if (!firstName && !lastName && !r.email) return null;
  return {
    firstName: String(firstName).trim(),
    lastName: String(lastName).trim(),
    email: r.email,
    avatar: r.avatar ?? r.image ?? ''
  };
});

/** Icon for Avatar when no user avatar (non-people modules). */
const recordAvatarIcon = computed(() => {
  const key = (props.moduleKey || '').toLowerCase();
  const map = {
    people: UserCircleIcon,
    organizations: BuildingOfficeIcon,
    events: CalendarIcon,
    items: CubeIcon,
    forms: DocumentTextIcon
  };
  return map[key] || DocumentTextIcon;
});

const canEditRecord = computed(() => authStore.can?.(props.moduleKey, 'edit') ?? false);

// Use real tag colors for People (must be after canEditRecord)
const { getTagChipClass: getTagChipClassFromComposable } = useRecordTags(record, {
  tagStorageKey,
  canEdit: canEditRecord,
  persistTags: (names) => (supportsTags.value ? persistRecordTags(names) : Promise.resolve()),
  instanceTagSource: moduleKeyLower.value,
  fetchRecord
});
const getPeopleTagChipClass = computed(() => (supportsTags.value ? getTagChipClassFromComposable : getDefaultTagChipClass));

const layoutProps = computed(() => ({
  leftExpanded: !!expandedLeftSection.value,
  forceMobile: props.embed,
  class: [
    props.embed ? 'flex-1 min-h-0 overflow-hidden flex flex-col' : '',
    { 'record-page-layout--left-expanded': !!expandedLeftSection.value },
    '[&.record-page-layout--left-expanded_.record-page-layout__right]:hidden',
    '[&.record-page-layout--left-expanded_.record-page-layout__left]:flex-[1_1_100%] [&.record-page-layout--left-expanded_.record-page-layout__left]:max-w-full [&.record-page-layout--left-expanded_.record-page-layout__left]:pr-0 [&.record-page-layout--left-expanded_.record-page-layout__left]:min-h-0 [&.record-page-layout--left-expanded_.record-page-layout__left]:overflow-hidden',
    '[&.record-page-layout--left-expanded_.record-page-layout__left-content]:max-w-full [&.record-page-layout--left-expanded_.record-page-layout__left-content]:pl-0 [&.record-page-layout--left-expanded_.record-page-layout__left-content]:pr-0 [&.record-page-layout--left-expanded_.record-page-layout__left-content]:flex [&.record-page-layout--left-expanded_.record-page-layout__left-content]:flex-col [&.record-page-layout--left-expanded_.record-page-layout__left-content]:flex-1 [&.record-page-layout--left-expanded_.record-page-layout__left-content]:min-h-0',
    '[&.record-page-layout--left-expanded_.record-page-layout__body]:px-4'
  ]
}));

async function handleUnlinkGenericRelated(item, group, rec) {
  if (!rec?._id || !item?.id || !group?.key) return;
  const currentRef = { appKey: (recordContextAppKey.value || 'PLATFORM').toUpperCase(), moduleKey: (props.moduleKey || '').toLowerCase(), recordId: rec._id };
  const relatedRef = { appKey: (item.appKey || 'SALES').toUpperCase(), moduleKey: (item.moduleKey || '').toLowerCase(), recordId: item.id };
  const isCurrentSource = (item.direction || 'SOURCE').toUpperCase() === 'SOURCE';
  const source = isCurrentSource ? currentRef : relatedRef;
  const target = isCurrentSource ? relatedRef : currentRef;
  try {
    await apiClient.post('/relationships/unlink', {
      relationshipKey: group.key,
      source,
      target
    });
    invalidateRecordContext(recordContextAppKey.value, props.moduleKey, rec._id);
    await loadGenericRecordContext(true);
  } catch (err) {
    console.error('Error unlinking related record:', err);
    alert(err?.response?.data?.message || 'Error unlinking record. Please try again.');
  }
}

const rightPaneTabs = computed(() => [
  { id: 'activity', name: 'Activity' },
  { id: 'related', name: 'Related' },
  { id: 'details', name: 'Details' },
  { id: 'integrations', name: 'Integrations' }
]);

const ALLOWED_DESCRIPTION_TAGS = ['p', 'br', 'strong', 'em', 's', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'blockquote'];

const descriptionHistoryList = computed(() => {
  const rec = record.value;
  const data = descriptionVersionsData.value;
  if (!rec) return [];
  const current = {
    isCurrent: true,
    createdAt: rec.updatedAt || rec.createdAt || new Date(),
    createdBy: null,
    content: rec.description ?? rec.customFields?.description ?? ''
  };
  const currentUserName = authStore.user
    ? [authStore.user.firstName, authStore.user.lastName].filter(Boolean).join(' ').trim() || authStore.user.email
    : 'You';
  const list = [{ ...current, createdBy: currentUserName }];
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

const canViewDescriptionHistory = true;

function formatDescriptionVersionDate(date) {
  if (!date) return '';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function getPlainTextFromHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function diffWordsToHtml(oldText, newText) {
  const oldParts = String(oldText || '').split(/(\s+)/);
  const newParts = String(newText || '').split(/(\s+)/);
  const escape = (value) => {
    const el = document.createElement('div');
    el.textContent = value;
    return el.innerHTML;
  };
  const result = [];
  let oldIndex = 0;
  let newIndex = 0;
  while (oldIndex < oldParts.length || newIndex < newParts.length) {
    if (oldIndex < oldParts.length && newIndex < newParts.length && oldParts[oldIndex] === newParts[newIndex]) {
      result.push(escape(oldParts[oldIndex]));
      oldIndex += 1;
      newIndex += 1;
      continue;
    }
    if (newIndex < newParts.length && !oldParts.slice(oldIndex).includes(newParts[newIndex])) {
      result.push(`<ins class="bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-200 no-underline">${escape(newParts[newIndex])}</ins>`);
      newIndex += 1;
      continue;
    }
    if (oldIndex < oldParts.length) {
      result.push(`<del class="bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-200 line-through">${escape(oldParts[oldIndex])}</del>`);
      oldIndex += 1;
      continue;
    }
    if (newIndex < newParts.length) {
      result.push(`<ins class="bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-200 no-underline">${escape(newParts[newIndex])}</ins>`);
      newIndex += 1;
    }
  }
  return result.join('');
}

const descriptionHistorySelectedContent = computed(() => {
  const selected = descriptionHistoryList.value[selectedDescriptionVersionIndex.value];
  const raw = String(selected?.content || '');
  if (!raw.trim()) return '';
  return DOMPurify.sanitize(raw, { ALLOWED_TAGS: ALLOWED_DESCRIPTION_TAGS });
});

const descriptionHistoryShowDiff = computed(
  () => descriptionHistoryList.value.length > 1 && selectedDescriptionVersionIndex.value > 0
);

const descriptionHistoryDiffHtml = computed(() => {
  if (!descriptionHistoryShowDiff.value) return '';
  const list = descriptionHistoryList.value;
  const currentVersion = list[0];
  const selectedVersion = list[selectedDescriptionVersionIndex.value];
  if (!currentVersion || !selectedVersion) return '';
  const oldPlain = getPlainTextFromHtml(selectedVersion.content);
  const newPlain = getPlainTextFromHtml(currentVersion.content);
  const diffHtml = diffWordsToHtml(oldPlain, newPlain);
  return DOMPurify.sanitize(diffHtml, { ALLOWED_TAGS: ['ins', 'del'], ALLOWED_ATTR: ['class'] });
});

const descriptionHistorySelectedHasContent = computed(() => {
  const selected = descriptionHistoryList.value[selectedDescriptionVersionIndex.value];
  return Boolean(selected && String(selected.content || '').trim());
});

function openDescriptionHistory() {
  selectedDescriptionVersionIndex.value = 0;
  expandedLeftSection.value = 'description-history';
  fetchDescriptionVersions();
}

function closeExpandedLeftSection() {
  expandedLeftSection.value = '';
}

async function fetchDescriptionVersions() {
  if (!record.value?._id || !props.moduleKey) return;
  descriptionVersionsLoading.value = true;
  try {
    const res = await apiClient.get(`/modules/${props.moduleKey}/records/${props.recordId}/description-versions`);
    descriptionVersionsData.value = res?.data ?? { currentDescription: '', versions: [] };
  } catch (err) {
    console.error('Fetch description versions failed:', err);
    descriptionVersionsData.value = { currentDescription: '', versions: [] };
  } finally {
    descriptionVersionsLoading.value = false;
  }
}

async function restoreDescriptionVersion() {
  if (!record.value?._id || !props.moduleKey || selectedDescriptionVersionIndex.value === 0) return;
  descriptionRestoreLoading.value = true;
  try {
    const apiIndex = selectedDescriptionVersionIndex.value - 1;
    const response = await apiClient.post(
      `/modules/${props.moduleKey}/records/${props.recordId}/description-versions/restore`,
      { versionIndex: apiIndex }
    );
    const updated = response?.data?.data ?? response?.data;
    if (updated) {
      record.value = updated;
      closeExpandedLeftSection();
    }
  } catch (err) {
    console.error('Restore description version failed:', err);
  } finally {
    descriptionRestoreLoading.value = false;
  }
}

async function refreshRecordActivity() {
  if (!props.recordId || !props.moduleKey) return;
  try {
    const activityRes = await apiClient.get(`/modules/${props.moduleKey}/records/${props.recordId}/activity`);
    if (activityRes?.success && Array.isArray(activityRes.data)) {
      activityRaw.value = activityRes.data;
    }
  } catch (e) {
    console.warn('Refresh activity failed:', e);
  }
}

const genericAdapter = computed(() => {
  if (!record.value || !moduleDefinition.value) return null;
  return createGenericRecordAdapter({
    formatDate: (d) => (d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'),
    moduleDefinition: moduleDefinition.value,
    canEditDetails: () => canEditRecord.value,
    saveDetailField: async (fieldKey, value) => {
      const moduleKeyLower = (props.moduleKey || '').toLowerCase();

      // For people records, keep title, first_name, and last_name in sync.
      if (moduleKeyLower === 'people' && (fieldKey === 'first_name' || fieldKey === 'last_name')) {
        const current = record.value || {};
        const next = {
          first_name: fieldKey === 'first_name' ? value : current.first_name,
          last_name: fieldKey === 'last_name' ? value : current.last_name
        };
        const fullName = [next.first_name, next.last_name].filter(Boolean).join(' ').trim() || undefined;

        const payload = {
          first_name: next.first_name,
          last_name: next.last_name
        };
        if (fullName) payload.name = fullName;

        const response = await apiClient.put(`/${props.moduleKey}/${props.recordId}`, payload);
        const updatedRecord = response?.data?.data ?? response?.data ?? null;
        if (record.value && updatedRecord && typeof updatedRecord === 'object') {
          Object.assign(record.value, updatedRecord);
        } else if (record.value) {
          record.value.first_name = next.first_name;
          record.value.last_name = next.last_name;
          if (fullName) record.value.name = fullName;
        }
        await refreshRecordActivity();
        return;
      }

      const response = await apiClient.put(`/${props.moduleKey}/${props.recordId}`, { [fieldKey]: value });
      const updatedRecord = response?.data?.data ?? response?.data ?? null;
      if (record.value) {
        record.value[fieldKey] = value;
        if (updatedRecord && typeof updatedRecord === 'object') {
          Object.assign(record.value, updatedRecord);
        }
      }
      await refreshRecordActivity();
    },
    getRelatedGroups: () => genericRelatedGroupsFromContext.value,
    openRelatedItem: (item) => {
      const path = item?.recordPath || (item?.moduleKey && item?.id ? `/${item.moduleKey}/${item.id}` : null);
      if (path) openTab(path, { background: false, insertAdjacent: true });
    },
    canUnlinkRelated: () => genericRecordContextCanUnlink.value,
    onUnlinkRelated: handleUnlinkGenericRelated,
    canLinkRecords: canLinkRecords.value,
    openLinkRecordDrawer,
    openAddRecordDrawer,
    handleDescriptionSave: async (value) => {
      try {
        await apiClient.put(`/${props.moduleKey}/${props.recordId}`, { description: value });
        if (record.value) record.value.description = value;
      } catch (e) {
        console.error('Save description error:', e);
      }
    },
    canEditDescription: canEditRecord.value,
    expandedLeftSection,
    openLeftSection: (key) => { expandedLeftSection.value = key; },
    canViewDescriptionHistory,
    openDescriptionHistory,
    getEntityOptions: (fieldKey) => {
      const key = String(fieldKey || '').toLowerCase().trim();
      if ((props.moduleKey || '').toLowerCase() === 'people' && key === 'organization') {
        return peopleOrganizationList.value;
      }
      const fieldDef = (moduleDefinition.value?.fields || []).find(
        (f) => String(f?.key || '').toLowerCase().trim() === key
      );
      const dataType = String(fieldDef?.dataType || '').toLowerCase();
      if (dataType.includes('user') || key === 'assignedto' || key === 'ownerid' || key === 'owner') {
        return userLookupList.value;
      }
      return [];
    }
  });
});

const recordFieldContext = computed(() => resolveFieldContext(route.path, route.query));

const sectionContext = computed(() => {
  const base = {
    expandedLeftSection: expandedLeftSection.value,
    module: 'generic',
    moduleKey: props.moduleKey,
    openTab,
    fieldContext: recordFieldContext.value
  };
  if (supportsTags.value) {
    base.openTagsEditor = (event) => openTagPopoverFromField(event);
    base.getTagChipClass = typeof getPeopleTagChipClass.value === 'function' ? getPeopleTagChipClass.value : getDefaultTagChipClass;
  }
  return base;
});

const recordDetailsTabContext = computed(() => ({
  ...sectionContext.value,
  hideHeader: true
}));

const rightPaneAllModuleFields = computed(() => {
  if (!genericAdapter.value || !record.value) return [];
  const rows = genericAdapter.value.getAllModuleFields?.(record.value, sectionContext.value);
  return Array.isArray(rows) ? rows : [];
});

function isGenericDetailRowEmpty(row) {
  if (!row || row.key === 'source') return false;
  if (row.type === 'tags') {
    const v = row.value;
    return !Array.isArray(v) || v.length === 0;
  }
  const v = row.value;
  if (v != null && typeof v === 'object' && !Array.isArray(v)) {
    const dv = row.displayValue;
    return dv == null || String(dv).trim() === '';
  }
  if (v === false || v === 0) return false;
  if (v == null || v === '') return true;
  if (typeof v === 'string' && !String(v).trim()) return true;
  if (Array.isArray(v) && v.length === 0) return true;
  const dv = row.displayValue;
  if (dv == null || String(dv).trim() === '') return true;
  return false;
}

const rightPaneDetailsFilteredFields = computed(() => {
  const q = (detailsTabSearchQuery.value || '').trim().toLowerCase();
  let rows = rightPaneAllModuleFields.value;
  if (q) {
    rows = rows.filter((f) => {
      const label = String(f.label || '').toLowerCase();
      const key = String(f.key || '').toLowerCase();
      const dv = String(f.displayValue || '').toLowerCase();
      return label.includes(q) || key.includes(q) || dv.includes(q);
    });
  }
  if (!detailsShowEmptyFields.value) {
    rows = rows.filter((r) => !isGenericDetailRowEmpty(r));
  }
  return rows;
});

const detailsTabFieldCountLabel = computed(() => {
  const total = rightPaneAllModuleFields.value.length;
  const shown = rightPaneDetailsFilteredFields.value.length;
  const q = (detailsTabSearchQuery.value || '').trim();
  const hidingEmpty = !detailsShowEmptyFields.value;
  if (!total) return '';
  if (q && shown !== total) return `${shown} of ${total}`;
  if (hidingEmpty && shown !== total) return `${shown} shown · ${total} total`;
  return `${total} field${total === 1 ? '' : 's'}`;
});

const genericStateFields = computed(() => (genericAdapter.value ? genericAdapter.value.getStateFields(record.value, sectionContext.value) : []));
const genericStateValues = computed(() => (genericAdapter.value ? genericAdapter.value.getStateValues(record.value, sectionContext.value) : []));
const genericSections = computed(() => (genericAdapter.value ? genericAdapter.value.getSections(record.value) : []));

function getInitials(author) {
  if (!author) return '?';
  if (typeof author === 'string') {
    const parts = author.trim().split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.map((p) => p.charAt(0).toUpperCase()).join('') || author.charAt(0).toUpperCase() || '?';
  }
  const name = [author.firstName, author.lastName, author.first_name, author.last_name].filter(Boolean).join(' ') || author.email || author.username || '';
  return name ? name.trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('') || '?' : '?';
}

function getAuthorName(author) {
  if (!author) return 'Unknown';
  if (typeof author === 'string') return author.trim() || 'Unknown';
  const name = [author.firstName, author.lastName, author.first_name, author.last_name].filter(Boolean).join(' ').trim();
  return name || author.username || author.email || 'Unknown';
}

function formatFullTimestamp(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

function formatRelativeActivityTime(date) {
  if (!date) return '';
  return dateUtils.fromNow(date);
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const activityUi = computed(() => {
  const searchQuery = activitySearchQuery.value || '';
  const moduleUi = {
    moduleKey: props.moduleKey,
    recordId: props.recordId,
    currentUser: authStore.user || null,
    expandedTaskEmailThreads: expandedTaskEmailThreads.value,
    addComment: (content, attachments, parentCommentId) => addComment(content, attachments, parentCommentId),
    getInitials,
    getAuthorName,
    formatFullTimestamp,
    formatRelativeActivityTime: (date) => formatRelativeActivityTime(date),
    handleTimestampPointerUp: () => {},
    highlightSearchText: (text) => {
      if (!text) return '';
      const q = searchQuery.trim();
      if (!q) return String(text);
      const regex = new RegExp(`(${escapeRegExp(q)})`, 'gi');
      return String(text).replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 font-semibold">$1</mark>');
    },
    commentMentionsCurrentUser: () => false,
    hasAttachmentUrl: (att) => Boolean(att?.url || att?.path),
    getAttachmentUrl: (att) => att?.url || att?.path || '',
    isImageAttachment: (att) => /^image\//i.test(String(att?.mimetype || att?.type || '')) || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(String(att?.filename || att?.name || '')),
    isSvgAttachment: (att) => /svg/i.test(String(att?.mimetype || att?.type || '')) || /\.svg$/i.test(String(att?.filename || att?.name || '')),
    getAttachmentName: (att) => String(att?.filename || att?.name || 'attachment'),
    downloadAttachment: (att) => {
      const url = att?.url || att?.path;
      if (!url) return;
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.download = String(att?.filename || att?.name || 'attachment');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
    formatFileSize: (bytes) => {
      const n = Number(bytes || 0);
      if (n <= 0) return '0 B';
      if (n < 1024) return `${n} B`;
      if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
      return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    },
    getAttachmentLabel: (att) => {
      const parts = [];
      if (att?.mimetype) parts.push(String(att.mimetype));
      if (att?.size != null) parts.push(moduleUi.formatFileSize(att.size));
      return parts.join(' • ') || 'Attachment';
    },
    hasCommentReactions: () => false,
    getCommentReactions: () => [],
    isCommentReactionSelected: () => false,
    toggleCommentReaction: () => {},
    handleShowCommentReactionTooltip: () => {},
    handleHideCommentReactionTooltip: () => {},
    setCommentReactionButtonRef: () => {},
    toggleCommentReactionPicker: () => {},
    openCommentThread: () => {},
    getCommentThreadReplyCount: () => 0,
    getCommentThreadLatestReplyAuthor: () => null,
    isFieldChangeSystemEvent: (event) => {
      if (!event || event.type !== 'system') return false;
      const details = event?.details || event?.payload?.details || {};
      return (
        event.action === 'field_changed' ||
        event.action === 'status_changed' ||
        event.action === 'participation_changed' ||
        Boolean(details?.field)
      );
    },
    getSystemEventActorLabel: (event) => {
      if (!event) return 'System';
      const author = event.author ?? event.actor;
      if (author && typeof author === 'object') {
        const name = [author.firstName, author.lastName].filter(Boolean).join(' ').trim() || author.username || author.email;
        return name || 'System';
      }
      return typeof author === 'string' ? author : (event.actor || 'System');
    },
    getSystemEventFieldLabel: (event) => {
      const details = event?.details || event?.payload?.details || {};
      const raw = details.fieldLabel ?? details.field;
      return String(raw ?? '').trim() || 'field';
    },
    getSystemEventFromValue: (event) => {
      const v = event?.details?.from ?? event?.details?.oldValue ?? event?.payload?.details?.from ?? event?.payload?.details?.oldValue;
      return v === undefined || v === null || v === '' ? 'Empty' : String(v);
    },
    getSystemEventToValue: (event) => {
      const v = event?.details?.to ?? event?.details?.newValue ?? event?.payload?.details?.to ?? event?.payload?.details?.newValue;
      return v === undefined || v === null || v === '' ? 'Empty' : String(v);
    },
    getSystemEventMessage: (event) => {
      if (!event) return 'Updated this record';
      const msg = String(event?.message ?? event?.payload?.message ?? '').trim();
      if (msg) return msg;
      const action = String(event?.action || event?.payload?.action || 'updated').trim();
      const mod = (props.moduleKey || '').toLowerCase();
      if (action === 'record_created') {
        return mod === 'people' ? 'Created this person' : 'Created this record';
      }
      if (action === 'participation_attached') {
        return mod === 'people' ? 'Joined an app' : 'Updated app participation';
      }
      return `${action} this record`;
    },
    getTagChipClass: (tagNameOrObject) => (typeof getPeopleTagChipClass.value === 'function' ? getPeopleTagChipClass.value(tagNameOrObject) : getDefaultTagChipClass(tagNameOrObject)),
    handleShowMore: () => {},
    toggleTaskEmailThread: (threadId) => {
      const next = new Set(expandedTaskEmailThreads.value);
      if (next.has(threadId)) next.delete(threadId);
      else next.add(threadId);
      expandedTaskEmailThreads.value = next;
    },
    createTaskFromEmailMessage: () => {}
  };
  return normalizeActivityUiContract(moduleUi);
});

const MODULES_WITH_EMAIL = new Set(['people', 'organizations', 'deals', 'tasks']);

const activityEvents = computed(() => {
  const raw = activityRaw.value || [];
  const recordRef = { module: props.moduleKey, id: String(props.recordId) };
  const events = raw.map((e) => {
    if (e.type === 'system') {
      return normalizeSystemActivityEvent({
        _id: e.id,
        action: e.payload?.action,
        message: e.payload?.message,
        details: e.payload?.details,
        user: e.actorProfile || e.actor,
        timestamp: e.createdAt
      }, { recordRef });
    }
    if (e.type === 'comment') {
      const author = e.actorProfile && typeof e.actorProfile === 'object' ? e.actorProfile : e.actor;
      return normalizeCommentActivityEvent({
        _id: e.payload?.commentId || e.id,
        content: e.payload?.body,
        author,
        createdAt: e.createdAt,
        parentCommentId: e.payload?.parentCommentId,
        attachments: e.payload?.attachments || [],
        reactions: e.payload?.reactions || [],
        recordRef
      });
    }
    return null;
  }).filter(Boolean);
  return sortActivityEventsByDate(events);
});

/** Combined activity (logs + comments + email threads) for modules that support email. */
const combinedActivityEvents = computed(() => {
  const recordRef = { module: props.moduleKey, id: String(props.recordId) };
  const base = (activityEvents.value || []).filter((ev) => {
    if (ev?.type === 'system' && ev?.payload?.action === 'email_sent' && ev?.payload?.details?.communicationId) {
      return false;
    }
    return true;
  });
  if (!MODULES_WITH_EMAIL.has((props.moduleKey || '').toLowerCase())) {
    return base;
  }
  const threadEvents = (emailThreads.value || []).map((thread) =>
    normalizeEmailThreadActivityEvent({
      ...thread,
      recordRef,
      source: 'integration'
    })
  );
  return sortActivityEventsByDate([...base, ...threadEvents]);
});

/** Apply search + type filters for the Activity tab (generic modules). */
const filteredActivityEvents = computed(() => {
  const events = combinedActivityEvents.value || [];
  const showComments = activityFilterComments.value;
  const showUpdates = activityFilterUpdates.value;
  const showEmail = activityFilterEmail.value;

  if (!showComments && !showUpdates && !showEmail) return [];

  const q = (activitySearchQuery.value || '').trim().toLowerCase();

  // When searching, show only comment events whose content or author matches.
  if (q) {
    return events.filter((e) => {
      if (e.type !== 'comment') return false;
      const author = e.author;
      let authorText = '';
      if (author) {
        if (typeof author === 'string') {
          authorText = author;
        } else {
          authorText = [
            author.firstName,
            author.first_name,
            author.lastName,
            author.last_name,
            author.username,
            author.email
          ]
            .filter(Boolean)
            .join(' ');
        }
      }
      const text = `${e.content || e.text || ''} ${authorText}`.toLowerCase();
      return text.includes(q);
    });
  }

  // No search query: respect the type toggles.
  return events.filter((e) => {
    if (e.type === 'comment') return showComments;
    if (e.type === 'system') return showUpdates;
    if (e.type === 'email_thread') return showEmail;
    return false;
  });
});

async function fetchRecord() {
  if (!props.recordId || props.recordId === 'new') {
    loading.value = false;
    error.value = 'Invalid record';
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const [recordRes, modulesRes, activityRes, neighborsRes] = await Promise.all([
      apiClient.get(`/${props.moduleKey}/${props.recordId}`),
      apiClient.get('/modules'),
      apiClient.get(`/modules/${props.moduleKey}/records/${props.recordId}/activity`).catch(() => ({ success: true, data: [] })),
      apiClient.get(`/modules/${props.moduleKey}/records/${props.recordId}/neighbors`).catch(() => ({ success: true, data: { previousId: null, nextId: null } }))
    ]);

    if (recordRes?.success && recordRes?.data) {
      record.value = recordRes.data;
    } else if (recordRes && !recordRes.success) {
      record.value = null;
      error.value = recordRes?.message || 'Failed to load record';
    } else {
      const data = recordRes?.data ?? recordRes;
      record.value = data && !Array.isArray(data) ? data : null;
    }

    const modules = Array.isArray(modulesRes) ? modulesRes : modulesRes?.data ?? modulesRes?.data?.data ?? modulesRes?.modules ?? [];
    moduleDefinition.value = modules.find((m) => String(m?.key || '').toLowerCase() === props.moduleKey.toLowerCase()) || null;

    if (activityRes?.success && Array.isArray(activityRes.data)) activityRaw.value = activityRes.data;
    else activityRaw.value = [];

    if (neighborsRes?.success && neighborsRes.data) neighbors.value = neighborsRes.data;
    else neighbors.value = { previousId: null, nextId: null };

    if (MODULES_WITH_EMAIL.has((props.moduleKey || '').toLowerCase()) && record.value?._id) {
      try {
        const threadsRes = await apiClient.get('/communications/threads', {
          params: { moduleKey: props.moduleKey, recordId: record.value._id }
        });
        if (threadsRes?.success && Array.isArray(threadsRes?.data?.threads)) {
          emailThreads.value = threadsRes.data.threads;
        } else {
          emailThreads.value = [];
        }
      } catch {
        emailThreads.value = [];
      }
    } else {
      emailThreads.value = [];
    }

    if ((props.moduleKey || '').toLowerCase() === 'people') {
      try {
        const orgRes = await apiClient.get('/v2/organization', { params: { limit: 500 } });
        const data = orgRes?.data ?? orgRes;
        peopleOrganizationList.value = Array.isArray(data) ? data : (data?.data ? (Array.isArray(data.data) ? data.data : []) : []);
      } catch (e) {
        console.error('Fetch people organization list error:', e);
        peopleOrganizationList.value = [];
      }
    } else {
      peopleOrganizationList.value = [];
    }

    try {
      const usersRes = await apiClient.get('/users/list', { params: { limit: 500 } });
      const usersData = usersRes?.data ?? usersRes;
      const users = Array.isArray(usersData)
        ? usersData
        : (Array.isArray(usersData?.data) ? usersData.data : []);
      userLookupList.value = users.map((u) => ({
        _id: u?._id || u?.id,
        name: [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim() || u?.username || u?.email || (u?._id || u?.id || '')
      })).filter((u) => Boolean(u._id));
    } catch (userErr) {
      console.error('Fetch user lookup list error:', userErr);
      userLookupList.value = [];
    }
  } catch (e) {
    error.value = e?.message || 'Failed to load record';
    record.value = null;
  } finally {
    loading.value = false;
  }
}

async function addComment(content, attachments, parentCommentId) {
  try {
    await apiClient.post(`/modules/${props.moduleKey}/records/${props.recordId}/comments`, {
      content: typeof content === 'string' ? content : (content?.content || ''),
      parentCommentId: parentCommentId || null
    });
    await fetchRecord();
  } catch (e) {
    console.error('Add comment error:', e);
  }
}

function handleAddComment(payload) {
  const content = typeof payload === 'string' ? payload.trim() : String(payload?.content || '').trim();
  if (!content) return;
  addComment(content, [], null);
}

function handleTitleSave(value) {
  if (!record.value) return;

  const moduleKeyLower = (props.moduleKey || '').toLowerCase();
  const title = String(value || '').trim();
  if (!title) return;

  // People: parse title into first_name / last_name and keep name in sync.
  if (moduleKeyLower === 'people') {
    const parts = title.split(/\s+/).filter(Boolean);
    let firstName = '';
    let lastName = '';
    if (parts.length === 1) {
      firstName = parts[0];
    } else if (parts.length > 1) {
      lastName = parts.pop();
      firstName = parts.join(' ');
    }

    const payload = {
      name: title,
      first_name: firstName || undefined,
      last_name: lastName || undefined
    };

    apiClient.put(`/${props.moduleKey}/${props.recordId}`, payload).then(() => {
      if (!record.value) return;
      record.value.name = title;
      if (firstName !== undefined) record.value.first_name = firstName;
      if (lastName !== undefined) record.value.last_name = lastName;
    }).catch((e) => console.error('Save people title error:', e));
    return;
  }

  // Other modules: only update the generic name/title field.
  apiClient.put(`/${props.moduleKey}/${props.recordId}`, { name: title }).then(() => {
    if (record.value) record.value.name = title;
  }).catch((e) => console.error('Save title error:', e));
}

function goToPrevious() {
  if (!neighbors.value.previousId) return;
  const path = `/${props.moduleKey}/${neighbors.value.previousId}`;
  replaceActiveTab(path, { title: moduleLabelSingular.value || 'Record' });
}
function goToNext() {
  if (!neighbors.value.nextId) return;
  const path = `/${props.moduleKey}/${neighbors.value.nextId}`;
  replaceActiveTab(path, { title: moduleLabelSingular.value || 'Record' });
}

function copyUrl() {
  const url = window.location.href;
  if (typeof navigator.clipboard !== 'undefined' && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).catch(fallbackCopyUrl);
  } else {
    fallbackCopyUrl();
  }
  function fallbackCopyUrl() {
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

function getRecordPageUrl() {
  if (!record.value?._id) return '';
  const path = `/${props.moduleKey}/${record.value._id}`;
  const resolved = router.resolve(path);
  const href = resolved.href.startsWith('http') ? resolved.href : new URL(resolved.href, window.location.origin).href;
  return href;
}

function openRecordInNewTab() {
  if (!record.value?._id) return;
  const path = `/${props.moduleKey}/${record.value._id}`;
  openTab(path, { title: moduleLabelSingular.value || 'Record', background: false, insertAdjacent: true });
  emit('close');
}

function copyRecordUrl() {
  const url = getRecordPageUrl();
  if (!url) return;
  if (typeof navigator.clipboard !== 'undefined' && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).catch(() => {});
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

const DUPLICATE_OMIT_KEYS = new Set([
  '_id', '__v', 'createdAt', 'updatedAt', 'createdBy', 'modifiedBy',
  'deletedAt', 'deletedBy', 'deletionReason', 'activityLogs', 'organizationId'
]);

async function handleDuplicate() {
  if (!record.value) return;
  try {
    const r = record.value;
    const payload = {};
    for (const key of Object.keys(r)) {
      if (DUPLICATE_OMIT_KEYS.has(key)) continue;
      const v = r[key];
      if (v != null && typeof v === 'object' && v._id != null) {
        payload[key] = v._id;
      } else {
        payload[key] = v;
      }
    }
    const res = await apiClient.post(`/${props.moduleKey}`, payload);
    const data = res?.data ?? res;
    const newId = data?._id ?? data?.id;
    if (newId) {
      router.push(`/${props.moduleKey}/${newId}`);
    }
  } catch (e) {
    console.error('Duplicate record error:', e);
  }
}

function handleExport() {
  if (!record.value) return;
  try {
    const json = JSON.stringify(record.value, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `${props.moduleKey}-${(record.value._id || 'record').toString().slice(-8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  } catch (e) {
    console.error('Export record error:', e);
  }
}

async function handleEmailSubmit(payload) {
  showEmailModal.value = false;
  try {
    const res = await apiClient.post('/communications/email', payload);
    if (res?.success) {
      await fetchRecord();
    } else {
      alert(res?.message || 'Failed to send email');
    }
  } catch (err) {
    const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message;
    alert(msg || 'Failed to send email');
  }
}

function handleRecordUpdated(updated) {
  if (updated && record.value) Object.assign(record.value, updated);
  showEditModal.value = false;
}

async function handleAttachModalComplete() {
  showAttachModal.value = false;
  await fetchRecord();
}

const TARGET_APP_BY_MODULE_KEY = {
  organizations: 'SALES',
  people: 'SALES',
  deals: 'SALES',
  tasks: 'PLATFORM',
  events: 'PLATFORM',
  forms: 'PLATFORM',
  projects: 'PROJECTS',
  items: 'PLATFORM'
};

async function handleLinkRecordDrawerLinked({ moduleKey: targetModuleKey, ids, context, relationshipKey: payloadRelationshipKey, targetAppKey: payloadTargetAppKey, sourceIsCurrent: payloadSourceIsCurrent }) {
  const currentId = record.value?._id;
  const contextId = context?.personId ?? context?.sourceRecordId;
  if (!currentId || !contextId || !ids?.length) return;
  if (String(currentId) !== String(contextId)) return;

  const normalizedTarget = (targetModuleKey || '').toLowerCase().trim();
  const relationshipKey = (payloadRelationshipKey || normalizedTarget).toLowerCase();
  const sourceAppKey = (recordContextAppKey.value || 'PLATFORM').toUpperCase();
  const sourceModuleKey = (props.moduleKey || '').toLowerCase();
  const targetAppKey = (payloadTargetAppKey || TARGET_APP_BY_MODULE_KEY[normalizedTarget] || 'PLATFORM').toUpperCase();
  const sourceIsCurrent = payloadSourceIsCurrent !== false;

  for (const recordId of ids) {
    const linkPayload = sourceIsCurrent
      ? {
          relationshipKey,
          source: { appKey: sourceAppKey, moduleKey: sourceModuleKey, recordId: currentId },
          target: { appKey: targetAppKey, moduleKey: normalizedTarget, recordId }
        }
      : {
          relationshipKey,
          source: { appKey: targetAppKey, moduleKey: normalizedTarget, recordId },
          target: { appKey: sourceAppKey, moduleKey: sourceModuleKey, recordId: currentId }
        };
    try {
      await apiClient.post('/relationships/link', linkPayload);
    } catch (err) {
      console.error('Error linking record:', err);
      alert(err?.response?.data?.message || 'Failed to link record.');
      return;
    }
  }
  closeLinkRecordDrawer();
  invalidateRecordContext(recordContextAppKey.value, props.moduleKey, currentId);
  await loadGenericRecordContext(true);
  await fetchRecord();
}

function handleLinkRecordDrawerCreate(payload = {}) {
  const moduleKey = String(payload?.moduleKey || '').toLowerCase().trim();
  if (!moduleKey) return;
  pendingAddRelatedLinkPayload.value = payload;
  addRelatedRecordModuleKey.value = moduleKey;
  closeLinkRecordDrawer();
  showAddRelatedRecordDrawer.value = true;
}

async function handleAddRelatedRecordSaved(savedRecord) {
  const createdId = savedRecord?._id || savedRecord?.id;
  const payload = pendingAddRelatedLinkPayload.value;
  if (!createdId || !payload?.moduleKey) {
    closeAddRelatedRecordDrawer();
    return;
  }
  closeAddRelatedRecordDrawer();
  await handleLinkRecordDrawerLinked({
    moduleKey: payload.moduleKey,
    ids: [createdId],
    context: payload.context || linkRecordDrawerContext.value,
    relationshipKey: payload.relationshipKey || undefined,
    targetAppKey: payload.targetAppKey || undefined,
    sourceIsCurrent: payload.sourceIsCurrent ?? true
  });
}

async function confirmDelete() {
  deleting.value = true;
  try {
    await apiClient.delete(`/${props.moduleKey}/${props.recordId}`);
    router.push(`/${props.moduleKey}`);
    emit('close');
  } catch (e) {
    error.value = e?.message || 'Failed to delete';
  } finally {
    deleting.value = false;
    showDeleteModal.value = false;
  }
}

watch(loading, (isLoading) => {
  if (isLoading) return;
  attachStickyTitleWhenReady();
});

watch(record, (r) => {
  if (!r) {
    resetStickyTitle();
    detachStickyTitle();
    return;
  }
  attachStickyTitleWhenReady();
}, { immediate: true });

// Keep tab title in sync with people record name when record loads or name changes.
watch(
  () => {
    if (!isPeopleModule.value || !record.value) return null;
    const r = record.value;
    const first = (r.first_name ?? r.firstName ?? '').trim();
    const last = (r.last_name ?? r.lastName ?? '').trim();
    const full = [first, last].filter(Boolean).join(' ').trim();
    return full || r.name || r.email || 'Person';
  },
  (displayName) => {
    if (!displayName || !isPeopleModule.value) return;
    const tabId = activeTabId.value;
    if (!tabId || !props.recordId) return;
    const tab = findTabById(tabId);
    if (!tab?.path) return;
    const pathBase = tab.path.split('?')[0].replace(/\/$/, '');
    if (!pathBase.includes(`/people/${props.recordId}`)) return;
    updateTabTitle(tabId, displayName);
  },
  { immediate: true }
);

watch(() => [props.moduleKey, props.recordId], () => fetchRecord(), { immediate: false });
onMounted(() => {
  fetchRecord();
  window.addEventListener('scroll', updateTagPopoverPosition, true);
  window.addEventListener('resize', updateTagPopoverPosition);
  document.addEventListener('mousedown', handleTagPopoverMousedown);
  document.addEventListener('click', handleTagPopoverOutsideClick);
});
onBeforeUnmount(() => {
  resetStickyTitle();
  detachStickyTitle();
  window.removeEventListener('scroll', updateTagPopoverPosition, true);
  window.removeEventListener('resize', updateTagPopoverPosition);
  document.removeEventListener('mousedown', handleTagPopoverMousedown);
  document.removeEventListener('click', handleTagPopoverOutsideClick);
});
</script>
