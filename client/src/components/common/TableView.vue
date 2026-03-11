<template>
  <div class="-mx-4 -my-2 sm:-mx-6 lg:-mx-8">
    <div class="w-full py-2 align-middle">
      <div class="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900 overflow-hidden" style="position: relative; z-index: 1;">
        <div
          ref="scrollContainerRef"
          class="relative overflow-x-auto table-scroll-container rounded-xl"
          :class="{ 'overflow-y-auto': enableInternalScroll }"
          :style="{ ...scrollContainerStyles, width: '100%', maxWidth: '100%', isolation: 'auto' }"
          @scroll="handleScroll"
        >
          <div
            v-if="isResizing && resizeGuideX !== null && resizeGuideBounds"
            class="pointer-events-none fixed z-[999] w-0.5 bg-indigo-500"
            :style="{
              left: `${resizeGuideX}px`,
              top: `${resizeGuideBounds.top}px`,
              height: `${resizeGuideBounds.bottom - resizeGuideBounds.top}px`
            }"
          />
          <table
            ref="tableRef"
            class="divide-y divide-gray-200 text-sm text-gray-900 dark:divide-white/15 dark:text-gray-200"
            :style="{ width: tableMinWidth, minWidth: tableMinWidth, display: 'table', tableLayout: 'fixed' }"
          >
            <colgroup>
              <col v-if="selectable" style="width: 48px" />
              <col
                v-for="column in displayColumns"
                :key="`${columnKey(column)}-col`"
                :style="columnColStyle(column)"
              />
            </colgroup>
            <thead class="bg-white dark:bg-gray-900">
              <tr>
                <th
                  v-if="selectable"
                  scope="col"
                  :class="[
                    'relative px-7 sm:w-12 sm:px-6 sticky border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-gray-200 after:content-[\'\'] dark:after:bg-gray-700',
                    leftEdgeColumnIndex === 0 ? 'rounded-tl-xl' : '',
                    'hover:bg-gray-50 dark:hover:bg-gray-800'
                  ]"
                  :style="{ top: headerTop, left: '0px', zIndex: '25' }"
                >
                  <div class="absolute top-1/2 left-4 -mt-2">
                    <HeadlessCheckbox
                      :checked="allSelected"
                      :indeterminate="someSelected"
                      @change="toggleSelectAll"
                      @click.stop
                    />
                  </div>
                </th>
                <th
                  v-for="(column, columnIndex) in displayColumns"
                  :key="columnKey(column)"
                  scope="col"
                  :aria-sort="ariaSortForColumn(column)"
                  :class="[
                    'group sticky border-b border-gray-200 bg-white text-left text-xs font-semibold uppercase tracking-wide text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-gray-200 after:content-[\'\'] dark:after:bg-gray-700',
                    columnIndex === 0 ? 'title-column-cell z-15 sticky-column-border' : 'z-10',
                    // Apply border-radius only to columns at visible edges
                    (selectable ? columnIndex + 1 : columnIndex) === leftEdgeColumnIndex ? 'rounded-tl-xl' : '',
                    (selectable ? columnIndex + 1 : columnIndex) === rightEdgeColumnIndex ? 'rounded-tr-xl' : '',
                    // Add hover effect for sticky columns
                    'hover:bg-gray-50 dark:hover:bg-gray-800',
                    // Add shadow when scrolled
                    columnIndex === 0 && isScrolledHorizontally ? 'sticky-column-scrolled' : ''
                  ]"
                  :style="[{ top: headerTop }, columnHeaderStyle(column)]"
                >
                  <Menu v-if="isColumnSortable(column)" as="div" class="relative w-full">
                    <MenuButton
                      type="button"
                      class="group flex w-full items-center justify-between gap-2 px-5 py-3.5 text-left text-xs uppercase tracking-wide transition-colors focus:outline-none relative z-10"
                      :class="{
                        'cursor-pointer bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300': isColumnSorted(column),
                        'cursor-pointer text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800': !isColumnSorted(column)
                      }"
                    >
                      <span class="flex items-center gap-2 truncate">
                        <span class="truncate">{{ columnLabel(column) }}</span>
                        <span
                          class="relative flex items-center justify-center rounded-md p-1 transition-opacity cursor-pointer"
                          :class="{
                            'opacity-100 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300': isColumnSorted(column),
                            'opacity-0 text-gray-400 group-hover:opacity-100 hover:bg-gray-200 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300': !isColumnSorted(column)
                          }"
                          role="button"
                          tabindex="-1"
                          :aria-label="`Toggle sort for ${columnLabel(column)}`"
                          @click.stop="toggleSort(column)"
                        >
                          <template v-if="isColumnSorted(column)">
                            <span class="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-1 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
                              <span>{{ sortOrderValue === 'asc' ? '↑' : '↓' }}</span>
                              <span>1</span>
                            </span>
                          </template>
                          <template v-else>
                            <ArrowsUpDownIcon class="h-3.5 w-3.5" />
                          </template>
                        </span>
                      </span>
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
                        class="absolute left-0 z-[70] mt-2 w-52 origin-top-left rounded-lg border border-gray-200 bg-white py-1 shadow-lg focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                      >
                        <MenuItem v-slot="{ active }">
                          <button
                            type="button"
                            class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-normal"
                            :class="active ? 'bg-gray-100 dark:bg-gray-700' : ''"
                            @click="applyExplicitSort(column, 'asc')"
                          >
                            <ChevronUpIcon class="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            <span>Sort ascending</span>
                            <CheckIcon
                              v-if="isColumnSorted(column) && sortOrderValue === 'asc'"
                              class="ml-auto h-4 w-4 flex-shrink-0 text-indigo-600 dark:text-indigo-400"
                            />
                          </button>
                        </MenuItem>
                        <MenuItem v-slot="{ active }">
                          <button
                            type="button"
                            class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-normal"
                            :class="active ? 'bg-gray-100 dark:bg-gray-700' : ''"
                            @click="applyExplicitSort(column, 'desc')"
                          >
                            <ChevronDownIcon class="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            <span>Sort descending</span>
                            <CheckIcon
                              v-if="isColumnSorted(column) && sortOrderValue === 'desc'"
                              class="ml-auto h-4 w-4 flex-shrink-0 text-indigo-600 dark:text-indigo-400"
                            />
                          </button>
                        </MenuItem>
                        <MenuItem v-if="isColumnSorted(column)" v-slot="{ active }">
                          <button
                            type="button"
                            class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-normal"
                            :class="active ? 'bg-gray-100 dark:bg-gray-700' : ''"
                            @click="clearSort(column)"
                          >
                            <XMarkIcon class="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            <span>Clear sort</span>
                          </button>
                        </MenuItem>
                      </MenuItems>
                    </transition>
                  </Menu>
                  <span v-else class="block px-5 py-3.5 truncate">{{ columnLabel(column) }}</span>
                  <span
                    v-if="isColumnResizable(column)"
                    class="group/resize absolute top-0 right-0 z-20 h-full w-3 cursor-col-resize select-none flex items-center justify-center"
                    @mousedown.prevent.stop="startColumnResize(column, $event)"
                    aria-hidden="true"
                  >
                    <!-- <span class="pointer-events-none absolute right-[-2px] top-0 bottom-0 w-1.5 bg-indigo-500 opacity-0 transition-opacity group-hover/resize:opacity-100" /> -->
                  </span>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
              <template v-if="isLoading">
                <tr
                  v-for="rowIndex in skeletonRowTotal"
                  :key="`skeleton-row-${rowIndex}`"
                  class="bg-white/60 pointer-events-none dark:bg-gray-900/60"
                >
                  <td
                    v-if="selectable"
                    class="px-5 py-4 align-middle sticky z-20 bg-white dark:bg-gray-900"
                    :style="{ width: '48px', minWidth: '48px', left: '0px' }"
                  >
                    <div class="flex items-center justify-center">
                      <div class="h-4 w-4 rounded border border-gray-300 bg-gray-200/80 animate-pulse dark:border-gray-600 dark:bg-gray-700/70"></div>
                    </div>
                  </td>
                  <td
                    v-for="(column, columnIndex) in displayColumns"
                    :key="`skeleton-cell-${rowIndex}-${columnKey(column)}`"
                    :class="[
                      'px-5 py-4 align-middle',
                      columnIndex === 0 ? 'sticky z-20 bg-white dark:bg-gray-900 group-hover:bg-gray-100 dark:group-hover:bg-gray-800 transition-colors sticky-column-border' : ''
                    ]"
                    :style="columnCellStyle(column)"
                  >
                    <!-- First column: Show content and actions skeleton side by side -->
                    <div v-if="columnIndex === 0 && hasActions" class="flex items-center justify-between gap-3">
                      <div class="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          class="h-8 w-8 flex-shrink-0 rounded-full bg-gray-200/80 animate-pulse dark:bg-gray-700/70"
                          :style="skeletonPulseDelay(rowIndex - 1, columnIndex)"
                        ></div>
                        <div class="flex-1 space-y-2">
                          <div
                            class="h-3 rounded-md bg-gray-200 animate-pulse dark:bg-gray-700"
                            :style="skeletonStyleForCell(rowIndex - 1, columnIndex)"
                          ></div>
                          <div
                            v-if="shouldRenderSecondarySkeleton(columnIndex)"
                            class="h-2 rounded-md bg-gray-200/80 animate-pulse dark:bg-gray-700/70"
                            :style="skeletonStyleForCell(rowIndex - 1, columnIndex, 1)"
                          ></div>
                        </div>
                      </div>
                      <div class="flex-shrink-0 flex items-center gap-1">
                        <div class="h-8 w-8 rounded-lg bg-gray-200/80 animate-pulse dark:bg-gray-700/70"></div>
                        <div class="h-8 w-8 rounded-lg bg-gray-200/80 animate-pulse dark:bg-gray-700/70"></div>
                        <div class="h-8 w-8 rounded-lg bg-gray-200/80 animate-pulse dark:bg-gray-700/70"></div>
                      </div>
                    </div>
                    <!-- Other columns: Normal skeleton rendering -->
                    <div v-else class="flex items-center gap-3">
                      <div
                        v-if="columnIndex === 0"
                        class="h-8 w-8 flex-shrink-0 rounded-full bg-gray-200/80 animate-pulse dark:bg-gray-700/70"
                        :style="skeletonPulseDelay(rowIndex - 1, columnIndex)"
                      ></div>
                      <div class="flex-1 space-y-2">
                        <div
                          class="h-3 rounded-md bg-gray-200 animate-pulse dark:bg-gray-700"
                          :style="skeletonStyleForCell(rowIndex - 1, columnIndex)"
                        ></div>
                        <div
                          v-if="shouldRenderSecondarySkeleton(columnIndex)"
                          class="h-2 rounded-md bg-gray-200/80 animate-pulse dark:bg-gray-700/70"
                          :style="skeletonStyleForCell(rowIndex - 1, columnIndex, 1)"
                        ></div>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
              <template v-else>
                <template v-if="displayRows.length > 0">
                  <tr
                    v-for="(row, rowIndex) in displayRows"
                    :key="rowIdentifier(row, rowIndex)"
                    :class="[
                      'group transition-colors cursor-pointer',
                      isRowSelected(row) 
                        ? 'bg-gray-50 dark:bg-indigo-950' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    ]"
                    @click="handleRowClick(row, $event)"
                  >
                    <td
                      v-if="selectable"
                      :class="[
                        'relative px-7 sm:w-12 sm:px-6 sticky z-20 transition-colors',
                        rowHeightClass,
                        isRowSelected(row) ? 'bg-gray-50 dark:bg-indigo-950' : 'bg-white dark:bg-gray-900',
                        isRowSelected(row) ? '' : 'group-hover:bg-gray-100 dark:group-hover:bg-gray-800'
                      ]"
                      :style="{ left: '0px' }"
                    >
                      <div v-if="isRowSelected(row)" class="hidden group-has-checked:block absolute inset-y-0 left-0 w-0.5 bg-indigo-600"></div>
                      <div class="absolute top-1/2 left-4 -mt-2">
                        <HeadlessCheckbox
                          :checked="isRowSelected(row)"
                          @change.stop="toggleRowSelection(row)"
                          @click.stop
                        />
                      </div>
                    </td>
                    <td
                      v-for="(column, columnIndex) in displayColumns"
                      :key="cellKey(column)"
                      :class="[
                        'px-5 text-sm text-gray-700 align-middle dark:text-gray-200',
                        rowHeightClass,
                        columnIndex === 0 ? [
                          'title-column-cell sticky z-20 transition-colors sticky-column-border',
                          isRowSelected(row) ? 'bg-gray-50 dark:bg-indigo-950' : 'bg-white dark:bg-gray-900',
                          isRowSelected(row) ? '' : 'group-hover:bg-gray-100 dark:group-hover:bg-gray-800',
                          isScrolledHorizontally ? 'sticky-column-scrolled' : ''
                        ].join(' ') : 'whitespace-nowrap'
                      ]"
                      :style="columnCellStyle(column)"
                    >
                      <!-- First column: Show content and actions side by side -->
                      <div v-if="columnIndex === 0 && hasActions" class="flex items-center justify-between gap-3">
                        <div class="flex-1 min-w-0 truncate">
                          <slot
                            :name="`cell-${columnKey(column)}`"
                            :column="column"
                            :row="row"
                            :value="resolveValue(row, column)"
                          >
                            <slot name="cell" :column="column" :row="row" :value="resolveValue(row, column)">
                              {{ resolveValue(row, column) }}
                            </slot>
                          </slot>
                        </div>
                        <div 
                          class="flex-shrink-0 transition-opacity duration-200 opacity-0 group-hover:opacity-100" 
                          @click.stop
                        >
                          <slot name="actions" :row="row" />
                        </div>
                      </div>
                      <!-- Other columns: Normal rendering; first column content truncates -->
                      <template v-else>
                        <div v-if="columnIndex === 0" class="min-w-0 truncate">
                          <slot
                            :name="`cell-${columnKey(column)}`"
                            :column="column"
                            :row="row"
                            :value="resolveValue(row, column)"
                          >
                            <slot name="cell" :column="column" :row="row" :value="resolveValue(row, column)">
                              {{ resolveValue(row, column) }}
                            </slot>
                          </slot>
                        </div>
                        <slot
                          v-else
                          :name="`cell-${columnKey(column)}`"
                          :column="column"
                          :row="row"
                          :value="resolveValue(row, column)"
                        >
                          <slot name="cell" :column="column" :row="row" :value="resolveValue(row, column)">
                            {{ resolveValue(row, column) }}
                          </slot>
                        </slot>
                      </template>
                    </td>
                  </tr>
                </template>
                <tr v-else>
                  <td :colspan="selectable ? displayColumns.length + 1 : displayColumns.length" class="px-5 py-10 text-center">
                    <slot name="empty">
                      <div class="flex flex-col items-center justify-center py-8">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">{{ emptyTitle || 'No data available' }}</h3>
                        <p class="text-sm text-gray-600 dark:text-gray-400">{{ emptyMessage || 'No records found.' }}</p>
                      </div>
                    </slot>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import { ArrowsUpDownIcon, ChevronDownIcon, ChevronUpIcon, CheckIcon, XMarkIcon } from '@heroicons/vue/20/solid'
