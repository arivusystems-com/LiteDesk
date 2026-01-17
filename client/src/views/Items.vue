<template>
  <div class="mx-auto">
    <!-- Entity Description -->
    <div class="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
      <p class="text-sm text-gray-700 dark:text-gray-300">
        <strong>Items</strong> are shared across all apps. They represent products, services, and inventory that can be used in deals, quotes, and other records.
      </p>
    </div>

    <ListView
      title="Items"
      description="Manage products, services, and inventory"
      module-key="items"
      create-label="New Item"
      search-placeholder="Search items..."
      :data="items"
      :columns="columns"
      :loading="loading"
      :statistics="statistics"
      :stats-config="[
        { name: 'Total Items', key: 'totalItems', formatter: 'number' },
        { name: 'Active', key: 'activeItems', formatter: 'number' },
        { name: 'Products', key: 'products', formatter: 'number' },
        { name: 'Services', key: 'services', formatter: 'number' }
      ]"
      :pagination="{ currentPage: pagination.currentPage, totalPages: pagination.totalPages, totalRecords: pagination.totalItems, limit: pagination.itemsPerPage }"
      :sort-field="sortField"
      :sort-order="sortOrder"
      :filter-config="filterConfig"
      table-id="items-table"
      row-key="_id"
      empty-title="No items yet"
      empty-message="Items are products and services you sell. Add them here to use in deals, quotes, and invoices across all apps."
      @create="openCreateModal"
      @import="showImportModal = true"
      @export="exportItems"
      @update:searchQuery="handleSearchQueryUpdate"
      @update:filters="(newFilters) => { Object.assign(filters, newFilters); fetchItems(); }"
      @update:sort="({ sortField: key, sortOrder: order }) => { handleSort({ key, order }); }"
      @update:pagination="(p) => { pagination.currentPage = p.currentPage; pagination.itemsPerPage = p.limit || pagination.itemsPerPage; fetchItems(); }"
      @fetch="fetchItems"
      @row-click="viewItem"
      @edit="editItem"
      @delete="handleDelete"
      @bulk-action="handleBulkAction"
    >
      <!-- Custom Item Name Cell -->
      <template #cell-item_name="{ row }">
        <div class="flex items-center gap-3">
          <div v-if="row.product_image" class="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
            <img :src="row.product_image" :alt="row.item_name" class="w-full h-full object-cover" />
          </div>
          <div v-else class="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <span class="text-white font-semibold text-sm">{{ getInitials(row.item_name) }}</span>
          </div>
          <div class="min-w-0">
            <div class="font-semibold text-gray-900 dark:text-white truncate">
              {{ row.item_name }}
            </div>
            <div v-if="row.item_code" class="text-xs text-gray-500 dark:text-gray-400 truncate">
              {{ row.item_code }}
            </div>
          </div>
        </div>
      </template>

      <!-- Custom Item Type Cell with Badge -->
      <template #cell-item_type="{ value }">
        <BadgeCell 
          :value="value" 
          :variant-map="{
            'Product': 'primary',
            'Service': 'info',
            'Serialized Product': 'warning',
            'Non-Stock Product': 'default'
          }"
        />
      </template>

      <!-- Custom Status Cell with Badge -->
      <template #cell-status="{ value }">
        <BadgeCell 
          :value="value" 
          :variant-map="{
            'Active': 'success',
            'Inactive': 'default'
          }"
        />
      </template>

      <!-- Custom Category Cell -->
      <template #cell-category="{ value }">
        <span v-if="value" class="text-sm text-gray-700 dark:text-gray-300">{{ value }}</span>
        <span v-else class="text-sm text-gray-500 dark:text-gray-400">-</span>
      </template>

      <!-- Custom Stock Quantity Cell with low stock warning -->
      <template #cell-stock_quantity="{ row }">
        <div v-if="row.item_type === 'Service' || row.item_type === 'Non-Stock Product'" class="text-sm text-gray-500 dark:text-gray-400">
          N/A
        </div>
        <div v-else class="flex items-center gap-2">
          <span :class="[
            'text-sm font-medium',
            row.stock_quantity === 0 ? 'text-red-600 dark:text-red-400' :
            (row.reorder_level > 0 && row.stock_quantity <= row.reorder_level) ? 'text-yellow-600 dark:text-yellow-400' :
            'text-gray-700 dark:text-gray-300'
          ]">
            {{ row.stock_quantity || 0 }} {{ row.unit_of_measure || 'pcs' }}
          </span>
          <svg 
            v-if="row.stock_quantity === 0" 
            class="w-4 h-4 text-red-600 dark:text-red-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <svg 
            v-else-if="row.reorder_level > 0 && row.stock_quantity <= row.reorder_level" 
            class="w-4 h-4 text-yellow-600 dark:text-yellow-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      </template>

      <!-- Custom Selling Price Cell -->
      <template #cell-selling_price="{ value }">
        <span v-if="value" class="text-sm font-medium text-gray-900 dark:text-white">
          {{ formatCurrency(value) }}
        </span>
        <span v-else class="text-sm text-gray-500 dark:text-gray-400">-</span>
      </template>

      <!-- Custom Vendor Cell -->
      <template #cell-vendor="{ row }">
        <span v-if="row.vendor" class="text-sm text-gray-700 dark:text-gray-300">
          {{ row.vendor.name }}
        </span>
        <span v-else class="text-sm text-gray-500 dark:text-gray-400">-</span>
      </template>

      <!-- Custom Tags Cell -->
      <template #cell-tags="{ value }">
        <div v-if="value && value.length > 0" class="flex flex-wrap gap-1">
          <span 
            v-for="tag in value.slice(0, 2)" 
            :key="tag"
            class="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
          >
            {{ tag }}
          </span>
          <span v-if="value.length > 2" class="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
            +{{ value.length - 2 }}
          </span>
        </div>
        <span v-else class="text-sm text-gray-500 dark:text-gray-400">-</span>
      </template>

    </ListView>

    <!-- Item Form Modal -->
    <CreateRecordDrawer 
      :isOpen="showFormModal"
      moduleKey="items"
      :record="editingItem"
      @close="closeFormModal"
      @saved="handleItemSave"
    />

    <!-- CSV Import Modal -->
    <CSVImportModal 
      v-if="showImportModal"
      entity-type="Items"
      @close="showImportModal = false"
      @import-complete="handleImportComplete"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useBulkActions } from '@/composables/useBulkActions';
