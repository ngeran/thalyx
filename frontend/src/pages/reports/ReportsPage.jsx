/**
 * @file ReportsPage.jsx
 * @description Refactored Reports page component that integrates with the plugin-based navigation system.
 *              This component displays network reports, handles report execution, and manages results display.
 *              It receives data through props from the page integration HOC.
 *
 * @author nikos-geranios_vgi
 * @created 2025-09-03 14:56:10
 * @modified 2025-09-03 14:56:10
 * @version 2.0.0
 *
 * @key-features
 * - Dynamic report listing from backend
 * - Category-based report filtering
 * - Report execution with real-time status
 * - Results table with export capabilities
 * - Sidebar synchronization for report selection
 * - Error handling and retry mechanisms
 *
 * @dependencies
 * - react: ^18.0.0
 * - lucide-react: ^0.263.1 (for icons)
 * - @/core/hooks/withPageIntegration: HOC for page integration
 * - @/core/types/page.types: Type definitions
 *
 * @usage-guide
 * ```jsx
 * // This component is automatically wrapped by withPageIntegration
 * // and registered in the page registry
 *
 * // Direct usage (not recommended):
 * import ReportsPage from '@/pages/reports/ReportsPage';
 *
 * // Props are injected by the HOC:
 * // - data: Reports data from backend
 * // - loading: Loading state
 * // - error: Error state
 * // - pageState: Page-specific state
 * // - setPageState: State updater
 * // - refresh: Data refresh function
 * // - activeItem: Selected report from sidebar
 * // - onItemChange: Report selection handler
 * ```
 */
 
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { withPageIntegration } from '../../core/hooks/withPageIntegration';
import {
  FileText,
  Filter,
  Download,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Calendar,
  Clock,
  Database,
  Search,
  ChevronRight,
  MoreVertical,
  Copy,
  ExternalLink,
  Maximize2
} from 'lucide-react';
 
// =============================================================================
// CONSTANTS
// =============================================================================
 
/**
 * Execution status configurations
 * @description Visual configurations for different execution states
 */
const EXECUTION_STATUS_CONFIG = {
  idle: {
    icon: FileText,
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
    label: 'Ready'
  },
  preparing: {
    icon: Clock,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    label: 'Preparing...'
  },                                    
  running: {
    icon: Loader2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    label: 'Executing...',
    animate: true
  },
  success: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    label: 'Completed'
  },
  error: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    label: 'Failed'
  },
  cancelled: {
    icon: XCircle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    label: 'Cancelled'
  }
};
 
/**
 * Export format options
 * @description Available export formats for report results
 */