import { formatRawValueForDisplay } from '@/utils/fieldDisplay'
import HeadlessCheckbox from '@/components/ui/HeadlessCheckbox.vue'

type ColumnObjectDef = {
  key?: string
  label?: string
  width?: number | string
  minWidth?: number | string
  sortable?: boolean
  sortKey?: string
  resizable?: boolean
  locked?: boolean
  dataType?: string
}
type ColumnDef = ColumnObjectDef | string
type RowData = Record<string, unknown>

const DEFAULT_STICKY_OFFSET = 72
const DEFAULT_COLUMN_WIDTH = 200
type SortOrder = 'asc' | 'desc'
type SortState = SortOrder | null

type ColumnWidths = Record<string, number>

const parseWidthValue = (value?: number | string) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }

  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}

const emit = defineEmits<{
  (e: 'row-click', row: RowData, event: MouseEvent): void
  (e: 'sort', payload: { key: string; order: SortState }): void
  (e: 'select', selectedRows: RowData[]): void
  (e: 'bulk-action', payload: { action: string; selectedRows: RowData[] }): void
}>()

const props = withDefaults(
  defineProps<{
    columns?: ColumnDef[]
    rows?: RowData[]
    data?: RowData[]
    rowKey?: string
    stickyOffset?: string | number
    internalScroll?: boolean
    maxBodyHeight?: string | number
    sortField?: string
    sortOrder?: SortOrder
    tableId?: string
    resizableColumns?: boolean
    loading?: boolean
    skeletonRowCount?: number
    rowHeight?: 'small' | 'medium' | 'large' | 'huge'
    resetWidths?: number
    selectable?: boolean
    massActions?: Array<{ label: string; icon?: string; action: string; variant?: string }>
    clearSelectionTrigger?: number
    hasActions?: boolean
    emptyTitle?: string
    emptyMessage?: string
  }>(),
  {
    columns: () => [],
    rows: () => [],
    data: () => [],
    rowKey: 'id',
    stickyOffset: 'var(--table-sticky-offset, 64px)',
    internalScroll: false,
    maxBodyHeight: undefined,
    sortField: '',
    sortOrder: 'asc',
    tableId: '',
    resizableColumns: true,
    loading: false,
    skeletonRowCount: undefined,
    rowHeight: 'medium',
    selectable: false,
    massActions: () => [],
    clearSelectionTrigger: 0,
    hasActions: false
  }
)