import { useTabs } from '@/composables/useTabs';
import apiClient from '../utils/apiClient';
import ListView from '@/components/common/ListView.vue';
import BadgeCell from '../components/common/table/BadgeCell.vue';
import CreateRecordDrawer from '@/components/common/CreateRecordDrawer.vue';
import CSVImportModal from '../components/import/CSVImportModal.vue';

const router = useRouter();
const authStore = useAuthStore();
const { openTab } = useTabs();

// State
const items = ref([]);
const loading = ref(false);
const searchQuery = ref('');
const showFormModal = ref(false);
const showImportModal = ref(false);
const editingItem = ref(null);

const filters = reactive({
  status: '',
  item_type: '',
  category: '',
  low_stock: false,
  out_of_stock: false
});

const pagination = ref({
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  itemsPerPage: 20
});

const statistics = ref({
  totalItems: 0,
  activeItems: 0,
  inactiveItems: 0,
  products: 0,
  services: 0,
  serializedProducts: 0,
  nonStockProducts: 0,
  totalStockValue: 0
});

const sortField = ref('createdAt');
const sortOrder = ref('desc');

// Column definitions
const columns = computed(() => [
  { key: 'item_name', label: 'Item Name', sortable: true, minWidth: '200px' },
  { key: 'item_code', label: 'Item Code', sortable: true, minWidth: '120px' },
  { key: 'item_type', label: 'Type', sortable: true, minWidth: '130px' },
  { key: 'category', label: 'Category', sortable: true, minWidth: '120px' },
  { key: 'status', label: 'Status', sortable: true, minWidth: '100px' },
  { key: 'stock_quantity', label: 'Stock', sortable: true, minWidth: '120px' },
  { key: 'selling_price', label: 'Price', sortable: true, minWidth: '120px' },
  { key: 'vendor', label: 'Vendor', sortable: false, minWidth: '150px' },
  { key: 'tags', label: 'Tags', sortable: false, minWidth: '150px' }
]);

// Filter configuration
const filterConfig = computed(() => [
  {
    key: 'status',
    label: 'All Status',
    options: [
      { value: 'Active', label: 'Active' },
      { value: 'Inactive', label: 'Inactive' }
    ]
  },
  {
    key: 'item_type',
    label: 'All Types',
    options: [
      { value: 'Product', label: 'Product' },
      { value: 'Service', label: 'Service' },
      { value: 'Serialized Product', label: 'Serialized Product' },
      { value: 'Non-Stock Product', label: 'Non-Stock Product' }
    ]
  },
  {
    key: 'low_stock',
    label: 'Stock Status',
    options: [
      { value: 'true', label: 'Low Stock' },
      { value: 'false', label: 'All Stock Levels' }
    ]
  }
]);

