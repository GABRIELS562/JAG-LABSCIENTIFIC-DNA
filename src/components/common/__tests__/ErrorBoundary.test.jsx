import React from 'react';
import { render, screen } from '../../../test/utils/testUtils';
import ErrorBoundary, { withErrorBoundary, useErrorHandler } from '../ErrorBoundary';

// Test component that throws an error
const ThrowError = ({ shouldThrow = false, errorMessage = 'Test error' }) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

// Test component for testing withErrorBoundary HOC
const TestComponent = ({ message = 'Test component' }) => {
  return <div>{message}</div>;
};

const WrappedComponent = withErrorBoundary(TestComponent);

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress error logging during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('when no error occurs', () => {
    it('renders children normally', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  describe('when an error occurs', () => {
    it('renders error UI with minimal fallback', () => {
      render(
        <ErrorBoundary fallback="minimal">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('renders full error UI by default', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Go Home')).toBeInTheDocument();
    });

    it('displays error details in full mode', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Custom error message" />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Custom error message/)).toBeInTheDocument();
      expect(screen.getByText(/Error ID:/)).toBeInTheDocument();
    });

    it('allows retry functionality', async () => {
      const { user } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const retryButton = screen.getByText('Try Again');
      await user.click(retryButton);

      // After retry, component should attempt to render again
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('logs error to localStorage in development', () => {
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Logged error" />
        </ErrorBoundary>
      );

      expect(setItemSpy).toHaveBeenCalledWith(
        'errorLogs',
        expect.stringContaining('Logged error')
      );

      setItemSpy.mockRestore();
    });
  });

  describe('withErrorBoundary HOC', () => {
    it('wraps component with error boundary', () => {
      render(<WrappedComponent message="HOC test" />);

      expect(screen.getByText('HOC test')).toBeInTheDocument();
    });

    it('catches errors in wrapped component', () => {
      const ErrorComponent = withErrorBoundary(() => {
        throw new Error('HOC error');
      });

      render(<ErrorComponent />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('passes props correctly', () => {
      render(<WrappedComponent message="Props passed correctly" />);

      expect(screen.getByText('Props passed correctly')).toBeInTheDocument();
    });
  });

  describe('useErrorHandler hook', () => {
    it('reports errors manually', () => {
      let reportError;
      
      const TestHookComponent = () => {
        const { reportError: report } = useErrorHandler();
        reportError = report;
        return <div>Hook test</div>;
      };

      render(<TestHookComponent />);
      
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      
      reportError(new Error('Manual error report'));

      expect(setItemSpy).toHaveBeenCalledWith(
        'errorLogs',
        expect.stringContaining('Manual error report')
      );

      setItemSpy.mockRestore();
    });
  });

  describe('error boundary with userId', () => {
    it('includes userId in error logs when provided', () => {
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      
      render(
        <ErrorBoundary userId="test-user-123">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(setItemSpy).toHaveBeenCalledWith(
        'errorLogs',
        expect.stringContaining('test-user-123')
      );

      setItemSpy.mockRestore();
    });
  });

  describe('error boundary state management', () => {
    it('resets error state when children change', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} key="error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();

      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} key="no-error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      const homeButton = screen.getByRole('button', { name: /go home/i });

      expect(retryButton).toBeInTheDocument();
      expect(homeButton).toBeInTheDocument();
    });
  });
});