const storageKey = computed(() =>
  props.tableId ? `table-column-widths-${props.tableId}` : ''
)

const columnWidths = ref<ColumnWidths>({})
const isResizing = ref(false)
const activeResize = ref<{ key: string; startWidth: number; startEdgeX: number; column: ColumnDef } | null>(null)
const resizeGuideX = ref<number | null>(null)
const resizeGuideBounds = ref<{ top: number; bottom: number } | null>(null)
let saveTimeout: ReturnType<typeof setTimeout> | undefined
const tableRef = ref<HTMLTableElement | null>(null)
const scrollContainerRef = ref<HTMLDivElement | null>(null)
const leftEdgeColumnIndex = ref<number | null>(null)
const rightEdgeColumnIndex = ref<number | null>(null)
const isScrolledHorizontally = ref(false)
const sampleColumns: ColumnDef[] = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'status', label: 'Status', sortable: true }
]

const providedRows = computed<RowData[]>(() => {
  if (props.rows && props.rows.length > 0) {
    return props.rows
  }
  if (props.data && props.data.length > 0) {
    return props.data
  }
  return []
})

const displayColumns = computed(() => {
  const columns = Array.isArray(props.columns) ? props.columns : []
  // When tableId exists, never use sampleColumns - wait for real columns so we don't
  // overwrite persisted widths with placeholder keys (id, name, email, status)
  if (columns.length > 0) return columns
  return props.tableId ? [] : sampleColumns
})