// Use bulk actions composable
const { bulkActions } = useBulkActions('items');

// Methods
const fetchItems = async () => {
  loading.value = true;
  
  try {
    const params = new URLSearchParams();
    params.append('page', pagination.value.currentPage);
    params.append('limit', pagination.value.itemsPerPage);
    params.append('sortBy', sortField.value);
    params.append('sortOrder', sortOrder.value);
    
    if (searchQuery.value) params.append('search', searchQuery.value);
    if (filters.status) params.append('status', filters.status);
    if (filters.item_type) params.append('item_type', filters.item_type);
    if (filters.category) params.append('category', filters.category);
    if (filters.low_stock) params.append('low_stock', 'true');
    if (filters.out_of_stock) params.append('out_of_stock', 'true');

    const data = await apiClient(`/items?${params.toString()}`, {
      method: 'GET'
    });
    
    if (data.success) {
      items.value = data.data;
      pagination.value = data.pagination;
      statistics.value = data.statistics || statistics.value;
    }
  } catch (err) {
    console.error('Error fetching items:', err);
    items.value = [];
  } finally {
    loading.value = false;
  }
};

const handleSearchQueryUpdate = (query) => {
  searchQuery.value = query;
  pagination.value.currentPage = 1;
  fetchItems();
};

const handleSort = ({ key, order }) => {
  if (!key) {
    sortField.value = 'createdAt';
    sortOrder.value = 'desc';
  } else {
    sortField.value = key;
    sortOrder.value = order;
  }
  fetchItems();
};

const viewItem = (item) => {
  const itemData = typeof item === 'object' ? item : items.value.find(i => i._id === item);
  const title = itemData ? itemData.item_name : 'Item Detail';
  
  openTab(`/items/${itemData._id}`, {
    title,
    icon: 'cube',
    params: { name: title }
  });
};

const openCreateModal = () => {
  editingItem.value = null;
  showFormModal.value = true;
};

const editItem = (item) => {
  editingItem.value = item;
  showFormModal.value = true;
};

const closeFormModal = () => {
  showFormModal.value = false;
  editingItem.value = null;
};

const handleItemSave = () => {
  closeFormModal();
  fetchItems();
};

const handleDelete = async (itemId) => {
  if (!confirm('Are you sure you want to delete this item?')) return;
  
  try {
    await apiClient(`/items/${itemId}`, {
      method: 'DELETE'
    });
    fetchItems();
  } catch (error) {
    console.error('Error deleting item:', error);
    alert('Failed to delete item');
  }
};

const handleBulkAction = async (actionId, selectedRows) => {
  const itemIds = selectedRows.map(item => item._id);
  
  try {
    if (actionId === 'bulk-delete' || actionId === 'delete') {
      await Promise.all(itemIds.map(id => 
        apiClient(`/items/${id}`, { method: 'DELETE' })
      ));
      fetchItems();
    } else if (actionId === 'bulk-export' || actionId === 'export') {
      exportItemsToCSV(selectedRows);
    }
  } catch (error) {
    console.error('Error performing bulk action:', error);
    alert('Error performing bulk action. Please try again.');
  }
};

const exportItems = async () => {
  try {
    // Fetch all items for export
    const data = await apiClient('/items?limit=10000', {
      method: 'GET'
    });
    
    if (data.success) {
      exportItemsToCSV(data.data);
    }
  } catch (error) {
    console.error('Error exporting items:', error);
    alert('Failed to export items');
  }
};

const exportItemsToCSV = (itemsToExport) => {
  const csv = [
    ['Item Name', 'Item Code', 'Item Type', 'Category', 'Status', 'Stock Quantity', 'Selling Price', 'Cost Price', 'Vendor'].join(','),
    ...itemsToExport.map(item => [
      `"${item.item_name || ''}"`,
      item.item_code || '',
      item.item_type || '',
      item.category || '',
      item.status || '',
      item.stock_quantity || 0,
      item.selling_price || 0,
      item.cost_price || 0,
      item.vendor?.name || ''
    ].join(','))
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `items-export-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};

const handleImportComplete = () => {
  showImportModal.value = false;
  fetchItems();
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const getInitials = (name) => {
  if (!name) return '?';
  const words = name.split(' ');
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Lifecycle
onMounted(() => {
  fetchItems();
});
</script>

