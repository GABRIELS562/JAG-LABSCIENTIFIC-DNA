import React, { memo, useMemo, useCallback, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Checkbox,
  Paper,
  Box,
  Typography
} from '@mui/material';
import { useVirtualList, useMemoizedValue, useStableCallback } from '../../hooks/usePerformance';

// Memoized table cell component
const OptimizedTableCell = memo(({ children, ...props }) => (
  <TableCell {...props}>{children}</TableCell>
));

OptimizedTableCell.displayName = 'OptimizedTableCell';

// Memoized table row component
const OptimizedTableRow = memo(({ 
  row, 
  columns, 
  isSelected, 
  onSelect, 
  onRowClick,
  index 
}) => {
  const handleClick = useStableCallback((event) => {
    if (onRowClick) {
      onRowClick(event, row, index);
    }
  }, [onRowClick, row, index]);

  const handleSelectClick = useStableCallback((event) => {
    event.stopPropagation();
    if (onSelect) {
      onSelect(row.id || index);
    }
  }, [onSelect, row.id, index]);

  return (
    <TableRow
      hover
      selected={isSelected}
      onClick={handleClick}
      sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
    >
      {onSelect && (
        <OptimizedTableCell padding="checkbox">
          <Checkbox
            checked={isSelected}
            onChange={handleSelectClick}
            onClick={(e) => e.stopPropagation()}
          />
        </OptimizedTableCell>
      )}
      {columns.map((column) => (
        <OptimizedTableCell
          key={column.id}
          align={column.align || 'left'}
          style={{ width: column.width }}
        >
          {column.render ? column.render(row, index) : row[column.id]}
        </OptimizedTableCell>
      ))}
    </TableRow>
  );
});

OptimizedTableRow.displayName = 'OptimizedTableRow';

// Memoized table header component
const OptimizedTableHead = memo(({ 
  columns, 
  orderBy, 
  order, 
  onSort, 
  onSelectAll, 
  numSelected, 
  rowCount,
  selectable 
}) => {
  const handleSelectAllClick = useStableCallback((event) => {
    if (onSelectAll) {
      onSelectAll(event.target.checked);
    }
  }, [onSelectAll]);

  const createSortHandler = useStableCallback((property) => (event) => {
    if (onSort) {
      onSort(event, property);
    }
  }, [onSort]);

  return (
    <TableHead>
      <TableRow>
        {selectable && (
          <OptimizedTableCell padding="checkbox">
            <Checkbox
              indeterminate={numSelected > 0 && numSelected < rowCount}
              checked={rowCount > 0 && numSelected === rowCount}
              onChange={handleSelectAllClick}
            />
          </OptimizedTableCell>
        )}
        {columns.map((column) => (
          <OptimizedTableCell
            key={column.id}
            align={column.align || 'left'}
            sortDirection={orderBy === column.id ? order : false}
            style={{ width: column.width }}
          >
            {column.sortable !== false && onSort ? (
              <TableSortLabel
                active={orderBy === column.id}
                direction={orderBy === column.id ? order : 'asc'}
                onClick={createSortHandler(column.id)}
              >
                {column.label}
              </TableSortLabel>
            ) : (
              column.label
            )}
          </OptimizedTableCell>
        ))}
      </TableRow>
    </TableHead>
  );
});

OptimizedTableHead.displayName = 'OptimizedTableHead';

