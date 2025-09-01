/**
 * useApiData Hook - PRODUCTION READY VERSION WITH DEBUGGING
 * 
 * ## Version: 3.1.0
 * ## Description: Robust hook for API data fetching with comprehensive debugging
 * ## Key Features:
 * - Automatic data fetching with loading states
 * - Comprehensive error handling with detailed logging
 * - Memory leak prevention with abort controller
 * - Debug mode with request/response logging
 * - Performance monitoring
 * 
 * ## Dependencies:
 * - React (useState, useEffect, useCallback, useRef)
 * 
 * ## Usage:
 * const { data, loading, error, refresh, isEmpty } = useApiData(
 *   'user-data', 
 *   () => fetch('/api/users').then(res => res.json()),
 *   { 
 *     debug: true, // Enable detailed logging
 *     onSuccess: (data) => console.log('Data loaded'),
 *     onError: (error) => console.error('Error:', error)
 *   }
 * );
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for managing API data fetching state with debugging capabilities
 * 
 * @param {string} key - Unique identifier for the data (used for re-fetching and caching)
 * @param {Function} fetchFunction - Async function that returns the data
 * @param {Object} options - Configuration options
 * @param {Function} options.onSuccess - Callback executed on successful data fetch
 * @param {Function} options.onError - Callback executed on fetch error
 * @param {boolean} options.enabled - Whether to automatically fetch data (default: true)
 * @param {boolean} options.debug - Enable detailed debug logging (default: false)
 * 
 * @returns {Object} Hook return object
 * @returns {any} return.data - The fetched data (null if not loaded)
 * @returns {boolean} return.loading - True if data is currently being fetched
 * @returns {string|null} return.error - Error message if fetch failed (null otherwise)
 * @returns {Function} return.refresh - Function to manually re-fetch data
 * @returns {boolean} return.isEmpty - True if data is loaded but empty
 * @returns {Object} return.debugInfo - Debug information about the request
 */
export const useApiData = (key, fetchFunction, options = {}) => {
  const { debug = false, ...otherOptions } = options;
  
  // State management
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({
    lastRequestTime: null,
    lastResponseTime: null,
    requestCount: 0,
    errorCount: 0,
    responseSize: 0
  });

  // Use refs to store options and fetchFunction to prevent infinite re-renders
  const optionsRef = useRef(otherOptions);
  const fetchFunctionRef = useRef(fetchFunction);
  const abortControllerRef = useRef(null);
  
  /**
   * Update refs when dependencies change
   */
  useEffect(() => {
    optionsRef.current = otherOptions;
    fetchFunctionRef.current = fetchFunction;
  }, [otherOptions, fetchFunction]);

  /**
   * Log debug information with consistent formatting
   */
  const logDebug = useCallback((message, data = null) => {
    if (debug) {
      console.log(`🔵 [useApiData:${key}] ${message}`, data || '');
    }
  }, [debug, key]);

  /**
   * Main data fetching function with comprehensive debugging
   */
  const fetchData = useCallback(async () => {
    // Skip fetch if disabled
    if (optionsRef.current.enabled === false) {
      logDebug('Fetch disabled via options');
      setLoading(false);
      return;
    }

    // Abort previous request if it exists
    if (abortControllerRef.current) {
      logDebug('Aborting previous request');
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const startTime = Date.now();

    try {
      logDebug('Starting fetch request');
      setLoading(true);
      setError(null);
      
      // Update debug info
      setDebugInfo(prev => ({
        ...prev,
        lastRequestTime: startTime,
        requestCount: prev.requestCount + 1
      }));

      // Execute the fetch function with abort signal
      const result = await fetchFunctionRef.current(abortControllerRef.current.signal);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Only update state if request wasn't aborted
      if (!abortControllerRef.current.signal.aborted) {
        logDebug(`Request completed in ${duration}ms`, result);
        
        setData(result);
        
        // Calculate response size (approximate)
        const responseSize = JSON.stringify(result).length;
        
        // Update debug info
        setDebugInfo(prev => ({
          ...prev,
          lastResponseTime: endTime,
          responseSize,
          lastDuration: duration
        }));

        // Execute success callback if provided
        if (optionsRef.current.onSuccess) {
          optionsRef.current.onSuccess(result);
        }
      } else {
        logDebug('Request was aborted');
      }
    } catch (err) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Only handle error if request wasn't aborted
      if (!abortControllerRef.current.signal.aborted) {
        const errorMessage = err.message || 'Failed to fetch data';
        
        logDebug(`Request failed after ${duration}ms`, err);
        
        setError(errorMessage);
        
        // Update debug info
        setDebugInfo(prev => ({
          ...prev,
          lastResponseTime: endTime,
          errorCount: prev.errorCount + 1,
          lastError: errorMessage,
          lastDuration: duration
        }));

        // Execute error callback if provided
        if (optionsRef.current.onError) {
          optionsRef.current.onError(err);
        }
      }
    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setLoading(false);
      }
    }
  }, [debug, key, logDebug]);

  /**
   * Effect to automatically fetch data when key changes or component mounts
   */
  useEffect(() => {
    logDebug('Component mounted or key changed, triggering fetch');
    fetchData();

    // Cleanup function to abort ongoing requests
    return () => {
      if (abortControllerRef.current) {
        logDebug('Component unmounting, aborting request');
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, key, logDebug]);

  /**
   * Manual refresh function
   */
  const refresh = useCallback(() => {
    logDebug('Manual refresh triggered');
    fetchData();
  }, [fetchData, logDebug]);

  /**
   * Computed property to check if data is empty
   */
  const isEmpty = !loading && !error && (
    !data || 
    (Array.isArray(data) && data.length === 0) ||
    (typeof data === 'object' && Object.keys(data).length === 0)
  );

  // Return hook API
  return {
    /** The fetched data (null if not loaded yet) */
    data,
    /** True if data is currently being fetched */
    loading,
    /** Error message if fetch failed (null otherwise) */
    error,
    /** Function to manually trigger data re-fetch */
    refresh,
    /** True if data is loaded but empty (no items or empty object) */
    isEmpty,
    /** Debug information about API requests */
    debugInfo: {
      ...debugInfo,
      currentKey: key,
      isLoading: loading,
      hasError: !!error,
      isEmpty,
      dataType: data ? (Array.isArray(data) ? 'array' : typeof data) : 'null',
      dataSize: data ? (Array.isArray(data) ? data.length : Object.keys(data).length) : 0
    }
  };
};

export default useApiData;