const displayRows = computed(() => providedRows.value)

const tableMinWidth = computed(() => {
  if (displayColumns.value.length === 0) {
    return '100%'
  }

  // Table width = exact sum of column widths so only the resized column changes
  let total = props.selectable ? 48 : 0
  displayColumns.value.forEach(column => {
    total += getColumnWidth(column)
  })

  return `${total}px`
})

const columnKey = (column: ColumnDef) => {
  if (typeof column === 'string') return column
  return column.key ?? String(column.label ?? '')
}

const cellKey = (column: ColumnDef) => `${columnKey(column)}-cell`

const sortKeyForColumn = (column: ColumnDef) => {
  if (typeof column === 'string') return ''
  return column.sortKey ?? column.key ?? ''
}

const columnLabel = (column: ColumnDef) => {
  if (typeof column === 'string') return column
  return column.label ?? column.key ?? ''
}

const isColumnSortable = (column: ColumnDef) => {
  if (typeof column === 'string') return false
  if (column.sortable === false) return false
  return Boolean(sortKeyForColumn(column))
}

// Title/frozen column: first in list or explicitly locked (by key so it works with merged column objects)
const isFirstColumn = (column: ColumnDef) => {
  const cols = displayColumns.value
  if (cols.length === 0) return false
  const first = cols[0]
  if (!first) return false
  if (typeof column === 'object' && column && (column as ColumnObjectDef).locked) return true
  return columnKey(first) === columnKey(column)
}

const FIRST_COLUMN_MIN = 380
const FIRST_COLUMN_MAX = 600
const DEFAULT_COLUMN_MIN = 200

const getColumnMinWidth = (column: ColumnDef) => {
  return isFirstColumn(column) ? FIRST_COLUMN_MIN : DEFAULT_COLUMN_MIN
}

const getColumnMaxWidth = (column: ColumnDef) => {
  return isFirstColumn(column) ? FIRST_COLUMN_MAX : undefined
}

const getColumnDefaultWidth = (column: ColumnDef) => {
  const configuredWidth =
    typeof column === 'string'
      ? undefined
      : parseWidthValue(column.width)
  const base = configuredWidth ?? DEFAULT_COLUMN_WIDTH
  return Math.max(base, getColumnMinWidth(column))
}

const getColumnWidth = (column: ColumnDef) => {
  const key = columnKey(column)
  const stored = columnWidths.value[key]
  let width = stored && stored > 0 ? stored : getColumnDefaultWidth(column)
  width = Math.max(width, getColumnMinWidth(column))
  const maxW = getColumnMaxWidth(column)
  return maxW !== undefined ? Math.min(width, maxW) : width
}