// Main optimized table component
const OptimizedTable = memo(({
  data = [],
  columns = [],
  loading = false,
  error = null,
  selectable = false,
  sortable = true,
  paginated = true,
  virtualized = false,
  rowHeight = 53,
  maxHeight = 400,
  onRowClick,
  onSort,
  onSelectionChange,
  initialOrderBy = '',
  initialOrder = 'asc',
  pageSize = 25,
  emptyMessage = 'No data available',
  ...tableProps
}) => {
  const [order, setOrder] = useState(initialOrder);
  const [orderBy, setOrderBy] = useState(initialOrderBy);
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);

  // Memoized sorted data
  const sortedData = useMemoizedValue(() => {
    if (!orderBy || !sortable) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];
      
      if (aValue === bValue) return 0;
      
      const comparison = aValue < bValue ? -1 : 1;
      return order === 'desc' ? -comparison : comparison;
    });
  }, [data, order, orderBy, sortable]);

  // Memoized paginated data
  const paginatedData = useMemoizedValue(() => {
    if (!paginated) return sortedData;
    
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return sortedData.slice(start, end);
  }, [sortedData, page, rowsPerPage, paginated]);

  // Virtual list for large datasets
  const virtualList = useVirtualList(
    virtualized ? paginatedData : [],
    rowHeight,
    maxHeight
  );

  const displayData = virtualized ? virtualList.visibleItems : paginatedData;

  // Event handlers
  const handleSort = useStableCallback((event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    
    if (onSort) {
      onSort(property, isAsc ? 'desc' : 'asc');
    }
  }, [order, orderBy, onSort]);

  const handleSelectAllClick = useStableCallback((checked) => {
    if (checked) {
      const newSelected = paginatedData.map((row, index) => row.id || index);
      setSelected(newSelected);
      if (onSelectionChange) {
        onSelectionChange(newSelected);
      }
    } else {
      setSelected([]);
      if (onSelectionChange) {
        onSelectionChange([]);
      }
    }
  }, [paginatedData, onSelectionChange]);

  const handleSelect = useStableCallback((id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = [...selected, id];
    } else {
      newSelected = selected.filter(item => item !== id);
    }

    setSelected(newSelected);
    if (onSelectionChange) {
      onSelectionChange(newSelected);
    }
  }, [selected, onSelectionChange]);

  const handleChangePage = useStableCallback((event, newPage) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useStableCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  const isSelected = useStableCallback((id) => selected.indexOf(id) !== -1, [selected]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (data.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <Typography color="text.secondary">{emptyMessage}</Typography>
      </Box>
    );
  }

  const tableContent = (
    <Table {...tableProps}>
      <OptimizedTableHead
        columns={columns}
        orderBy={orderBy}
        order={order}
        onSort={sortable ? handleSort : undefined}
        onSelectAll={selectable ? handleSelectAllClick : undefined}
        numSelected={selected.length}
        rowCount={paginatedData.length}
        selectable={selectable}
      />
      <TableBody>
        {virtualized ? (
          <TableRow>
            <TableCell 
              colSpan={columns.length + (selectable ? 1 : 0)} 
              style={{ padding: 0, border: 'none' }}
            >
              <Box
                style={{
                  height: maxHeight,
                  overflow: 'auto'
                }}
                onScroll={virtualList.onScroll}
              >
                <Box
                  style={{
                    height: virtualList.totalHeight,
                    position: 'relative'
                  }}
                >
                  <Box
                    style={{
                      transform: `translateY(${virtualList.offsetY}px)`,
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0
                    }}
                  >
                    <Table>
                      <TableBody>
                        {displayData.map((row, virtualIndex) => (
                          <OptimizedTableRow
                            key={row.id || row.index || virtualIndex}
                            row={row}
                            columns={columns}
                            isSelected={isSelected(row.id || row.index)}
                            onSelect={selectable ? handleSelect : undefined}
                            onRowClick={onRowClick}
                            index={row.index}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </Box>
              </Box>
            </TableCell>
          </TableRow>
        ) : (
          displayData.map((row, index) => (
            <OptimizedTableRow
              key={row.id || index}
              row={row}
              columns={columns}
              isSelected={isSelected(row.id || index)}
              onSelect={selectable ? handleSelect : undefined}
              onRowClick={onRowClick}
              index={paginated ? page * rowsPerPage + index : index}
            />
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <Paper>
      <TableContainer>
        {tableContent}
      </TableContainer>
      
      {paginated && !virtualized && (
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={sortedData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      )}
    </Paper>
  );
});

OptimizedTable.displayName = 'OptimizedTable';

export default OptimizedTable;