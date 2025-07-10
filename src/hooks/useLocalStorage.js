import { useState, useEffect, useCallback } from 'react';

export const useLocalStorage = (key, initialValue, options = {}) => {
  const { 
    serialize = JSON.stringify, 
    deserialize = JSON.parse,
    errorHandler = (error) => console.error(`localStorage error for key "${key}":`, error)
  } = options;

  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? deserialize(item) : initialValue;
    } catch (error) {
      errorHandler(error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, serialize(valueToStore));
    } catch (error) {
      errorHandler(error);
    }
  }, [key, serialize, storedValue, errorHandler]);

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      errorHandler(error);
    }
  }, [key, initialValue, errorHandler]);

  // Listen for changes to this key from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === key && e.newValue !== serialize(storedValue)) {
        try {
          setStoredValue(e.newValue ? deserialize(e.newValue) : initialValue);
        } catch (error) {
          errorHandler(error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, storedValue, serialize, deserialize, initialValue, errorHandler]);

  return [storedValue, setValue, removeValue];
};

export const useSessionStorage = (key, initialValue, options = {}) => {
  const { 
    serialize = JSON.stringify, 
    deserialize = JSON.parse,
    errorHandler = (error) => console.error(`sessionStorage error for key "${key}":`, error)
  } = options;

  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? deserialize(item) : initialValue;
    } catch (error) {
      errorHandler(error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.sessionStorage.setItem(key, serialize(valueToStore));
    } catch (error) {
      errorHandler(error);
    }
  }, [key, serialize, storedValue, errorHandler]);

  const removeValue = useCallback(() => {
    try {
      window.sessionStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      errorHandler(error);
    }
  }, [key, initialValue, errorHandler]);

  return [storedValue, setValue, removeValue];
};

export default useLocalStorage;