const columnColStyle = (column: ColumnDef) => {
  const width = getColumnWidth(column)
  const minWidth = getColumnMinWidth(column)
  const maxW = getColumnMaxWidth(column)
  const style: Record<string, string> = { width: `${width}px`, minWidth: `${minWidth}px` }
  if (maxW !== undefined) style.maxWidth = `${maxW}px`
  return style
}

const columnHeaderStyle = (column: ColumnDef) => {
  const width = getColumnWidth(column)
  const isFirstCol = isFirstColumn(column)
  const checkboxWidth = 48 // Width of checkbox column

  const style: Record<string, string> = {
    width: `${width}px`,
    minWidth: `${getColumnMinWidth(column)}px`
  }
  const maxW = getColumnMaxWidth(column)
  if (maxW !== undefined) style.maxWidth = `${maxW}px`
  if (isFirstCol) style.overflow = 'hidden'

  // Make first data column sticky horizontally
  // Header needs higher z-index (25) than cells (20) to stay on top when scrolling
  // Border and shadow are handled via CSS class (sticky-column-border) for better visibility
  if (isFirstCol && props.selectable) {
    style.position = 'sticky'
    style.left = `${checkboxWidth}px`
    style.zIndex = '25' // Higher than cell z-index (20)
  } else if (isFirstCol && !props.selectable) {
    style.position = 'sticky'
    style.left = '0px'
    style.zIndex = '25' // Higher than cell z-index (20)
  }
  
  return style
}

const rowHeightClasses = {
  small: 'py-2',
  medium: 'py-4',
  large: 'py-6',
  huge: 'py-8'
}

const rowHeightClass = computed(() => rowHeightClasses[props.rowHeight] || rowHeightClasses.medium)

const columnCellStyle = (column: ColumnDef) => {
  const width = getColumnWidth(column)
  const isFirstCol = isFirstColumn(column)
  const checkboxWidth = 48 // Width of checkbox column

  const style: Record<string, string> = {
    width: `${width}px`,
    minWidth: `${getColumnMinWidth(column)}px`
  }
  const maxW = getColumnMaxWidth(column)
  if (maxW !== undefined) style.maxWidth = `${maxW}px`
  if (isFirstCol) style.overflow = 'hidden'

  // Make first data column sticky horizontally
  // Cells use z-20 (set via class), so don't override z-index here
  // Border and shadow are handled via CSS class (sticky-column-border) for better visibility
  if (isFirstCol && props.selectable) {
    style.position = 'sticky'
    style.left = `${checkboxWidth}px`
    // z-index is set via class (z-20), don't override
  } else if (isFirstCol && !props.selectable) {
    style.position = 'sticky'
    style.left = '0px'
    // z-index is set via class (z-20), don't override
  }

  return style
}

const isColumnResizable = (column: ColumnDef) => {
  if (!props.resizableColumns) return false
  if (typeof column !== 'string' && column.resizable === false) return false
  return true
}

const queueSaveWidths = () => {
  if (!storageKey.value) return
  if (Object.keys(columnWidths.value).length === 0) return // Don't overwrite stored with empty
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem(storageKey.value, JSON.stringify(columnWidths.value))
    } catch (error) {
      console.warn('Failed to save column widths', error)
    }
  }, 150)
}

const flushColumnWidths = () => {
  if (!storageKey.value) return
  if (saveTimeout) {
    clearTimeout(saveTimeout)
    saveTimeout = undefined
  }
  try {
    localStorage.setItem(storageKey.value, JSON.stringify(columnWidths.value))
  } catch (error) {
    console.warn('Failed to save column widths', error)
  }
}

const ensureColumnWidths = () => {
  const cols = displayColumns.value
  if (cols.length === 0) return // Preserve stored widths when columns load async
  const next: ColumnWidths = {}
  cols.forEach((column) => {
    const key = columnKey(column)
    const minW = getColumnMinWidth(column)
    const maxW = getColumnMaxWidth(column)
    const existing = columnWidths.value[key]
    let width = existing && existing > 0 ? existing : getColumnDefaultWidth(column)
    width = Math.max(width, minW)
    if (maxW !== undefined) width = Math.min(width, maxW)
    next[key] = width
  })
  columnWidths.value = next
}

const loadStoredWidths = () => {
  if (!storageKey.value) return
  const raw = localStorage.getItem(storageKey.value)
  if (!raw) return

  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      const sanitized: ColumnWidths = {}
      Object.entries(parsed as Record<string, number | string>).forEach(([key, value]) => {
        let width = parseWidthValue(value)
        if (width && width > 0) {
          const column = displayColumns.value.find((c) => columnKey(c) === key)
          if (column) {
            width = Math.max(width, getColumnMinWidth(column))
            const maxW = getColumnMaxWidth(column)
            if (maxW !== undefined) width = Math.min(width, maxW)
          }
          sanitized[key] = width
        }
      })
      columnWidths.value = { ...columnWidths.value, ...sanitized }
    }
  } catch (error) {
    console.warn('Failed to parse stored column widths', error)
  }
}

watch(displayColumns, () => {
  ensureColumnWidths()
}, { immediate: true })

watch(
  () => props.columns,
  () => {
    ensureColumnWidths()
  },
  { deep: true }
)

watch(columnWidths, () => {
  queueSaveWidths()
}, { deep: true })

// Watch for resetWidths prop to clear column widths
watch(() => props.resetWidths, (newVal) => {
  if (newVal && newVal > 0) {
    columnWidths.value = {}
    ensureColumnWidths()
  }
})

