import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type FetchConfig<Body> = {
  path: string;
  method?: HttpMethod;
  body?: Body;
  params?: Record<string, string | number | boolean | undefined>;
  token?: string | null;
  headers?: Record<string, string>;
  skip?: boolean;
  cacheKey?: string;
};

type ApiState<T> = {
  data: T | null;
  error: Error | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  timestamp: number | null;
};

type Action<T> =
  | { type: 'loading' }
  | { type: 'success'; payload: T }
  | { type: 'error'; error: Error }
  | { type: 'reset' };

const initialState = <T,>(): ApiState<T> => ({
  data: null,
  error: null,
  status: 'idle',
  timestamp: null,
});

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

const buildQueryString = (params?: FetchConfig<unknown>['params']) => {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    searchParams.append(key, String(value));
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

const reducer = <T,>(state: ApiState<T>, action: Action<T>): ApiState<T> => {
  switch (action.type) {
    case 'loading':
      return {
        ...state,
        status: 'loading',
        error: null,
      };
    case 'success':
      return {
        data: action.payload,
        error: null,
        status: 'success',
        timestamp: Date.now(),
      };
    case 'error':
      return {
        ...state,
        status: 'error',
        error: action.error,
      };
    case 'reset':
      return initialState<T>();
    default:
      return state;
  }
};

type UseApiReturn<T, Body> = ApiState<T> & {
  refetch: (override?: Partial<Omit<FetchConfig<Body>, 'path'>>) => Promise<void>;
  mutate: (updater: (current: T | null) => T) => void;
};

const responseCache = new Map<string, unknown>();

export function useApi<T, Body = unknown>(config: FetchConfig<Body>): UseApiReturn<T, Body> {
  const { cacheKey, skip } = config;
  const [state, dispatch] = useReducer(reducer<T>, initialState<T>());
  const abortController = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortController.current?.abort();
    };
  }, []);

  const execute = useCallback(
    async (override?: Partial<Omit<FetchConfig<Body>, 'path'>>) => {
      if (skip) return;

      const merged: FetchConfig<Body> = {
        ...config,
        ...override,
      };

      const key = merged.cacheKey ?? merged.path + buildQueryString(merged.params ?? config.params);
      if (merged.method === 'GET' && cacheKey && responseCache.has(key)) {
        dispatch({ type: 'success', payload: responseCache.get(key) as T });
        return;
      }

      dispatch({ type: 'loading' });
      abortController.current?.abort();
      abortController.current = new AbortController();

      try {
        const query = buildQueryString(merged.params ?? config.params);
        const url = `${apiUrl.replace(/\/$/, '')}${merged.path}${query}`;
        const headers: Record<string, string> = {
          Accept: 'application/json',
          ...(merged.headers ?? config.headers),
        };
        const method = (merged.method ?? config.method ?? 'GET').toUpperCase() as HttpMethod;

        if (method !== 'GET') {
          headers['Content-Type'] = 'application/json';
        }

        const token = merged.token ?? config.token;
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(url, {
          method,
          headers,
          body: method === 'GET' || method === 'DELETE' ? undefined : JSON.stringify(merged.body ?? config.body),
          signal: abortController.current.signal,
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const message =
            errorBody?.message ??
            `Request to ${merged.path} failed with status ${response.status} (${response.statusText})`;
          throw new Error(message);
        }

        const json = (await response.json()) as T;
        if (!mountedRef.current) return;

        if (merged.method === 'GET' && cacheKey) {
          responseCache.set(key, json);
        }

        dispatch({ type: 'success', payload: json });
      } catch (error) {
        const isAbort =
          typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError';
        if (!mountedRef.current || isAbort) return;
        dispatch({ type: 'error', error: error instanceof Error ? error : new Error('Unknown error') });
      }
    },
    [config, cacheKey, skip],
  );

  useEffect(() => {
    execute();
  }, [execute]);

  const mutate = useCallback(
    (updater: (current: T | null) => T) => {
      dispatch({ type: 'success', payload: updater(state.data) });
    },
    [state.data],
  );

  return useMemo(
    () => ({
      ...state,
      refetch: execute,
      mutate,
    }),
    [state, execute, mutate],
  );
}

export function clearApiCache() {
  responseCache.clear();
}

