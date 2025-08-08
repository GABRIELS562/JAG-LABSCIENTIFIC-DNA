import React, { useState, useEffect } from 'react';
import { Grid, FormControl, InputLabel, Select, MenuItem, FormHelperText } from '@mui/material';

const DateDropdown = ({ 
  label, 
  value, 
  onChange, 
  error, 
  helperText, 
  required = false, 
  disabled = false,
  name 
}) => {
  // Internal state for individual date parts
  const [dateState, setDateState] = useState({ day: '', month: '', year: '' });

  // Parse the date value (YYYY-MM-DD format, handles partial dates)
  const parseDate = (dateStr) => {
    if (!dateStr) return { day: '', month: '', year: '' };
    const parts = dateStr.split('-');
    const year = parts[0] || '';
    const month = parts[1] || '';
    const day = parts[2] || '';
    return { day, month, year };
  };

  // Update internal state when value prop changes
  useEffect(() => {
    const parsed = parseDate(value);
    setDateState(parsed);
  }, [value]);

  // Format the date parts back to YYYY-MM-DD
  const formatDate = (day, month, year) => {
    if (!day || !month || !year) {
      // Return partial date that can be parsed later
      return `${year || ''}-${month || ''}-${day || ''}`;
    }
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  const handleDateChange = (type, newValue) => {
    const newDateState = { ...dateState };
    
    if (type === 'day') newDateState.day = newValue;
    if (type === 'month') newDateState.month = newValue;
    if (type === 'year') newDateState.year = newValue;

    setDateState(newDateState);
    
    const formattedDate = formatDate(newDateState.day, newDateState.month, newDateState.year);
    onChange(formattedDate);
  };

  // Generate options
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  return (
    <div>
      <InputLabel sx={{ 
        mb: 1, 
        fontSize: '1rem', 
        color: error ? 'error.main' : 'text.primary',
        fontWeight: 500,
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        letterSpacing: '0.00938em'
      }}>
        {label} {required && '*'}
      </InputLabel>
      <Grid container spacing={1}>
        {/* Day */}
        <Grid item xs={4}>
          <FormControl fullWidth disabled={disabled} error={error} size="small">
            <InputLabel 
              id={`${name}_day_label`}
              sx={{ 
                fontSize: '1rem',
                fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                fontWeight: 400,
                letterSpacing: '0.00938em'
              }}
            >
              Day
            </InputLabel>
            <Select
              labelId={`${name}_day_label`}
              value={dateState.day || ''}
              onChange={(e) => handleDateChange('day', e.target.value)}
              label="Day"
              name={`${name}_day`}
              displayEmpty
              sx={{
                '& .MuiSelect-select': {
                  fontSize: '1rem',
                  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  fontWeight: 400,
                  letterSpacing: '0.00938em'
                },
                '& .MuiInputLabel-root': {
                  fontSize: '1rem',
                  fontWeight: 400
                }
              }}
            >
              <MenuItem value="" sx={{ fontSize: '1rem', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                <em style={{ fontSize: '1rem', fontStyle: 'normal', opacity: 0.6 }}>Day</em>
              </MenuItem>
              {days.map(d => (
                <MenuItem 
                  key={d} 
                  value={d.toString().padStart(2, '0')}
                  sx={{ fontSize: '1rem', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                >
                  {d}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Month */}
        <Grid item xs={4}>
          <FormControl fullWidth disabled={disabled} error={error} size="small">
            <InputLabel 
              id={`${name}_month_label`}
              sx={{ 
                fontSize: '1rem',
                fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                fontWeight: 400,
                letterSpacing: '0.00938em'
              }}
            >
              Month
            </InputLabel>
            <Select
              labelId={`${name}_month_label`}
              value={dateState.month || ''}
              onChange={(e) => handleDateChange('month', e.target.value)}
              label="Month"
              name={`${name}_month`}
              displayEmpty
              sx={{
                '& .MuiSelect-select': {
                  fontSize: '1rem',
                  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  fontWeight: 400,
                  letterSpacing: '0.00938em'
                },
                '& .MuiInputLabel-root': {
                  fontSize: '1rem',
                  fontWeight: 400
                }
              }}
            >
              <MenuItem value="" sx={{ fontSize: '1rem', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                <em style={{ fontSize: '1rem', fontStyle: 'normal', opacity: 0.6 }}>Month</em>
              </MenuItem>
              {months.map(m => (
                <MenuItem 
                  key={m.value} 
                  value={m.value}
                  sx={{ fontSize: '1rem', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                >
                  {m.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Year */}
        <Grid item xs={4}>
          <FormControl fullWidth disabled={disabled} error={error} size="small">
            <InputLabel 
              id={`${name}_year_label`}
              sx={{ 
                fontSize: '1rem',
                fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                fontWeight: 400,
                letterSpacing: '0.00938em'
              }}
            >
              Year
            </InputLabel>
            <Select
              labelId={`${name}_year_label`}
              value={dateState.year || ''}
              onChange={(e) => handleDateChange('year', e.target.value)}
              label="Year"
              name={`${name}_year`}
              displayEmpty
              sx={{
                '& .MuiSelect-select': {
                  fontSize: '1rem',
                  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  fontWeight: 400,
                  letterSpacing: '0.00938em'
                },
                '& .MuiInputLabel-root': {
                  fontSize: '1rem',
                  fontWeight: 400
                }
              }}
            >
              <MenuItem value="" sx={{ fontSize: '1rem', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                <em style={{ fontSize: '1rem', fontStyle: 'normal', opacity: 0.6 }}>Year</em>
              </MenuItem>
              {years.map(y => (
                <MenuItem 
                  key={y} 
                  value={y.toString()}
                  sx={{ fontSize: '1rem', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                >
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      {error && helperText && (
        <FormHelperText error sx={{ 
          mt: 1,
          fontSize: '0.875rem',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          letterSpacing: '0.03333em'
        }}>
          {helperText}
        </FormHelperText>
      )}
    </div>
  );
};

export default DateDropdown;