const updateEdgeColumns = () => {
  if (!scrollContainerRef.value || !tableRef.value) return
  
  const container = scrollContainerRef.value
  const containerRect = container.getBoundingClientRect()
  const containerLeft = containerRect.left
  const containerRight = containerRect.right
  
  // Find all header cells
  const headerCells = tableRef.value.querySelectorAll('thead th')
  let leftEdgeIdx: number | null = null
  let rightEdgeIdx: number | null = null
  
  headerCells.forEach((cell, index) => {
    const cellRect = cell.getBoundingClientRect()
    const cellLeft = cellRect.left
    const cellRight = cellRect.right
    
    // Check if cell is at or near the left edge (within 5px tolerance)
    if (cellLeft <= containerLeft + 5 && cellRight > containerLeft) {
      leftEdgeIdx = index
    }
    
    // Check if cell is at or near the right edge (within 5px tolerance)
    if (cellRight >= containerRight - 5 && cellLeft < containerRight) {
      rightEdgeIdx = index
    }
  })
  
  leftEdgeColumnIndex.value = leftEdgeIdx
  rightEdgeColumnIndex.value = rightEdgeIdx
}

const handleScroll = () => {
  updateEdgeColumns()
  // Check if scrolled horizontally
  if (scrollContainerRef.value) {
    isScrolledHorizontally.value = scrollContainerRef.value.scrollLeft > 0
  }
}

const handleBeforeUnload = () => {
  flushColumnWidths()
}

onMounted(() => {
  loadStoredWidths()
  ensureColumnWidths()
  // Flush on page refresh/close so widths persist across sessions
  window.addEventListener('beforeunload', handleBeforeUnload)
  // Initial check for edge columns and scroll position
  setTimeout(() => {
    updateEdgeColumns()
    // Initial check for horizontal scroll
    if (scrollContainerRef.value) {
      isScrolledHorizontally.value = scrollContainerRef.value.scrollLeft > 0
    }
  }, 100)
  
  // Update on resize
  window.addEventListener('resize', updateEdgeColumns)
})

const sortFieldValue = computed(() => props.sortField ?? '')
const sortOrderValue = computed(() => props.sortOrder ?? 'asc')

const isColumnSorted = (column: ColumnDef) =>
  isColumnSortable(column) && sortKeyForColumn(column) === sortFieldValue.value

const ariaSortForColumn = (column: ColumnDef) => {
  if (!isColumnSortable(column)) return 'none'
  if (!isColumnSorted(column)) return 'none'
  return sortOrderValue.value === 'asc' ? 'ascending' : 'descending'
}

const toggleSort = (column: ColumnDef) => {
  if (!isColumnSortable(column)) return
  const key = sortKeyForColumn(column)
  if (!key) return

  const nextOrder: SortOrder = isColumnSorted(column)
    ? (sortOrderValue.value === 'asc' ? 'desc' : 'asc')
    : 'asc'

  emit('sort', { key, order: nextOrder })
}

const applyExplicitSort = (column: ColumnDef, order: SortOrder) => {
  if (!isColumnSortable(column)) return
  const key = sortKeyForColumn(column)
  if (!key) return
  emit('sort', { key, order })
}

const clearSort = (column: ColumnDef) => {
  if (!isColumnSortable(column)) return
  const key = sortKeyForColumn(column)
  if (!key) return
  emit('sort', { key, order: null })
}

const rowKey = computed(() => props.rowKey)

const rowIdentifier = (row: RowData, rowIndex: number) => {
  const key = rowKey.value
  const value = key ? row?.[key] : undefined
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'symbol') {
    return value
  }
  return rowIndex
}

const parseOffsetToCss = (offset: string | number | undefined): string => {
  if (typeof offset === 'number' && !Number.isNaN(offset)) {
    return `${offset}px`
  }

  if (!offset) {
    return `${DEFAULT_STICKY_OFFSET}px`
  }

  if (typeof offset === 'string') {
    return offset
  }

  return `${DEFAULT_STICKY_OFFSET}px`
}

const stickyTop = computed(() => parseOffsetToCss(props.stickyOffset))
const headerTop = computed(() => (props.internalScroll ? '0px' : stickyTop.value))

const enableInternalScroll = computed(() => props.internalScroll)

const maxHeightStyle = computed(() => {
  if (!enableInternalScroll.value) {
    return undefined
  }

  if (props.maxBodyHeight !== undefined) {
    if (typeof props.maxBodyHeight === 'number') {
      return `${props.maxBodyHeight}px`
    }
    return props.maxBodyHeight
  }

  return `calc(100vh - ${stickyTop.value})`
})

const scrollContainerStyles = computed(() => {
  const styles: Record<string, string | undefined> = {}
  
  if (enableInternalScroll.value) {
    styles.maxHeight = maxHeightStyle.value
    styles.overflowY = 'auto'
  }
  
  return styles
})

let scrollBoundsHandler: (() => void) | null = null

const cleanupResizeListeners = () => {
  window.removeEventListener('mousemove', handleColumnResize)
  window.removeEventListener('mouseup', stopColumnResize)
  if (scrollBoundsHandler) {
    window.removeEventListener('scroll', scrollBoundsHandler, true)
    scrollContainerRef.value?.removeEventListener('scroll', scrollBoundsHandler)
    scrollBoundsHandler = null
  }
  document.body.style.cursor = ''
  document.body.style.removeProperty('user-select')
  resizeGuideX.value = null
  resizeGuideBounds.value = null
}

const updateResizeGuideBounds = () => {
  const container = scrollContainerRef.value
  if (!container) return
  const rect = container.getBoundingClientRect()
  resizeGuideBounds.value = { top: rect.top, bottom: rect.bottom }
}