const EXPORT_FORMATS = [
  { id: 'csv', label: 'CSV', extension: '.csv', mimeType: 'text/csv' },
  { id: 'json', label: 'JSON', extension: '.json', mimeType: 'application/json' },
  { id: 'excel', label: 'Excel', extension: '.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
];
 
// =============================================================================
// COMPONENT SUB-COMPONENTS
// =============================================================================
 
/**
 * ReportCard Component
 * @description Individual report card display
 */
const ReportCard = ({ report, selected, executing, onSelect, onExecute }) => {
  return (
    <div
      className={`
        relative p-4 border rounded-lg cursor-pointer transition-all
        ${selected ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-200 hover:border-gray-300'}
        ${executing ? 'opacity-75' : ''}
      `}
      onClick={onSelect}
    >
      {/* Report Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="font-semibold text-sm text-gray-900">{report.title}</h3>
          <p className="text-xs text-gray-500 mt-1">{report.category}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExecute();
          }}
          disabled={executing}
          className={`
            p-2 rounded-lg transition-colors
            ${executing                 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-primary text-white hover:bg-primary/90'
            }
          `}
        >
          {executing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </button>
      </div>
 
      {/* Report Details */}
      {report.description && (
        <p className="text-xs text-gray-600 mb-2">{report.description}</p>
      )}
 
      {/* Report Metadata */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Database className="h-3 w-3" />
          {Object.keys(report.fields || {}).length} fields
        </span>
        {report.rpc && (
          <span className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            {report.rpc}
          </span>
        )}
      </div>
 
      {/* Selection Indicator */}
      {selected && (
        <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
      )}
    </div>
  );
};
 
/**
 * ExecutionStatusBar Component
 * @description Shows the current execution status
 */
const ExecutionStatusBar = ({ status, report, executionTime, onCancel }) => {
  const config = EXECUTION_STATUS_CONFIG[status];
  const Icon = config.icon;
 
  if (status === 'idle') return null;
 
  return (
    <div className={`p-4 rounded-lg ${config.bgColor} border border-${config.color.replace('text-', '')}/20`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon
            className={`h-5 w-5 ${config.color} ${config.animate ? 'animate-spin' : ''}`}
          />
          <div>
            <p className={`font-medium ${config.color}`}>{config.label}</p>
            {report && (
              <p className="text-sm text-gray-600 mt-1">
                {report.title} - {report.category}
              </p>
            )}
          </div>
        </div>
 
        <div className="flex items-center gap-3">
          {executionTime !== undefined && (
            <span className="text-sm text-gray-500">
              {(executionTime / 1000).toFixed(2)}s
            </span>
          )}
 
          {status === 'running' && onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
 
/**
 * ResultsTable Component
 * @description Displays report execution results in a table
 */
const ResultsTable = ({ results, onExport }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
 
  // Pagination calculations
  const totalPages = Math.ceil(results.rowCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = results.data.slice(startIndex, endIndex);
 
  // Get column headers
  const columns = useMemo(() => {
    if (!results.data || results.data.length === 0) return [];
    return Object.keys(results.data[0]);
  }, [results.data]);
 
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Results Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Results</h3>
            <p className="text-sm text-gray-500 mt-1">
              {results.rowCount} rows • Executed in {(results.executionTime / 1000).toFixed(2)}s
            </p>
          </div>
 
          {/* Export Options */}
          <div className="flex items-center gap-2">
            {EXPORT_FORMATS.map(format => (
              <button
                key={format.id}
                onClick={() => onExport(format.id)}
                className="px-3 py-1 text-sm bg-gray-50 hover:bg-gray-100 rounded border border-gray-300"
              >
                <Download className="h-3 w-3 inline mr-1" />
                {format.label}
              </button>
            ))}
          </div>
        </div>
      </div>
 
      {/* Results Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map(col => (
                <th
                  key={col}             
                  className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {currentData.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                {columns.map(col => (
                  <td key={col} className="px-4 py-2 text-sm text-gray-900">
                    {row[col]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
 
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(endIndex, results.rowCount)} of {results.rowCount} results
            </p>
 
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
 
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
 
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
 
// =============================================================================
// MAIN COMPONENT
// =============================================================================
 
/**
 * ReportsPage Component
 * @description Main reports page component with plugin integration
 */
const ReportsPage = ({
  data,
  loading,
  error,
  pageState,
  setPageState,
  refresh,
  activeItem,
  onItemChange
}) => {
  // ---------------------------------------------------------------------------
  // LOCAL STATE
  // ---------------------------------------------------------------------------
 
  /** Report filters */
  const [filters, setFilters] = useState({
    category: 'All',
    searchQuery: '',
    sortBy: 'name',
    sortDirection: 'asc'
  });
 
  /** Execution status */
  const [executionStatus, setExecutionStatus] = useState('idle');
 
  /** Selected report */
  const [selectedReport, setSelectedReport] = useState(null);
 
  /** Report results */
  const [reportResults, setReportResults] = useState(null);
 
  /** Execution start time */
  const [executionStartTime, setExecutionStartTime] = useState(null);
 
  /** Execution error */
  const [executionError, setExecutionError] = useState(null);
 
  /** Abort controller for cancellation */
  const abortControllerRef = React.useRef(null);
 
  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------
 
  /**
   * Extract reports data
   */
  const reports = data;
 
  /**
   * Available categories
   */
  const categories = useMemo(() => {
    if (!reports?.categories) return ['All'];
    return ['All', ...reports.categories];
  }, [reports?.categories]);
 
  /**
   * Reports as array
   */
  const reportsArray = useMemo(() => {
    if (!reports?.reports) return [];
 
    return Object.entries(reports.reports).map(([id, report]) => ({
      ...report,
      id
    }));
  }, [reports?.reports]);
 
  /**
   * Filtered and sorted reports
   */
  const filteredReports = useMemo(() => {
    let filtered = reportsArray;
 
    // Filter by category
    if (filters.category !== 'All') {
      filtered = filtered.filter(r => r.category === filters.category);
    }
 
    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(query) ||
        r.category.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query)
      );
    }
 
    // Sort reports
    filtered.sort((a, b) => {
      let comparison = 0;
 
      switch (filters.sortBy) {
        case 'name':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'recent':
          // Sort by last execution (would need execution history)
          comparison = 0;
          break;
      }
 
      return filters.sortDirection === 'asc' ? comparison : -comparison;
    });
 
    return filtered;
  }, [reportsArray, filters]);
 
  /**
   * Category counts
   */
  const categoryCounts = useMemo(() => {
    const counts = { All: reportsArray.length };
 
    reportsArray.forEach(report => {
      counts[report.category] = (counts[report.category] || 0) + 1;
    });
 
    return counts;
  }, [reportsArray]);
 
  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------
 
  /**
   * Sync with sidebar selection
   */
  useEffect(() => {
    if (activeItem && activeItem !== selectedReport?.id) {
      const report = reportsArray.find(r => r.id === activeItem);
      if (report) {
        handleSelectReport(report);
      }
    }
  }, [activeItem, reportsArray]);
 
  /**
   * Restore page state on mount
   */
  useEffect(() => {
    if (pageState.filters) {
      setFilters(pageState.filters);
    }
    if (pageState.selectedReportId) {
      const report = reportsArray.find(r => r.id === pageState.selectedReportId);
      if (report) {
        setSelectedReport(report);
      }
    }
  }, []);
 
  /**
   * Save page state on changes
   */
  useEffect(() => {
    setPageState({
      filters,                          
      selectedReportId: selectedReport?.id
    });
  }, [filters, selectedReport]);
 
  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
 
  /**
   * Handle report selection
   */
  const handleSelectReport = useCallback((report) => {
    console.log('📄 [ReportsPage] Report selected:', report.id);
 
    setSelectedReport(report);
 
    // Update sidebar selection
    if (onItemChange) {
      onItemChange(report.id);
    }
 
    // Clear previous results if different report
    if (reportResults && reportResults.reportId !== report.id) {
      setReportResults(null);
      setExecutionStatus('idle');
      setExecutionError(null);
    }
  }, [onItemChange, reportResults]);
 
  /**
   * Handle report execution
   */
  const handleExecuteReport = useCallback(async (report) => {
    console.log('▶️ [ReportsPage] Executing report:', report.id);
 
    // Cancel any ongoing execution
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
 
    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
 
    // Update state
    setExecutionStatus('preparing');
    setExecutionStartTime(Date.now());
    setExecutionError(null);
    setSelectedReport(report);
 
    try {
      // Prepare execution
      setExecutionStatus('running');
 
      // Execute report via API
      const response = await fetch(`/api/reports/${report.id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          parameters: {},
          format: 'json'
        }),
        signal: abortController.signal
      });
 
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
 
      const result = await response.json();
 
      // Calculate execution time
      const executionTime = Date.now() - (executionStartTime || Date.now());
                                        
      // Store results
      const reportResult = {
        reportId: report.id,
        data: result.data || [],
        executionTime,
        rowCount: result.data?.length || 0,
        timestamp: new Date().toISOString(),
        metadata: result.metadata
      };
 
      setReportResults(reportResult);
      setExecutionStatus('success');
 
      console.log('✅ [ReportsPage] Report executed successfully:', {
        reportId: report.id,
        rows: reportResult.rowCount,
        time: `${(executionTime / 1000).toFixed(2)}s`
      });
 
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('🛑 [ReportsPage] Report execution cancelled');
        setExecutionStatus('cancelled');
      } else {
        console.error('❌ [ReportsPage] Report execution failed:', error);
        setExecutionError(error.message);
        setExecutionStatus('error');
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [executionStartTime]);
 
  /**
   * Handle execution cancellation
   */
  const handleCancelExecution = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setExecutionStatus('cancelled');
    }
  }, []);
 
  /**
   * Handle results export
   */
  const handleExportResults = useCallback((format) => {
    if (!reportResults) return;
 
    console.log(`📥 [ReportsPage] Exporting results as ${format}`);
 
    const exportFormat = EXPORT_FORMATS.find(f => f.id === format);
    if (!exportFormat) return;
 
    let content;
    let blob;
 
    switch (format) {
      case 'csv':
        // Convert to CSV
        const headers = Object.keys(reportResults.data[0] || {});
        const rows = reportResults.data.map(row =>
          headers.map(h => row[h]).join(',')
        );
        content = [headers.join(','), ...rows].join('\n');
        blob = new Blob([content], { type: exportFormat.mimeType });
        break;
 
      case 'json':
        // Export as JSON
        content = JSON.stringify(reportResults.data, null, 2);
        blob = new Blob([content], { type: exportFormat.mimeType });
        break;
 
      case 'excel':
        // Would require a library like xlsx
        console.warn('Excel export not implemented');
        return;
 
      default:
        return;
    }
 
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedReport?.title || 'report'}_${Date.now()}${exportFormat.extension}`;
    link.click();
    URL.revokeObjectURL(url);
  }, [reportResults, selectedReport]);
 
  /**
   * Handle filter changes
   */
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);
 
  // ---------------------------------------------------------------------------
  // RENDER STATES
  // ---------------------------------------------------------------------------
 
  /**
   * Loading state
   */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <h2 className="text-xl font-semibold mb-2">Loading Network Reports</h2>
          <p className="text-muted-foreground">
            Fetching report configurations from backend...
          </p>
        </div>
      </div>
    );
  }
 
  /**
   * Error state
   */
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-lg bg-card rounded-lg border border-border p-6">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Reports Service Unavailable</h2>
          <p className="text-muted-foreground mb-4">
            {error.message || 'Failed to load reports data'}
          </p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4 inline mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }
 
  /**
   * Empty state
   */
  if (!reports || Object.keys(reports.reports || {}).length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md p-6 bg-card rounded-lg border border-border">
          <Database className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Reports Available</h2>
          <p className="text-muted-foreground mb-4">
            No network reports are configured in the backend.
          </p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
          >
            Check Again
          </button>
        </div>
      </div>
    );
  }
 
  // ---------------------------------------------------------------------------
  // MAIN RENDER
  // ---------------------------------------------------------------------------
 
  return (
    <div className="h-full bg-background text-foreground overflow-hidden flex flex-col p-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Network Reports</h1>
            <p className="text-muted-foreground mt-1">
              Execute and analyze network infrastructure reports
            </p>
          </div>
 
          <div className="flex items-center gap-3">
            <button
              onClick={refresh}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh reports"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
 
      {/* Filters Bar */}
      <div className="mb-6 p-4 bg-card rounded-lg border border-border">
        <div className="flex items-center gap-4">
          {/* Category Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange({ category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat} ({categoryCounts[cat] || 0})
                </option>
              ))}
            </select>
          </div>
 
          {/* Search Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={filters.searchQuery}
                onChange={(e) => handleFilterChange({ searchQuery: e.target.value })}
                placeholder="Search reports..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>                        
 
          {/* Sort Options */}
          <div>
            <label className="block text-sm font-medium mb-1">Sort By</label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange({ sortBy: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
            >
              <option value="name">Name</option>
              <option value="category">Category</option>
              <option value="recent">Recent</option>
            </select>
          </div>
        </div>
      </div>
 
      {/* Execution Status */}
      {executionStatus !== 'idle' && (
        <div className="mb-6">
          <ExecutionStatusBar
            status={executionStatus}
            report={selectedReport}
            executionTime={executionStartTime ? Date.now() - executionStartTime : undefined}
            onCancel={executionStatus === 'running' ? handleCancelExecution : undefined}
          />
        </div>
      )}
 
      {/* Error Display */}
      {executionError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-red-800">Execution Error</p>
              <p className="text-sm text-red-700 mt-1">{executionError}</p>
            </div>
          </div>
        </div>
      )}
 
      {/* Main Content Area */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Reports Grid */}
        <div className="w-1/3 overflow-y-auto">
          <div className="grid gap-3">
            {filteredReports.map(report => (
              <ReportCard
                key={report.id}
                report={report}
                selected={selectedReport?.id === report.id}
                executing={executionStatus === 'running' && selectedReport?.id === report.id}
                onSelect={() => handleSelectReport(report)}
                onExecute={() => handleExecuteReport(report)}
              />
            ))}
          </div>
 
          {filteredReports.length === 0 && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No reports match your filters</p>
            </div>
          )}
        </div>
 
        {/* Results Area */}
        <div className="flex-1 overflow-y-auto">
          {reportResults ? (
            <ResultsTable
              results={reportResults}
              onExport={handleExportResults}
            />
          ) : selectedReport ? (
            <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-center">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  {selectedReport.title}
                </h3>
                <p className="text-gray-500 mb-4">
                  Click the play button to execute this report
                </p>
                <button
                  onClick={() => handleExecuteReport(selectedReport)}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  <Play className="h-4 w-4 inline mr-2" />
                  Execute Report
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-center">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Select a report to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
 
// =============================================================================
// EXPORT WITH HOC INTEGRATION
// =============================================================================
 
/**
 * Export the page with HOC integration
 * @description Wraps the component with page integration HOC
 */
export default withPageIntegration(ReportsPage, 'reports', {
  debug: true,
  persistState: true,
  trackPerformance: true
});
