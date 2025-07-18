import { useState, useMemo, useCallback } from 'react';

/**
 * Custom hook for table functionality including pagination, sorting, and filtering
 * @param {Array} data - The table data
 * @param {Object} options - Configuration options
 * @returns {Object} Table state and handlers
 */
export function useTable(data = [], options = {}) {
  const {
    initialPageSize = 10,
    initialSortBy = null,
    initialSortOrder = 'asc',
    initialFilters = {},
    searchFields = [],
    filterFunctions = {}
  } = options;

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Sorting state
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState(initialSortOrder);

  // Filtering state
  const [filters, setFilters] = useState(initialFilters);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter data based on search query and filters
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Apply search query
    if (searchQuery && searchFields.length > 0) {
      filtered = filtered.filter(item =>
        searchFields.some(field => {
          const value = getNestedValue(item, field);
          return value && value.toString().toLowerCase().includes(searchQuery.toLowerCase());
        })
      );
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (filterFunctions[key]) {
          filtered = filtered.filter(item => filterFunctions[key](item, value));
        } else {
          const itemValue = getNestedValue(item, key);
          if (itemValue !== null && itemValue !== undefined) {
            filtered = filtered.filter(item => {
              const itemVal = getNestedValue(item, key);
              return itemVal && itemVal.toString().toLowerCase().includes(value.toString().toLowerCase());
            });
          }
        }
      }
    });

    return filtered;
  }, [data, searchQuery, searchFields, filters, filterFunctions]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortBy) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = getNestedValue(a, sortBy);
      const bValue = getNestedValue(b, sortBy);

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = compareValues(aValue, bValue);
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortBy, sortOrder]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, pageSize]);

  // Pagination info
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // Handlers
  const handleSort = useCallback((field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  }, [sortBy]);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const handlePageSizeChange = useCallback((newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1); // Reset to first page when filtering
  }, []);

  const handleSearchChange = useCallback((query) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when searching
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
    setSearchQuery('');
    setCurrentPage(1);
  }, [initialFilters]);

  const resetTable = useCallback(() => {
    setCurrentPage(1);
    setPageSize(initialPageSize);
    setSortBy(initialSortBy);
    setSortOrder(initialSortOrder);
    setFilters(initialFilters);
    setSearchQuery('');
  }, [initialPageSize, initialSortBy, initialSortOrder, initialFilters]);

  return {
    // Data
    data: paginatedData,
    filteredData,
    sortedData,
    totalItems,

    // Pagination
    currentPage,
    pageSize,
    totalPages,
    hasNextPage,
    hasPrevPage,

    // Sorting
    sortBy,
    sortOrder,

    // Filtering
    filters,
    searchQuery,

    // Handlers
    handleSort,
    handlePageChange,
    handlePageSizeChange,
    handleFilterChange,
    handleSearchChange,
    clearFilters,
    resetTable
  };
}

/**
 * Custom hook for managing table selection
 * @param {Array} data - The table data
 * @param {String} keyField - The field to use as unique identifier
 * @returns {Object} Selection state and handlers
 */
export function useTableSelection(data = [], keyField = 'id') {
  const [selectedItems, setSelectedItems] = useState(new Set());

  const isSelected = useCallback((item) => {
    const key = getNestedValue(item, keyField);
    return selectedItems.has(key);
  }, [selectedItems, keyField]);

  const toggleSelection = useCallback((item) => {
    const key = getNestedValue(item, keyField);
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }, [keyField]);

  const selectAll = useCallback(() => {
    const allKeys = data.map(item => getNestedValue(item, keyField));
    setSelectedItems(new Set(allKeys));
  }, [data, keyField]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedItems.size === data.length) {
      clearSelection();
    } else {
      selectAll();
    }
  }, [selectedItems.size, data.length, clearSelection, selectAll]);

  const getSelectedItems = useCallback(() => {
    return data.filter(item => {
      const key = getNestedValue(item, keyField);
      return selectedItems.has(key);
    });
  }, [data, selectedItems, keyField]);

  const isAllSelected = selectedItems.size === data.length && data.length > 0;
  const isSomeSelected = selectedItems.size > 0 && selectedItems.size < data.length;

  return {
    selectedItems,
    isSelected,
    toggleSelection,
    selectAll,
    clearSelection,
    toggleSelectAll,
    getSelectedItems,
    isAllSelected,
    isSomeSelected,
    selectedCount: selectedItems.size
  };
}

// Helper functions
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function compareValues(a, b) {
  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b);
  }
  
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }
  
  // Convert to string for comparison as fallback
  return String(a).localeCompare(String(b));
}

export default useTable;