/** Get the header cell for a column by key (for guide positioning). */
const getThForColumn = (key: string): HTMLElement | null => {
  const table = tableRef.value
  if (!table) return null
  const colIndex = displayColumns.value.findIndex((c) => columnKey(c) === key)
  if (colIndex < 0) return null
  const thIndex = (props.selectable ? 1 : 0) + colIndex
  const ths = table.querySelectorAll('thead tr th')
  return (ths[thIndex] as HTMLElement) ?? null
}

const handleColumnResize = (event: MouseEvent) => {
  event.preventDefault()
  const state = activeResize.value
  if (!state) return

  const delta = event.clientX - state.startEdgeX
  // Skip update until user has actually moved (prevents jump on click)
  if (Math.abs(delta) < 1) {
    const th = getThForColumn(state.key)
    if (th) {
      resizeGuideX.value = th.getBoundingClientRect().right
      updateResizeGuideBounds()
    }
    return
  }

  const minWidth = getColumnMinWidth(state.column)
  const maxWidth = getColumnMaxWidth(state.column)
  let nextWidth = Math.max(minWidth, Math.round(state.startWidth + delta))
  if (maxWidth !== undefined) nextWidth = Math.min(nextWidth, maxWidth)

  columnWidths.value = {
    ...columnWidths.value,
    [state.key]: nextWidth
  }

  // Guide at actual rendered right edge (nextTick = after Vue updates DOM)
  nextTick(() => {
    const th = getThForColumn(state.key)
    if (th) {
      resizeGuideX.value = th.getBoundingClientRect().right
      updateResizeGuideBounds()
    }
  })
}

const stopColumnResize = () => {
  if (activeResize.value) {
    activeResize.value = null
    isResizing.value = false
    queueSaveWidths()
  }
  cleanupResizeListeners()
}

const startColumnResize = (column: ColumnDef, event: MouseEvent) => {
  if (!isColumnResizable(column)) return

  const key = columnKey(column)
  const th = (event.currentTarget as HTMLElement)?.closest('th') as HTMLElement | null
  if (!th) return

  const rect = th.getBoundingClientRect()
  const startWidth = getColumnWidth(column)
  const startEdgeX = rect.right

  activeResize.value = {
    key,
    startWidth,
    startEdgeX,
    column
  }

  isResizing.value = true
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'

  // Initial guide at actual rendered right edge (viewport X for fixed positioning)
  resizeGuideX.value = th.getBoundingClientRect().right
  updateResizeGuideBounds()

  scrollBoundsHandler = () => {
    if (activeResize.value) updateResizeGuideBounds()
  }
  window.addEventListener('mousemove', handleColumnResize)
  window.addEventListener('mouseup', stopColumnResize)
  window.addEventListener('scroll', scrollBoundsHandler, true)
  scrollContainerRef.value?.addEventListener('scroll', scrollBoundsHandler)
}

onBeforeUnmount(() => {
  stopColumnResize()
  flushColumnWidths()
  window.removeEventListener('beforeunload', handleBeforeUnload)
  window.removeEventListener('resize', updateEdgeColumns)
})

const resolveValue = (row: RowData, column: ColumnDef) => {
  const key = typeof column === 'string' ? column : column.key
  if (!key) return ''
  const raw = row?.[key]
  if (raw === null || raw === undefined || raw === '') return ''
  const col = typeof column === 'object' ? column : null
  return formatRawValueForDisplay(raw, col ?? undefined)
}

const handleRowClick = (row: RowData, event: MouseEvent) => {
  // Don't trigger row click if clicking on checkbox
  if ((event.target as HTMLElement)?.closest('[data-headless-checkbox="true"]')) {
    return
  }
  emit('row-click', row, event)
}

const isLoading = computed(() => Boolean(props.loading) && displayRows.value.length === 0)

const skeletonRowTotal = computed(() => {
  if (props.skeletonRowCount && props.skeletonRowCount > 0) {
    return Math.max(1, Math.floor(props.skeletonRowCount))
  }
  if (displayRows.value.length > 0) {
    return Math.min(displayRows.value.length, 8)
  }
  return 5
})

const shouldRenderSecondarySkeleton = (columnIndex: number) => columnIndex % 3 !== 2

const skeletonStyleForCell = (rowIndex: number, columnIndex: number, lineIndex = 0): Record<string, string> => {
  const seed = (rowIndex + 1) * 37 + (columnIndex + 1) * 19 + lineIndex * 11
  const width = 45 + (seed % 40)
  const delay = (seed % 5) * 120
  return {
    width: `${width}%`,
    animationDelay: `${delay}ms`
  }
}

const skeletonPulseDelay = (
  rowIndex: number,
  columnIndex: number,
  lineIndex = 0
): Record<string, string> => {
  const seed = (rowIndex + 1) * 29 + (columnIndex + 1) * 13 + lineIndex * 7
  const delay = (seed % 5) * 120
  return {
    animationDelay: `${delay}ms`
  }
}

// Selection state
const selectedRows = ref<RowData[]>([])

const isRowSelected = (row: RowData): boolean => {
  const rowId = rowIdentifier(row, 0)
  return selectedRows.value.some(selected => rowIdentifier(selected, 0) === rowId)
}

const toggleRowSelection = (row: RowData) => {
  const rowId = rowIdentifier(row, 0)
  const index = selectedRows.value.findIndex(selected => rowIdentifier(selected, 0) === rowId)
  
  if (index > -1) {
    selectedRows.value.splice(index, 1)
  } else {
    selectedRows.value.push(row)
  }
  
  emit('select', [...selectedRows.value])
}

