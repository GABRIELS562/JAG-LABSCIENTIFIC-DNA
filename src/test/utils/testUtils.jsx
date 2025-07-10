import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { ThemeProvider } from '../../contexts/ThemeContext';
import ErrorBoundary from '../../components/common/ErrorBoundary';

// Create a test theme
const testTheme = createTheme({
  palette: {
    mode: 'light'
  }
});

// Custom render function that includes providers
function render(
  ui,
  {
    initialEntries = ['/'],
    route = '/',
    withRouter = true,
    withTheme = true,
    withErrorBoundary = true,
    ...renderOptions
  } = {}
) {
  function Wrapper({ children }) {
    let wrappedChildren = children;

    if (withErrorBoundary) {
      wrappedChildren = (
        <ErrorBoundary>
          {wrappedChildren}
        </ErrorBoundary>
      );
    }

    if (withTheme) {
      wrappedChildren = (
        <MuiThemeProvider theme={testTheme}>
          <ThemeProvider>
            {wrappedChildren}
          </ThemeProvider>
        </MuiThemeProvider>
      );
    }

    if (withRouter) {
      wrappedChildren = (
        <BrowserRouter>
          {wrappedChildren}
        </BrowserRouter>
      );
    }

    return wrappedChildren;
  }

  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions });
}

// Custom hook testing wrapper
export function renderHook(hook, options = {}) {
  const { renderHook: rtlRenderHook } = require('@testing-library/react');
  
  function Wrapper({ children }) {
    return (
      <MuiThemeProvider theme={testTheme}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </MuiThemeProvider>
    );
  }

  return rtlRenderHook(hook, { wrapper: Wrapper, ...options });
}

// Test utilities for API mocking
export const mockApiResponse = (url, response, status = 200) => {
  return global.testServer.use(
    http.get(url, () => {
      return HttpResponse.json(response, { status });
    })
  );
};

export const mockApiError = (url, error, status = 500) => {
  return global.testServer.use(
    http.get(url, () => {
      return HttpResponse.json({
        success: false,
        error: {
          message: error,
          errorCode: 'TEST_ERROR'
        }
      }, { status });
    })
  );
};

// Form testing utilities
export const fillForm = async (user, form, data) => {
  for (const [fieldName, value] of Object.entries(data)) {
    const field = form.querySelector(`[name="${fieldName}"]`);
    if (field) {
      if (field.type === 'checkbox') {
        if (value) {
          await user.click(field);
        }
      } else if (field.tagName === 'SELECT') {
        await user.selectOptions(field, value);
      } else {
        await user.clear(field);
        await user.type(field, value);
      }
    }
  }
};

// Wait for async operations
export const waitForLoadingToFinish = async () => {
  const { waitForElementToBeRemoved, queryByText } = await import('@testing-library/react');
  
  // Wait for common loading indicators to disappear
  const loadingIndicators = [
    () => queryByText(/loading/i),
    () => queryByText(/please wait/i),
    () => document.querySelector('[data-testid="loading-spinner"]'),
    () => document.querySelector('.MuiCircularProgress-root')
  ];

  for (const getIndicator of loadingIndicators) {
    const indicator = getIndicator();
    if (indicator) {
      try {
        await waitForElementToBeRemoved(indicator, { timeout: 5000 });
      } catch (error) {
        // Indicator might have already been removed
      }
    }
  }
};

// Table testing utilities
export const getTableData = (table) => {
  const rows = Array.from(table.querySelectorAll('tbody tr'));
  return rows.map(row => {
    const cells = Array.from(row.querySelectorAll('td'));
    return cells.map(cell => cell.textContent.trim());
  });
};

export const getTableHeaders = (table) => {
  const headers = Array.from(table.querySelectorAll('thead th'));
  return headers.map(header => header.textContent.trim());
};

// Custom matchers
expect.extend({
  toBeInTheTable(received, table) {
    const tableData = getTableData(table);
    const found = tableData.some(row => 
      row.some(cell => cell.includes(received))
    );

    return {
      message: () => 
        found
          ? `Expected "${received}" not to be in the table`
          : `Expected "${received}" to be in the table`,
      pass: found
    };
  },

  toHaveValidationError(received, fieldName) {
    const errorElement = received.querySelector(`[data-testid="${fieldName}-error"]`) ||
                        received.querySelector(`.error[data-field="${fieldName}"]`) ||
                        received.querySelector(`#${fieldName}-helper-text.Mui-error`);
    
    return {
      message: () => 
        errorElement
          ? `Expected field "${fieldName}" not to have validation error`
          : `Expected field "${fieldName}" to have validation error`,
      pass: !!errorElement
    };
  }
});

// Re-export everything from React Testing Library
export * from '@testing-library/react';

// Override render with our custom version
export { render };

// Export additional utilities
export { default as userEvent } from '@testing-library/user-event';