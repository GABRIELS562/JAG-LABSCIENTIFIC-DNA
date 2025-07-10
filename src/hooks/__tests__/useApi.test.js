import { renderHook, waitFor } from '../../test/utils/testUtils';
import { useApi, useMutation, usePaginatedApi, usePolling } from '../useApi';
import { http, HttpResponse } from 'msw';

describe('useApi', () => {
  describe('basic functionality', () => {
    it('fetches data successfully', async () => {
      const { result } = renderHook(() => 
        useApi('/api/samples', { immediate: true })
      );

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBe(null);
      expect(result.current.error).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual([
        expect.objectContaining({
          lab_number: '25_1',
          name: 'John',
          surname: 'Doe'
        }),
        expect.objectContaining({
          lab_number: '25_2',
          name: 'Jane',
          surname: 'Doe'
        })
      ]);
      expect(result.current.error).toBe(null);
    });

    it('handles errors correctly', async () => {
      global.testServer.use(
        http.get('http://localhost:3001/api/error-endpoint', () => {
          return HttpResponse.json({
            success: false,
            error: { message: 'Server error' }
          }, { status: 500 });
        })
      );

      const { result } = renderHook(() => 
        useApi('/api/error-endpoint', { immediate: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Server error');
      expect(result.current.data).toBe(null);
    });

    it('does not fetch immediately when immediate is false', () => {
      const { result } = renderHook(() => 
        useApi('/api/samples', { immediate: false })
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBe(null);
      expect(result.current.error).toBe(null);
    });

    it('can execute manually', async () => {
      const { result } = renderHook(() => 
        useApi('/api/samples', { immediate: false })
      );

      expect(result.current.data).toBe(null);

      await result.current.execute();

      await waitFor(() => {
        expect(result.current.data).not.toBe(null);
      });

      expect(result.current.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ lab_number: '25_1' })
        ])
      );
    });

    it('can retry failed requests', async () => {
      let callCount = 0;
      global.testServer.use(
        http.get('http://localhost:3001/api/retry-test', () => {
          callCount++;
          if (callCount === 1) {
            return HttpResponse.json({
              success: false,
              error: { message: 'First call fails' }
            }, { status: 500 });
          }
          return HttpResponse.json({
            success: true,
            data: { message: 'Second call succeeds' }
          });
        })
      );

      const { result } = renderHook(() => 
        useApi('/api/retry-test', { immediate: true })
      );

      await waitFor(() => {
        expect(result.current.error).toBe('First call fails');
      });

      await result.current.retry();

      await waitFor(() => {
        expect(result.current.data).toEqual({ message: 'Second call succeeds' });
      });

      expect(result.current.error).toBe(null);
    });

    it('can reset state', async () => {
      const { result } = renderHook(() => 
        useApi('/api/samples', { immediate: true })
      );

      await waitFor(() => {
        expect(result.current.data).not.toBe(null);
      });

      result.current.reset();

      expect(result.current.data).toBe(null);
      expect(result.current.error).toBe(null);
      expect(result.current.loading).toBe(false);
    });
  });

  describe('configuration options', () => {
    it('applies transform function to data', async () => {
      const transform = (data) => data.map(item => ({
        ...item,
        fullName: `${item.name} ${item.surname}`
      }));

      const { result } = renderHook(() => 
        useApi('/api/samples', { immediate: true, transform })
      );

      await waitFor(() => {
        expect(result.current.data).not.toBe(null);
      });

      expect(result.current.data[0]).toHaveProperty('fullName', 'John Doe');
    });

    it('calls onSuccess callback', async () => {
      const onSuccess = jest.fn();

      const { result } = renderHook(() => 
        useApi('/api/samples', { immediate: true, onSuccess })
      );

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(expect.any(Array));
      });
    });

    it('calls onError callback', async () => {
      const onError = jest.fn();

      global.testServer.use(
        http.get('http://localhost:3001/api/error-callback-test', () => {
          return HttpResponse.json({
            success: false,
            error: { message: 'Callback error' }
          }, { status: 400 });
        })
      );

      const { result } = renderHook(() => 
        useApi('/api/error-callback-test', { immediate: true, onError })
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      });
    });

    it('implements retry with exponential backoff', async () => {
      let attempts = 0;
      global.testServer.use(
        http.get('http://localhost:3001/api/retry-backoff', () => {
          attempts++;
          return HttpResponse.json({
            success: false,
            error: { message: `Attempt ${attempts}` }
          }, { status: 500 });
        })
      );

      const { result } = renderHook(() => 
        useApi('/api/retry-backoff', { 
          immediate: true, 
          maxRetries: 2, 
          retryDelay: 10 
        })
      );

      await waitFor(() => {
        expect(result.current.retryCount).toBe(2);
      }, { timeout: 1000 });

      expect(attempts).toBe(3); // Initial + 2 retries
    });
  });
});