const allSelected = computed(() => {
  return displayRows.value.length > 0 && displayRows.value.every(row => isRowSelected(row))
})

const someSelected = computed(() => {
  return selectedRows.value.length > 0 && !allSelected.value
})

const toggleSelectAll = () => {
  if (allSelected.value) {
    selectedRows.value = []
  } else {
    selectedRows.value = [...displayRows.value]
  }
  emit('select', [...selectedRows.value])
}

// Set indeterminate state on checkbox (handled by :indeterminate attribute)

// Watch for external selection changes (e.g., from parent clearing selection)
watch(() => props.data, () => {
  // Clear selection when data changes significantly
  if (selectedRows.value.length > 0) {
    // Keep only rows that still exist in the new data
    const newDataIds = new Set(displayRows.value.map(row => rowIdentifier(row, 0)))
    selectedRows.value = selectedRows.value.filter(row => newDataIds.has(rowIdentifier(row, 0)))
    emit('select', [...selectedRows.value])
  }
}, { deep: true })

// Watch for clear selection trigger from parent
watch(() => props.clearSelectionTrigger, (newVal) => {
  if (newVal > 0 && selectedRows.value.length > 0) {
    selectedRows.value = []
    emit('select', [])
  }
})
</script>

<style scoped>
/* Make vertical scrollbar transparent while keeping horizontal scrollbar visible */
.table-scroll-container {
  /* Firefox - thin scrollbar for horizontal */
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.3) transparent;
}

/* WebKit scrollbar styling */
.table-scroll-container::-webkit-scrollbar {
  height: 8px; /* Horizontal scrollbar height - visible */
  width: 0px; /* Hide vertical scrollbar completely */
}

.table-scroll-container::-webkit-scrollbar-track {
  background: transparent;
}

/* Horizontal scrollbar thumb - visible */
.table-scroll-container::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.3);
  border-radius: 4px;
}

.table-scroll-container::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.5);
}

/* Dark mode scrollbar */
:global(.dark) .table-scroll-container {
  scrollbar-color: rgba(75, 85, 99, 0.5) transparent;
}

:global(.dark) .table-scroll-container::-webkit-scrollbar-thumb {
  background-color: rgba(75, 85, 99, 0.5);
}

:global(.dark) .table-scroll-container::-webkit-scrollbar-thumb:hover {
  background-color: rgba(75, 85, 99, 0.7);
}

/* Ensure header rounded corners are visible - applied dynamically via classes */
.table-scroll-container thead th.rounded-tl-xl {
  border-top-left-radius: 0.75rem;
}

.table-scroll-container thead th.rounded-tr-xl {
  border-top-right-radius: 0.75rem;
}

/* Ensure border-right and shadow are visible on the last sticky column */
/* Use pseudo-element to ensure border stays visible above scrolling content */
.table-scroll-container thead th.sticky-column-border,
.table-scroll-container tbody td.sticky-column-border {
  position: relative;
  overflow: visible;
}

/* Use ::before for header (since ::after is used for bottom border) */
.table-scroll-container thead th.sticky-column-border::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 1px;
  background-color: rgb(229 231 235); /* gray-200 - light mode */
  z-index: 30;
  box-shadow: 2px 0 4px -1px rgba(0, 0, 0, 0.1);
  pointer-events: none;
}

/* Use ::after for cells */
.table-scroll-container tbody td.sticky-column-border::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 1px;
  background-color: rgb(229 231 235); /* gray-200 - light mode */
  z-index: 30;
  box-shadow: 2px 0 4px -1px rgba(0, 0, 0, 0.1);
  pointer-events: none;
}

/* Dark mode border color - match header border-bottom (dark:border-gray-700) */
/* Use the same pattern as other dark mode styles in this file */
:global(.dark) .table-scroll-container thead th.sticky-column-border::before {
  background-color: rgb(55 65 81) !important; /* gray-700 */
  box-shadow: 2px 0 4px -1px rgba(0, 0, 0, 0.3) !important;
}

:global(.dark) .table-scroll-container tbody td.sticky-column-border::after {
  background-color: rgb(55 65 81) !important; /* gray-700 */
  box-shadow: 2px 0 4px -1px rgba(0, 0, 0, 0.3) !important;
}

/* Subtle box shadow on the right side when scrolled horizontally */
/* This creates a shadow on the right edge to indicate content scrolling behind */
.table-scroll-container thead th.sticky-column-scrolled,
.table-scroll-container tbody td.sticky-column-scrolled {
  box-shadow: 4px 0 6px -2px rgba(0, 0, 0, 0.1), 2px 0 4px -1px rgba(0, 0, 0, 0.08) !important;
}

/* Dark mode shadow when scrolled - more visible shadow */
:global(.dark) .table-scroll-container thead th.sticky-column-scrolled,
:global(.dark) .table-scroll-container tbody td.sticky-column-scrolled {
  box-shadow: 4px 0 6px -2px rgba(0, 0, 0, 0.25), 2px 0 4px -1px rgba(0, 0, 0, 0.2) !important;
}

/* Title (first) column: enforce width and truncate long content */
.table-scroll-container .title-column-cell > div {
  min-width: 0;
  overflow: hidden;
}
.table-scroll-container .title-column-cell .flex {
  min-width: 0;
}
/* Truncate the text part of title cell (e.g. flex with checkbox + span) */
.table-scroll-container .title-column-cell .flex > *:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
/* When title cell has no .flex (plain slot), truncate direct content */
.table-scroll-container .title-column-cell > div:not(.flex) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

</style>

