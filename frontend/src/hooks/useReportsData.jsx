
/**
 * useReportsData Hook
 * =============================================================================
 * @description
 * A custom React hook for fetching, filtering, and executing network reports 
 * from the backend API. Provides comprehensive state management for reports 
 * data, including loading states, error handling, and execution capabilities.
 * 
 * -----------------------------------------------------------------------------
 * Key Features:
 * - Fetches all reports, specific reports, or category-filtered reports
 * - Executes reports with custom parameters
 * - Returns unified state (loading, error, lastFetch)
 * - Debug logging for development and monitoring
 * - Refresh action for manual re-fetching
 * 
 * -----------------------------------------------------------------------------
 * Dependencies:
 * - React (useState, useEffect, useCallback)
 * 
 * -----------------------------------------------------------------------------
 * Backend Endpoints:
 * - GET /api/reports                → Retrieve all available reports
 * - GET /api/reports/:report_id     → Get specific report configuration
 * - GET /api/reports/filter/:cat    → Filter reports by category
 * - POST /api/reports/:id/execute   → Execute a report with parameters
 * 
 * -----------------------------------------------------------------------------
 * Usage Guide:
 * ```jsx
 * import { useReportsData } from '../hooks/useReportsData';
 * 
 * function ReportsExample() {
 *   const { reports, loading, error, executeReport, refresh } = useReportsData(null, null, { debug: true });
 * 
 *   if (loading) return <p>Loading...</p>;
 *   if (error) return <p>Error: {error}</p>;
 * 
 *   return (
 *     <div>
 *       <h1>Available Reports ({reports?.categories?.length || 0})</h1>
 *       <button onClick={refresh}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * -----------------------------------------------------------------------------
 */

import { useState, useEffect, useCallback } from 'react';

// =============================================================================
// CONSTANTS & CONFIGURATION
// =============================================================================

/**
 * API endpoint configuration
 */
const API_ENDPOINTS = {
  ALL_REPORTS: '/api/reports',
  SPECIFIC_REPORT: (reportId) => `/api/reports/${reportId}`,
  FILTERED_REPORTS: (category) => `/api/reports/filter/${category}`,
  EXECUTE_REPORT: (reportId) => `/api/reports/${reportId}/execute`
};

// =============================================================================
// MAIN HOOK IMPLEMENTATION
// =============================================================================

export const useReportsData = (reportId = null, category = null, options = {}) => {
  const { debug = false } = options;

  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------
  const [reports, setReports] = useState(null);   // All or filtered reports
  const [report, setReport] = useState(null);     // Single report
  const [loading, setLoading] = useState(true);   // Loading flag
  const [error, setError] = useState(null);       // Error message
  const [lastFetch, setLastFetch] = useState(null); // Timestamp of last fetch

  // ---------------------------------------------------------------------------
  // DEBUG LOGGER
  // ---------------------------------------------------------------------------
  const logDebug = useCallback((message, data = null) => {
    if (debug) {
      console.log(`🔵 [useReportsData] ${message}`, data || '');
    }
  }, [debug]);

  // ---------------------------------------------------------------------------
  // API FETCH FUNCTION
  // ---------------------------------------------------------------------------
  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);

    let endpoint;
    if (reportId) {
      endpoint = API_ENDPOINTS.SPECIFIC_REPORT(reportId);
    } else if (category) {
      endpoint = API_ENDPOINTS.FILTERED_REPORTS(category);
    } else {
      endpoint = API_ENDPOINTS.ALL_REPORTS;
    }

    try {
      logDebug('Fetching reports', { endpoint });
      const startTime = Date.now();

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      const duration = Date.now() - startTime;

      logDebug('Reports fetched', { duration: `${duration}ms` });

      if (reportId) {
        setReport(data.report || data);
      } else {
        setReports(data.reports || data);
      }

      setLastFetch(new Date());
      setLoading(false);
    } catch (err) {
      logDebug('Fetch failed', { error: err.message });
      setError(err.message);
      setLoading(false);
    }
  }, [reportId, category, debug, logDebug]);

  // ---------------------------------------------------------------------------
  // REPORT EXECUTION
  // ---------------------------------------------------------------------------
  const executeReport = useCallback(async (reportId, parameters = {}) => {
    try {
      logDebug('Executing report', { reportId, parameters });

      const response = await fetch(API_ENDPOINTS.EXECUTE_REPORT(reportId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parameters }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      logDebug('Execution complete', { reportId, resultCount: data?.data?.length || 0 });

      return data;
    } catch (err) {
      logDebug('Execution failed', { error: err.message });
      throw err;
    }
  }, [debug, logDebug]);

  // ---------------------------------------------------------------------------
  // EFFECT: INITIAL FETCH
  // ---------------------------------------------------------------------------
  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // ---------------------------------------------------------------------------
  // RETURN API
  // ---------------------------------------------------------------------------
  return {
    reports,
    report,
    loading,
    error,
    lastFetch,
    refresh: fetchReports,
    executeReport,
    debugInfo: {
      reportId,
      category,
      lastFetch,
      hasReports: !!reports,
      hasReport: !!report,
      reportsCount: reports ? (reports.total || Object.keys(reports.reports || reports).length) : 0,
    }
  };
};

export default useReportsData;