describe('useMutation', () => {
  it('performs POST request successfully', async () => {
    global.testServer.use(
      http.post('http://localhost:3001/api/test-mutation', () => {
        return HttpResponse.json({
          success: true,
          data: { id: 123, message: 'Created successfully' }
        }, { status: 201 });
      })
    );

    const { result } = renderHook(() => useMutation());

    expect(result.current.loading).toBe(false);

    const response = await result.current.mutate('/api/test-mutation', {
      method: 'POST',
      body: { name: 'Test' }
    });

    expect(response).toEqual({
      id: 123,
      message: 'Created successfully'
    });
    expect(result.current.loading).toBe(false);
  });

  it('handles mutation errors', async () => {
    global.testServer.use(
      http.post('http://localhost:3001/api/mutation-error', () => {
        return HttpResponse.json({
          success: false,
          error: { message: 'Validation failed' }
        }, { status: 400 });
      })
    );

    const { result } = renderHook(() => useMutation());

    await expect(
      result.current.mutate('/api/mutation-error', { method: 'POST' })
    ).rejects.toThrow('Validation failed');

    expect(result.current.error).toBe('Validation failed');
  });

  it('calls success and error callbacks', async () => {
    const onSuccess = jest.fn();
    const onError = jest.fn();

    global.testServer.use(
      http.post('http://localhost:3001/api/mutation-callbacks', () => {
        return HttpResponse.json({
          success: true,
          data: { result: 'success' }
        });
      })
    );

    const { result } = renderHook(() => useMutation({ onSuccess, onError }));

    await result.current.mutate('/api/mutation-callbacks', { method: 'POST' });

    expect(onSuccess).toHaveBeenCalledWith({ result: 'success' });
    expect(onError).not.toHaveBeenCalled();
  });
});

describe('usePaginatedApi', () => {
  beforeEach(() => {
    global.testServer.use(
      http.get('http://localhost:3001/api/paginated-samples', ({ request }) => {
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '20');

        const allSamples = Array.from({ length: 100 }, (_, i) => ({
          id: i + 1,
          lab_number: `25_${i + 1}`,
          name: `Sample ${i + 1}`
        }));

        const start = (page - 1) * limit;
        const end = start + limit;
        const data = allSamples.slice(start, end);

        return HttpResponse.json({
          success: true,
          data,
          meta: {
            pagination: {
              page,
              limit,
              total: 100,
              totalPages: Math.ceil(100 / limit),
              hasNext: page < Math.ceil(100 / limit),
              hasPrev: page > 1
            }
          }
        });
      })
    );
  });

  it('handles pagination correctly', async () => {
    const { result } = renderHook(() => 
      usePaginatedApi('/api/paginated-samples', { defaultLimit: 10 })
    );

    await waitFor(() => {
      expect(result.current.data).not.toBe(null);
    });

    expect(result.current.data).toHaveLength(10);
    expect(result.current.page).toBe(1);
    expect(result.current.totalPages).toBe(10);
    expect(result.current.total).toBe(100);
    expect(result.current.hasNext).toBe(true);
    expect(result.current.hasPrev).toBe(false);
  });

  it('can navigate to next page', async () => {
    const { result } = renderHook(() => 
      usePaginatedApi('/api/paginated-samples', { defaultLimit: 10 })
    );

    await waitFor(() => {
      expect(result.current.data).not.toBe(null);
    });

    result.current.nextPage();

    await waitFor(() => {
      expect(result.current.page).toBe(2);
    });

    expect(result.current.data[0].name).toBe('Sample 11');
  });

  it('can change page size', async () => {
    const { result } = renderHook(() => 
      usePaginatedApi('/api/paginated-samples', { defaultLimit: 10 })
    );

    await waitFor(() => {
      expect(result.current.data).not.toBe(null);
    });

    result.current.changeLimit(20);

    await waitFor(() => {
      expect(result.current.limit).toBe(20);
      expect(result.current.page).toBe(1);
    });

    expect(result.current.data).toHaveLength(20);
  });
});

describe('usePolling', () => {
  it('polls data at specified interval', async () => {
    jest.useFakeTimers();
    
    let callCount = 0;
    global.testServer.use(
      http.get('http://localhost:3001/api/polling-test', () => {
        callCount++;
        return HttpResponse.json({
          success: true,
          data: { timestamp: Date.now(), callCount }
        });
      })
    );

    const { result } = renderHook(() => 
      usePolling('/api/polling-test', 1000, { immediate: true })
    );

    // Initial call
    await waitFor(() => {
      expect(result.current.data).not.toBe(null);
    });

    expect(callCount).toBe(1);

    // Fast forward time to trigger polling
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(callCount).toBe(2);
    });

    jest.useRealTimers();
  });

  it('can start and stop polling', async () => {
    jest.useFakeTimers();

    const { result } = renderHook(() => 
      usePolling('/api/samples', 1000, { autoStart: false })
    );

    expect(result.current.isPolling).toBe(false);

    result.current.startPolling();
    expect(result.current.isPolling).toBe(true);

    result.current.stopPolling();
    expect(result.current.isPolling).toBe(false);

    jest.useRealTimers();
  });
});