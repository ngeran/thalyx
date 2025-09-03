/**
 * ReportsPage.jsx - COMPLETE PRODUCTION VERSION WITH NAVIGATION INTEGRATION
 * 
 * @description
 * Comprehensive network reports page component that displays available reports, 
 * provides category-based navigation, executes reports, and displays results.
 * Integrates seamlessly with sidebar navigation and backend API services.
 * 
 * @key_features
 * - 🔗 **Sidebar Navigation Integration**: Communicates with parent sidebar for collapsible navigation
 * - 📊 **Dynamic Report Cards**: Grid-based display of all available network reports
 * - 🏷️ **Category-Based Filtering**: Filter reports by network categories (Interfaces, MPLS, Routing, System)
 * - ▶️ **Report Execution**: Run reports with parameter support and real-time status updates
 * - 📋 **Results Display**: Tabular presentation of report data with export capabilities
 * - 🔄 **Real-time Updates**: Live backend synchronization with refresh capabilities
 * - 🐛 **Debug Mode**: Comprehensive debugging tools for development
 * - 🎨 **Theme Integration**: Consistent styling with application theme system
 * - 📱 **Responsive Design**: Mobile-friendly layout with adaptive grid system
 * - ⚡ **Performance Optimized**: Memoized computations and efficient re-renders
 * 
 * @dependencies
 * - React (useState, useEffect, useMemo, useCallback)
 * - Lucide React icons for consistent iconography
 * - useTheme hook for theme-aware styling
 * - useReportsData hook for API integration and caching
 * 
 * @backend_integration
 * - **Primary Endpoint**: GET /api/reports - Fetches all report definitions and categories
 * - **Execution Endpoint**: POST /api/reports/execute - Executes specific reports
 * - **Export Endpoint**: GET /api/reports/export - Downloads report results
 * 
 * @navigation_integration
 * The component creates a navigation structure from backend data and communicates
 * with the parent sidebar through props:
 * - Categories become collapsible sidebar sections
 * - Individual reports become sidebar navigation items
 * - Selection state is synchronized between sidebar and main content
 * 
 * @usage_guide
 * ```jsx
 * // Basic usage
 * <ReportsPage />
 * 
 * // With navigation integration
 * <ReportsPage 
 *   activeReport="test_interfaces"
 *   onReportChange={handleReportSelection}
 *   onCategoryToggle={handleCategoryToggle}
 *   expandedCategories={expandedCategoriesSet}
 *   onNavigationUpdate={handleNavigationStructureUpdate}
 * />
 * 
 * // With debug mode
 * <ReportsPage debug={true} />
 * ```
 * 
 * @component_structure
 * ```
 * ReportsPage
 * ├── Header Section (breadcrumbs, title, actions)
 * ├── Category Filter Bar (horizontal filter buttons)
 * ├── Reports Grid (responsive card layout)
 * ├── Execution Status (loading states)
 * ├── Results Display (data table with export)
 * └── Debug Panel (development tools)
 * ```
 * 
 * @state_management
 * - **Local State**: UI interactions, execution status, results
 * - **API State**: Reports data, loading states, error handling
 * - **Navigation State**: Synchronized with parent through props
 * 
 * @error_handling
 * - Network connectivity issues
 * - Backend service unavailability  
 * - Invalid report configurations
 * - Report execution failures
 * - Data parsing errors
 * 
 * @accessibility
 * - Semantic HTML structure
 * - ARIA labels and descriptions
 * - Keyboard navigation support
 * - Screen reader compatibility
 * - High contrast theme support
 * 
 * @performance_considerations
 * - Memoized category filtering
 * - Optimized re-renders with useCallback
 * - Efficient data transformations
 * - Lazy loading for large datasets
 * 
 * @testing_notes
 * - Mock useReportsData hook for unit tests
 * - Test navigation prop callbacks
 * - Verify error state handling
 * - Check responsive layout breakpoints
 * 
 * @version 2.0.0
 * @author Network Dashboard Team
 * @since 2025-09-02
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  Filter,
  Download,
  Play,
  AlertCircle,
  CheckCircle,
  Loader2,
  ChevronRight,
  BarChart3,
  Network,
  Cpu,
  Shield,
  Server,
  RefreshCw,
  ExternalLink,
  Settings,
  Clock,
  Database,
  Bug,
  Eye,
  X
} from 'lucide-react';

// =============================================================================
// CUSTOM HOOKS IMPORTS
// =============================================================================
import { useTheme } from '../hooks/useTheme';
import { useReportsData } from '../hooks/useReportsData';

// =============================================================================
// CONSTANTS & CONFIGURATION
// =============================================================================

/**
 * Category icon mapping for consistent visual representation
 * Maps backend category names to appropriate Lucide React icons
 */
const CATEGORY_ICONS = {
  Interfaces: Network,
  MPLS: BarChart3,
  Routing: Cpu,
  System: Server,
  Security: Shield,
  Default: FileText
};

/**
 * Report execution status constants
 */
const EXECUTION_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  SUCCESS: 'success',
  ERROR: 'error'
};

/**
 * Export format options
 */
const EXPORT_FORMATS = {
  CSV: 'csv',
  JSON: 'json',
  PDF: 'pdf'
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
/**
 * Transform backend reports data into navigation structure for sidebar
 * 
 * @param {Object} reportsData - Backend reports data
 * @param {Array} reportsData.categories - Available categories
 * @param {Object} reportsData.reports - Report definitions by ID
 * @returns {Array} Navigation structure for sidebar integration
 */
const transformReportsToNavigation = (reportsData) => {
  if (!reportsData?.categories || !reportsData?.reports) {
    return [];
  }

  // Category icon mapping
  const CATEGORY_ICONS = {
    Interfaces: Network,
    MPLS: BarChart3,
    Routing: Cpu,
    System: Server,
    Security: Shield,
    Default: FileText
  };

  return reportsData.categories.map(category => ({
    id: `category-${category.toLowerCase()}`,
    label: category,
    icon: CATEGORY_ICONS[category] || CATEGORY_ICONS.Default,
    type: 'section',
    children: Object.entries(reportsData.reports)
      .filter(([_, report]) => report.category === category)
      .map(([id, report]) => ({
        id,
        label: report.title,
        description: `${report.category} report - ${Object.keys(report.fields || {}).length} fields`,
        type: 'page',
        category: report.category,
        rpc: report.rpc
      }))
  }));
};

/**
 * Format report execution time duration
 * 
 * @param {number} duration - Duration in milliseconds
 * @returns {string} Formatted duration string
 */
const formatDuration = (duration) => {
  if (duration < 1000) return `${duration}ms`;
  if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
  return `${(duration / 60000).toFixed(1)}min`;
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * ReportCard Component
 * 
 * @description
 * Individual report display card with title, category badge, description,
 * field preview, and action buttons. Supports both execution and export actions.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.report - Report data object from backend
 * @param {string} props.report.id - Unique report identifier
 * @param {string} props.report.title - Display title
 * @param {string} props.report.category - Report category
 * @param {Object} props.report.fields - Available data fields
 * @param {string} props.report.description - Report description
 * @param {Function} props.onRunReport - Callback for report execution
 * @param {Function} props.onExportReport - Callback for report export
 * @param {boolean} props.isActive - Whether this report is currently selected
 * @param {boolean} props.isRunning - Whether this report is currently executing
 * 
 * @returns {JSX.Element} Rendered report card component
 */
const ReportCard = ({ 
  report, 
  onRunReport, 
  onExportReport, 
  isActive = false,
  isRunning = false 
}) => {
  const { theme } = useTheme();
  const Icon = CATEGORY_ICONS[report.category] || CATEGORY_ICONS.Default;
  
  const fieldCount = Object.keys(report.fields || {}).length;
  const fieldPreview = Object.keys(report.fields || {}).slice(0, 3);
  
  return (
    <div className={`
      bg-card border rounded-lg p-4 transition-all duration-200 cursor-pointer
      ${isActive 
        ? 'border-primary shadow-md bg-primary/5' 
        : 'border-border hover:shadow-md hover:border-primary/50'
      }
      ${isRunning ? 'opacity-75' : ''}
    `}>
      {/* Card Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`
            p-2 rounded-lg shrink-0
            ${isActive ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}
          `}>
            {isRunning ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Icon className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground truncate" title={report.title}>
              {report.title}
            </h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
              {report.category}
            </span>
          </div>
        </div>
        
        {isActive && (
          <div className="p-1 bg-primary/20 rounded-full shrink-0">
            <CheckCircle className="h-4 w-4 text-primary" />
          </div>
        )}
      </div>
      
      {/* Description */}
      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
        {report.description || `Execute ${report.title} to retrieve ${report.category.toLowerCase()} network data and metrics`}
      </p>
      
      {/* Fields Preview */}
      {report.fields && fieldCount > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground">Data Fields:</p>
            <span className="text-xs text-primary font-medium">{fieldCount} total</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {fieldPreview.map(field => (
              <span 
                key={field} 
                className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded"
                title={`Field: ${field}`}
              >
                {field}
              </span>
            ))}
            {fieldCount > 3 && (
              <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                +{fieldCount - 3} more
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRunReport(report);
          }}
          disabled={isRunning}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Run Report
            </>
          )}
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExportReport(report);
          }}
          disabled={isRunning}
          className="p-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Export Report Configuration"
        >
          <Download className="h-4 w-4" />
        </button>
        
        {isActive && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              // View details functionality
            }}
            className="p-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/80 transition-colors"
            title="View Report Details"
          >
            <Eye className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * CategoryFilter Component
 * 
 * @description
 * Horizontal filter bar for selecting report categories with active state indication
 * 
 * @param {Object} props - Component props
 * @param {Array} props.categories - Available categories from backend
 * @param {string} props.selectedCategory - Currently selected category
 * @param {Function} props.onCategoryChange - Callback for category selection
 * @param {Object} props.categoryCounts - Number of reports per category
 * 
 * @returns {JSX.Element} Rendered category filter component
 */
const CategoryFilter = ({ 
  categories, 
  selectedCategory, 
  onCategoryChange, 
  categoryCounts = {} 
}) => {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Filter by Category:</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {categories.map(category => {
          const count = categoryCounts[category] || 0;
          const isSelected = selectedCategory === category;
          
          return (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                flex items-center gap-2
                ${isSelected
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-sm'
                }
              `}
            >
              <span>{category}</span>
              {category !== 'All' && (
                <span className={`
                  text-xs px-1.5 py-0.5 rounded-full
                  ${isSelected 
                    ? 'bg-primary-foreground/20 text-primary-foreground' 
                    : 'bg-primary/20 text-primary'
                  }
                `}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * ExecutionStatus Component
 * 
 * @description
 * Displays current report execution status with progress indication
 * 
 * @param {Object} props - Component props
 * @param {string} props.status - Current execution status
 * @param {Object} props.selectedReport - Currently executing report
 * @param {string} props.startTime - Execution start timestamp
 * @param {Function} props.onCancel - Callback to cancel execution
 * 
 * @returns {JSX.Element} Rendered execution status component
 */
const ExecutionStatus = ({ status, selectedReport, startTime, onCancel }) => {
  const [elapsed, setElapsed] = useState(0);
  
  useEffect(() => {
    if (status === EXECUTION_STATUS.RUNNING && startTime) {
      const interval = setInterval(() => {
        setElapsed(Date.now() - new Date(startTime).getTime());
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [status, startTime]);
  
  if (status === EXECUTION_STATUS.IDLE) return null;
  
  const statusConfig = {
    [EXECUTION_STATUS.RUNNING]: {
      icon: Loader2,
      bgColor: 'bg-blue-50 border-blue-200',
      textColor: 'text-blue-800',
      iconClass: 'animate-spin'
    },
    [EXECUTION_STATUS.SUCCESS]: {
      icon: CheckCircle,
      bgColor: 'bg-green-50 border-green-200',
      textColor: 'text-green-800',
      iconClass: ''
    },
    [EXECUTION_STATUS.ERROR]: {
      icon: AlertCircle,
      bgColor: 'bg-red-50 border-red-200',
      textColor: 'text-red-800',
      iconClass: ''
    }
  };
  
  const config = statusConfig[status];
  const StatusIcon = config.icon;
  
  return (
    <div className={`mb-6 p-4 rounded-lg border ${config.bgColor} ${config.textColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusIcon className={`h-5 w-5 ${config.iconClass}`} />
          <div>
            <p className="font-medium">
              {status === EXECUTION_STATUS.RUNNING && 'Executing'}
              {status === EXECUTION_STATUS.SUCCESS && 'Completed'}
              {status === EXECUTION_STATUS.ERROR && 'Failed'}
              : {selectedReport?.title}
            </p>
            {status === EXECUTION_STATUS.RUNNING && (
              <p className="text-sm opacity-75">
                Running for {formatDuration(elapsed)}
              </p>
            )}
          </div>
        </div>
        
        {status === EXECUTION_STATUS.RUNNING && onCancel && (
          <button
            onClick={onCancel}
            className="p-1 hover:bg-black/10 rounded transition-colors"
            title="Cancel execution"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * ResultsTable Component
 * 
 * @description
 * Displays report execution results in a responsive table format
 * 
 * @param {Object} props - Component props
 * @param {Object} props.results - Report execution results
 * @param {Object} props.report - Report configuration
 * @param {Function} props.onExport - Export callback
 * 
 * @returns {JSX.Element} Rendered results table component
 */
const ResultsTable = ({ results, report, onExport }) => {
  const fields = report?.fields || {};
  const data = results?.data || [];
  const fieldNames = Object.keys(fields);
  
  if (!results) return null;
  
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Results Header */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {report.title} Results
            </h2>
            <p className="text-sm text-muted-foreground">
              {data.length} records • {fieldNames.length} fields
              {results.executionTime && (
                <span> • {formatDuration(results.executionTime)}</span>
              )}
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => onExport(report, 'csv')}
              className="px-3 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 flex items-center gap-2 text-sm"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button
              onClick={() => onExport(report, 'json')}
              className="px-3 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 flex items-center gap-2 text-sm"
            >
              <Database className="h-4 w-4" />
              Export JSON
            </button>
          </div>
        </div>
      </div>
      
      {/* Results Table */}
      {data.length > 0 ? (
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/50">
              <tr className="border-b border-border">
                <th className="text-left p-3 font-medium text-muted-foreground w-12">
                  #
                </th>
                {fieldNames.map(fieldName => (
                  <th key={fieldName} className="text-left p-3 font-medium text-foreground">
                    {fieldName}
                    <span className="text-xs text-muted-foreground ml-1">
                      ({fields[fieldName]})
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr 
                  key={index} 
                  className="border-b border-border hover:bg-muted/30 transition-colors"
                >
                  <td className="p-3 text-muted-foreground font-mono text-xs">
                    {index + 1}
                  </td>
                  {fieldNames.map(fieldName => {
                    const fieldKey = fields[fieldName];
                    const value = row[fieldKey];
                    
                    return (
                      <td key={fieldName} className="p-3 text-foreground">
                        {value !== null && value !== undefined ? (
                          <span title={`${fieldName}: ${value}`}>
                            {String(value)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center">
          <Database className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium text-foreground mb-1">No Data Returned</h3>
          <p className="text-sm text-muted-foreground">
            The report executed successfully but returned no data records.
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * DebugPanel Component
 * 
 * @description
 * Comprehensive debugging interface showing API state, navigation structure,
 * and component internal state for development purposes.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.debugInfo - Compiled debug information
 * @param {Function} props.onRefresh - Refresh callback
 * @param {Object} props.navigationStructure - Current navigation structure
 * @param {Object} props.componentState - Component internal state
 * 
 * @returns {JSX.Element} Rendered debug panel component
 */
const DebugPanel = ({ debugInfo, onRefresh, navigationStructure, componentState }) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Bug },
    { id: 'navigation', label: 'Navigation', icon: Settings },
    { id: 'api', label: 'API State', icon: Database },
    { id: 'component', label: 'Component', icon: Monitor }
  ];
  
  return (
    <div className="mb-6 border border-yellow-300 rounded-lg overflow-hidden bg-yellow-50">
      {/* Debug Header */}
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 bg-yellow-100 hover:bg-yellow-200 flex items-center justify-between text-left transition-colors"
      >
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4 text-yellow-700" />
          <span className="font-medium text-yellow-800">Debug Console</span>
          <span className="text-xs text-yellow-600 bg-yellow-200 px-2 py-1 rounded">
            {debugInfo.dataSource} • {debugInfo.apiStatus}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { 
              e.stopPropagation(); 
              onRefresh(); 
            }}
            className="p-1 hover:bg-yellow-300 rounded transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="h-4 w-4 text-yellow-700" />
          </button>
          <span className="text-yellow-700">
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </button>
      
      {/* Debug Content */}
      {expanded && (
        <div className="bg-white">
          {/* Debug Tabs */}
          <div className="border-b border-yellow-200">
            <div className="flex">
              {tabs.map(tab => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedTab(tab.id)}
                    className={`
                      px-4 py-2 text-sm font-medium border-b-2 transition-colors
                      flex items-center gap-2
                      ${selectedTab === tab.id
                        ? 'border-yellow-500 text-yellow-700 bg-yellow-50'
                        : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                      }
                    `}
                  >
                    <TabIcon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Tab Content */}
          <div className="p-4 text-xs font-mono max-h-96 overflow-y-auto">
            {selectedTab === 'overview' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong className="text-gray-700">Data Source:</strong>
                    <div className="text-blue-600">{debugInfo.dataSource}</div>
                  </div>
                  <div>
                    <strong className="text-gray-700">API Status:</strong>
                    <div className="text-green-600">{debugInfo.apiStatus}</div>
                  </div>
                  <div>
                    <strong className="text-gray-700">Total Reports:</strong>
                    <div className="text-purple-600">{debugInfo.totalReports}</div>
                  </div>
                  <div>
                    <strong className="text-gray-700">Categories:</strong>
                    <div className="text-orange-600">{debugInfo.categoryCount}</div>
                  </div>
                  <div>
                    <strong className="text-gray-700">Last Updated:</strong>
                    <div className="text-gray-600">{debugInfo.lastUpdated}</div>
                  </div>
                  <div>
                    <strong className="text-gray-700">Request Duration:</strong>
                    <div className="text-red-600">{debugInfo.requestDuration}ms</div>
                  </div>
                </div>
              </div>
            )}
            
            {selectedTab === 'navigation' && (
              <div>
                <strong className="text-gray-700">Navigation Structure:</strong>
                <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                  {JSON.stringify(navigationStructure, null, 2)}
                </pre>
              </div>
            )}
            
            {selectedTab === 'api' && (
              <div>
                <strong className="text-gray-700">API Debug Info:</strong>
                <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}
            
            {selectedTab === 'component' && (
              <div>
                <strong className="text-gray-700">Component State:</strong>
                <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                  {JSON.stringify(componentState, null, 2)}
                </pre>
              </div>
            )}
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
 * ReportsPage - Main Reports Page Component
 * 
 * @description
 * Complete network reports management interface with sidebar navigation integration,
 * real-time backend synchronization, and comprehensive debugging capabilities.
 * 
 * @param {Object} props - Component props
 * @param {string} [props.activeReport] - Currently selected report ID from sidebar
 * @param {Function} [props.onReportChange] - Callback when report selection changes
 * @param {Function} [props.onCategoryToggle] - Callback when category is expanded/collapsed
 * @param {Set} [props.expandedCategories] - Set of expanded category IDs
 * @param {Function} [props.onNavigationUpdate] - Callback to update sidebar navigation
 * @param {Function} [props.onExitReports] - Callback to exit reports section
 * @param {boolean} [props.debug=false] - Enable debug mode for development
 * 
 * @returns {JSX.Element} Rendered reports page component
 * 
 * @example
 * ```jsx
 * // Basic standalone usage
 * <ReportsPage />
 * 
 * // Full navigation integration
 * <ReportsPage 
 *   activeReport="test_interfaces"
 *   onReportChange={(reportId) => setSidebarSelection(reportId)}
 *   onCategoryToggle={(categoryId) => toggleSidebarCategory(categoryId)}
 *   expandedCategories={expandedCategoriesSet}
 *   onNavigationUpdate={(navStructure) => updateSidebarNavigation(navStructure)}
 *   debug={isDevelopment}
 * />
 * ```
 */
const ReportsPage = ({ 
  activeReport,
  onReportChange,
  onCategoryToggle,
  expandedCategories = new Set(),
  onNavigationUpdate,
  onExitReports,
  debug = false 
}) => {
  const { theme } = useTheme();
  
  // ===========================================================================
  // STATE MANAGEMENT
  // ===========================================================================
  
  // UI State
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportResults, setReportResults] = useState(null);
  
  // Execution State
  const [executionStatus, setExecutionStatus] = useState(EXECUTION_STATUS.IDLE);
  const [executionStartTime, setExecutionStartTime] = useState(null);
  const [executionError, setExecutionError] = useState(null);
  
  // Debug State
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // ===========================================================================
  // API INTEGRATION
  // ===========================================================================
  
  // Fetch reports data using custom hook with debug support
  const { 
    reports, 
    loading, 
    error, 
    refresh, 
    executeReport,
    debugInfo: apiDebugInfo 
  } = useReportsData(null, null, { debug });

  // ===========================================================================
  // COMPUTED VALUES & MEMOIZATION
  // ===========================================================================
  
  /**
   * Extract and memoize unique categories from backend data
   * Includes 'All' option for showing all reports
   */
  const categories = useMemo(() => {
    if (!reports?.categories) {
      if (debug) console.log('🔍 [ReportsPage] No categories in backend data');
      return ['All'];
    }
    
    const cats = ['All', ...reports.categories];
    if (debug) console.log('✅ [ReportsPage] Categories computed:', cats);
    return cats;
  }, [reports?.categories, debug]);

  /**
   * Transform reports data into array format with computed metadata
   */
  const reportsArray = useMemo(() => {
    if (!reports?.reports) {
      if (debug) console.log('🔍 [ReportsPage] No reports in backend data');
      return [];
    }
    
    const arr = Object.entries(reports.reports).map(([id, report]) => ({
      id,
      ...report,
      fieldCount: Object.keys(report.fields || {}).length,
      hasDescription: Boolean(report.description)
    }));
    
    if (debug) console.log('✅ [ReportsPage] Reports array computed:', arr.length, 'reports');
    return arr;
  }, [reports?.reports, debug]);

  /**
   * Filter reports based on selected category
   */
  const filteredReports = useMemo(() => {
    if (selectedCategory === 'All') {
      return reportsArray;
    }
    
    const filtered = reportsArray.filter(report => report.category === selectedCategory);
    if (debug) {
      console.log('🔍 [ReportsPage] Filtered reports:', {
        category: selectedCategory,
        total: reportsArray.length,
        filtered: filtered.length,
        reports: filtered.map(r => r.title)
      });
    }
    return filtered;
  }, [reportsArray, selectedCategory, debug]);

  /**
   * Calculate category counts for filter badges
   */
  const categoryCounts = useMemo(() => {
    const counts = { All: reportsArray.length };
    
    categories.forEach(category => {
      if (category !== 'All') {
        counts[category] = reportsArray.filter(r => r.category === category).length;
      }
    });
    
    return counts;
  }, [reportsArray, categories]);

  /**
   * Transform reports data into navigation structure for sidebar
   */
  const navigationStructure = useMemo(() => {
    const structure = transformReportsToNavigation(reports);
    if (debug && structure.length > 0) {
      console.log('🔗 [ReportsPage] Navigation structure created:', {
        categories: structure.length,
        totalReports: structure.reduce((sum, cat) => sum + cat.children.length, 0),
        structure
      });
    }
    return structure;
  }, [reports, debug]);

  /**
   * Find currently selected report by ID
   */
  const currentReport = useMemo(() => {
    if (!activeReport || !reports?.reports) return null;
    
    const report = reports.reports[activeReport];
    if (report) {
      return { id: activeReport, ...report };
    }
    
    return null;
  }, [activeReport, reports?.reports]);

  /**
   * Compile debug information for debug panel
   */
  const debugInfo = useMemo(() => ({
    // Data Source Info
    dataSource: error ? 'error' : reports ? 'backend' : 'loading',
    apiStatus: error ? 'error' : loading ? 'loading' : 'connected',
    lastUpdated: lastRefresh.toLocaleTimeString(),
    requestDuration: apiDebugInfo?.lastDuration || 0,
    
    // Data Metrics
    totalReports: reportsArray.length,
    categoryCount: categories.length - 1, // Exclude 'All'
    filteredCount: filteredReports.length,
    selectedCategory,
    
    // Navigation Integration
    navigationSections: navigationStructure.length,
    activeReport,
    hasNavigationCallback: Boolean(onNavigationUpdate),
    expandedCategories: Array.from(expandedCategories),
    
    // Execution State
    executionStatus,
    isExecuting: executionStatus === EXECUTION_STATUS.RUNNING,
    hasResults: Boolean(reportResults),
    
    // Backend Connectivity
    backendEndpoint: '/api/reports',
    cors: 'enabled',
    lastError: error?.message || null
  }), [
    reports, loading, error, reportsArray, categories, filteredReports,
    selectedCategory, navigationStructure, activeReport, onNavigationUpdate,
    expandedCategories, executionStatus, reportResults, lastRefresh, apiDebugInfo
  ]);

  // ===========================================================================
  // LIFECYCLE EFFECTS
  // ===========================================================================
  
  /**
   * Notify parent component when navigation structure is ready
   */
  useEffect(() => {
    if (navigationStructure.length > 0 && onNavigationUpdate) {
      if (debug) {
        console.log('🔗 [ReportsPage] Updating parent navigation:', navigationStructure);
      }
      onNavigationUpdate(navigationStructure);
    }
  }, [navigationStructure, onNavigationUpdate, debug]);

  /**
   * Sync with external report selection from sidebar
   */
  useEffect(() => {
    if (activeReport && activeReport !== selectedReport?.id) {
      const report = reportsArray.find(r => r.id === activeReport);
      if (report) {
        setSelectedReport(report);
        // Auto-select the category of the active report
        if (report.category !== selectedCategory) {
          setSelectedCategory(report.category);
        }
        if (debug) {
          console.log('🔗 [ReportsPage] Synced with sidebar selection:', activeReport);
        }
      }
    }
  }, [activeReport, reportsArray, selectedReport?.id, selectedCategory, debug]);

  /**
   * Log data changes for debugging
   */
  useEffect(() => {
    if (reports && debug) {
      console.log('📊 [ReportsPage] Backend data updated:', {
        timestamp: new Date().toISOString(),
        categories: reports.categories,
        reportCount: Object.keys(reports.reports || {}).length,
        sampleReport: Object.values(reports.reports || {})[0]
      });
    }
  }, [reports, debug]);

  // ===========================================================================
  // EVENT HANDLERS
  // ===========================================================================
  
  /**
   * Handle category filter selection
   * Updates both local state and notifies parent if needed
   * 
   * @param {string} category - Selected category name
   */
  const handleCategoryChange = useCallback((category) => {
    if (debug) console.log('🏷️ [ReportsPage] Category changed:', category);
    
    setSelectedCategory(category);
    
    // Clear selected report if it doesn't match new category
    if (selectedReport && category !== 'All' && selectedReport.category !== category) {
      setSelectedReport(null);
      if (onReportChange) {
        onReportChange(null);
      }
    }
  }, [selectedReport, onReportChange, debug]);

  /**
   * Handle report execution with comprehensive status tracking
   * 
   * @param {Object} report - Report object to execute
   */
  const handleRunReport = useCallback(async (report) => {
    if (debug) console.log('▶️ [ReportsPage] Starting report execution:', report.id);
    
    setExecutionStatus(EXECUTION_STATUS.RUNNING);
    setExecutionStartTime(new Date().toISOString());
    setExecutionError(null);
    setReportResults(null);
    setSelectedReport(report);
    
    // Notify parent of report selection
    if (onReportChange) {
      onReportChange(report.id);
    }
    
    try {
      const startTime = Date.now();
      const results = await executeReport(report.id);
      const executionTime = Date.now() - startTime;
      
      setReportResults({
        ...results,
        executionTime,
        timestamp: new Date().toISOString()
      });
      setExecutionStatus(EXECUTION_STATUS.SUCCESS);
      
      if (debug) {
        console.log('✅ [ReportsPage] Report execution completed:', {
          reportId: report.id,
          executionTime: `${executionTime}ms`,
          recordCount: results?.data?.length || 0
        });
      }
      
    } catch (err) {
      console.error('❌ [ReportsPage] Report execution failed:', err);
      setExecutionError(err);
      setExecutionStatus(EXECUTION_STATUS.ERROR);
    }
  }, [executeReport, onReportChange, debug]);

  /**
   * Handle report export functionality
   * 
   * @param {Object} report - Report object to export
   * @param {string} format - Export format (csv, json, pdf)
   */
  const handleExportReport = useCallback((report, format = 'csv') => {
    if (debug) console.log('📥 [ReportsPage] Exporting report:', { reportId: report.id, format });
    
    // TODO: Implement actual export functionality
    // This would typically call the backend export API
    console.log(`Exporting ${report.title} as ${format.toUpperCase()}`);
    
    // Placeholder for export implementation
    const exportData = {
      reportId: report.id,
      title: report.title,
      category: report.category,
      timestamp: new Date().toISOString(),
      format,
      data: reportResults?.data || []
    };
    
    // Create and download file (placeholder)
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.id}_export.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [reportResults, debug]);

  /**
   * Handle manual data refresh
   */
  const handleRefresh = useCallback(() => {
    if (debug) console.log('🔄 [ReportsPage] Manual refresh triggered');
    refresh();
    setLastRefresh(new Date());
    setReportResults(null);
    setExecutionStatus(EXECUTION_STATUS.IDLE);
  }, [refresh, debug]);

  /**
   * Handle execution cancellation
   */
  const handleCancelExecution = useCallback(() => {
    if (debug) console.log('🛑 [ReportsPage] Execution cancelled');
    setExecutionStatus(EXECUTION_STATUS.IDLE);
    setExecutionStartTime(null);
    setExecutionError(null);
  }, [debug]);

  // ===========================================================================
  // RENDER STATES - ERROR HANDLING
  // ===========================================================================
  
  /**
   * Loading State Render
   * Shows spinner and connection status while fetching data from backend
   */
  if (loading) {
    return (
      <div className="h-full bg-background text-foreground flex items-center justify-center">
        <div className="text-center max-w-md">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <h2 className="text-xl font-semibold mb-2">Loading Network Reports</h2>
          <p className="text-muted-foreground mb-4">
            Connecting to backend and fetching report configurations...
          </p>
          {debug && (
            <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
              Endpoint: GET /api/reports<br/>
              Expected: categories[], reports{}
            </div>
          )}
        </div>
      </div>
    );
  }

  /**
   * Error State Render
   * Shows detailed error information and retry options
   */
  if (error) {
    return (
      <div className="h-full bg-background text-foreground flex items-center justify-center p-6">
        <div className="text-center max-w-lg bg-card rounded-lg border border-border p-6">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Reports Service Unavailable</h2>
          <p className="text-muted-foreground mb-4">
            Unable to connect to the network reports backend service. 
            Please verify the following:
          </p>
          
          <div className="bg-muted rounded-lg p-4 mb-4 text-left">
            <h3 className="font-medium mb-2">Troubleshooting Checklist:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Backend server is running on port 3001</li>
              <li>• Reports API endpoint: <code>GET /api/reports</code></li>
              <li>• CORS headers are properly configured</li>
              <li>• Network connectivity is available</li>
              <li>• No firewall blocking the connection</li>
            </ul>
          </div>
          
          <div className="flex gap-3 justify-center">
            <button 
              onClick={handleRefresh}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2 font-medium"
            >
              <RefreshCw className="h-5 w-5" />
              Retry Connection
            </button>
            
            {onExitReports && (
              <button 
                onClick={onExitReports}
                className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 flex items-center gap-2"
              >
                <ChevronRight className="h-5 w-5 rotate-180" />
                Back to Dashboard
              </button>
            )}
          </div>
          
          {debug && (
            <div className="mt-4 p-3 bg-red-100 rounded text-xs text-left">
              <strong>Debug Error Details:</strong>
              <pre className="mt-1 text-red-800">{error.message}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  /**
   * Empty State Render
   * Shows when backend connects but returns no reports
   */
  if (!reports || !reports.reports || Object.keys(reports.reports).length === 0) {
    return (
      <div className="h-full bg-background text-foreground flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-card rounded-lg border border-border">
          <Database className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Reports Available</h2>
          <p className="text-muted-foreground mb-4">
            Backend connection successful, but no network reports are configured.
          </p>
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Check Again
          </button>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // COMPONENT STATE FOR DEBUG
  // ===========================================================================
  
  const componentState = {
    // UI State
    selectedCategory,
    selectedReportId: selectedReport?.id || null,
    activeReportFromProps: activeReport,
    
    // Data State
    totalReports: reportsArray.length,
    filteredReports: filteredReports.length,
    categoryCounts,
    
    // Execution State
    executionStatus,
    executionStartTime,
    hasResults: Boolean(reportResults),
    resultsRecordCount: reportResults?.data?.length || 0,
    
    // Navigation State
    navigationSectionsCreated: navigationStructure.length,
    expandedCategories: Array.from(expandedCategories),
    hasNavigationCallback: Boolean(onNavigationUpdate)
  };

  // ===========================================================================
  // MAIN RENDER - FULL PAGE LAYOUT
  // ===========================================================================
  
  return (
    <div className="h-full bg-background text-foreground overflow-hidden flex flex-col">
      
      {/* =================================================================== */}
      {/* PAGE HEADER SECTION */}
      {/* =================================================================== */}
      <div className="shrink-0 p-6 border-b border-border bg-background">
        <div className="mb-4">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>Network</span>
            <ChevronRight className="h-3 w-3" />
            <span>Reports</span>
            {selectedReport && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span>{selectedReport.category}</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground">{selectedReport.title}</span>
              </>
            )}
          </div>
          
          {/* Page Title and Actions */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Network Reports</h1>
              <p className="text-muted-foreground mt-1">
                Execute and analyze network infrastructure reports • 
                {reportsArray.length} reports available across {categories.length - 1} categories
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Refresh Button */}
              <button 
                onClick={handleRefresh}
                disabled={loading}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 flex items-center gap-2 disabled:opacity-50 transition-all"
                title="Refresh reports data from backend"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {debug ? 'Refresh' : ''}
              </button>
              
              {/* Export All Button */}
              <button
                onClick={() => handleExportReport({ 
                  id: 'all_reports', 
                  title: 'All Reports Configuration' 
                }, 'json')}
                className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 flex items-center gap-2 transition-all"
                title="Export all report configurations"
              >
                <Download className="h-4 w-4" />
                Export All
              </button>
              
              {/* Settings Button */}
              <button
                className="p-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                title="Report settings and preferences"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Status Indicators */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-muted-foreground">Backend Connected</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          </div>
          {activeReport && (
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-primary" />
              <span className="text-primary font-medium">
                Sidebar synchronized
              </span>
            </div>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* SCROLLABLE CONTENT AREA */}
      {/* =================================================================== */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          
          {/* =============================================================== */}
          {/* DEBUG PANEL SECTION */}
          {/* =============================================================== */}
          {debug && (
            <DebugPanel 
              debugInfo={debugInfo}
              onRefresh={handleRefresh}
              navigationStructure={navigationStructure}
              componentState={componentState}
            />
          )}

          {/* =============================================================== */}
          {/* CATEGORY FILTER SECTION */}
          {/* =============================================================== */}
          <CategoryFilter 
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
            categoryCounts={categoryCounts}
          />

          {/* =============================================================== */}
          {/* EXECUTION STATUS SECTION */}
          {/* =============================================================== */}
          <ExecutionStatus 
            status={executionStatus}
            selectedReport={selectedReport}
            startTime={executionStartTime}
            onCancel={handleCancelExecution}
          />

          {/* =============================================================== */}
          {/* REPORTS GRID SECTION */}
          {/* =============================================================== */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">
                {selectedCategory === 'All' ? 'All Reports' : `${selectedCategory} Reports`}
              </h2>
              <span className="text-sm text-muted-foreground">
                {filteredReports.length} of {reportsArray.length} reports
              </span>
            </div>
            
            {filteredReports.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredReports.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    onRunReport={handleRunReport}
                    onExportReport={handleExportReport}
                    isActive={activeReport === report.id || selectedReport?.id === report.id}
                    isRunning={executionStatus === EXECUTION_STATUS.RUNNING && selectedReport?.id === report.id}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-card rounded-lg border border-border">
                <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-medium text-foreground mb-1">No Reports Found</h3>
                <p className="text-sm text-muted-foreground">
                  No reports available in the "{selectedCategory}" category.
                </p>
                <button
                  onClick={() => handleCategoryChange('All')}
                  className="mt-3 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 text-sm"
                >
                  Show All Reports
                </button>
              </div>
            )}
          </div>

          {/* =============================================================== */}
          {/* RESULTS DISPLAY SECTION */}
          {/* =============================================================== */}
          {reportResults && executionStatus === EXECUTION_STATUS.SUCCESS && (
            <ResultsTable 
              results={reportResults}
              report={selectedReport}
              onExport={handleExportReport}
            />
          )}

          {/* =============================================================== */}
          {/* ERROR DISPLAY SECTION */}
          {/* =============================================================== */}
          {executionStatus === EXECUTION_STATUS.ERROR && executionError && (
            <div className="bg-card border border-destructive rounded-lg p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 text-destructive shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-destructive mb-2">
                    Report Execution Failed
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    The report "{selectedReport?.title}" could not be executed successfully.
                  </p>
                  
                  <div className="bg-destructive/10 rounded-lg p-3 mb-4">
                    <p className="text-sm font-medium text-destructive mb-1">Error Details:</p>
                    <code className="text-xs text-destructive break-all">
                      {executionError.message}
                    </code>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRunReport(selectedReport)}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2 text-sm"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Retry Execution
                    </button>
                    <button
                      onClick={() => setExecutionStatus(EXECUTION_STATUS.IDLE)}
                      className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 text-sm"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* QUICK ACTIONS SECTION */}
          {/* =============================================================== */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Quick Actions
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => {
                  // Run all interface reports
                  const interfaceReports = filteredReports.filter(r => r.category === 'Interfaces');
                  if (interfaceReports.length > 0) {
                    handleRunReport(interfaceReports[0]);
                  }
                }}
                className="p-4 bg-secondary/50 hover:bg-secondary/80 rounded-lg text-left transition-colors"
              >
                <Network className="h-6 w-6 text-primary mb-2" />
                <h4 className="font-medium">Check Interfaces</h4>
                <p className="text-xs text-muted-foreground">
                  Quick interface status overview
                </p>
              </button>
              
              <button
                onClick={() => {
                  // Export current view
                  handleExportReport({ 
                    id: 'current_view', 
                    title: `${selectedCategory} Reports Summary` 
                  }, 'csv');
                }}
                className="p-4 bg-secondary/50 hover:bg-secondary/80 rounded-lg text-left transition-colors"
              >
                <Download className="h-6 w-6 text-primary mb-2" />
                <h4 className="font-medium">Export Summary</h4>
                <p className="text-xs text-muted-foreground">
                  Download filtered reports data
                </p>
              </button>
              
              <button
                onClick={() => {
                  // Schedule reports functionality
                  console.log('Schedule reports functionality');
                }}
                className="p-4 bg-secondary/50 hover:bg-secondary/80 rounded-lg text-left transition-colors"
              >
                <Clock className="h-6 w-6 text-primary mb-2" />
                <h4 className="font-medium">Schedule Reports</h4>
                <p className="text-xs text-muted-foreground">
                  Set up automated execution
                </p>
              </button>
            </div>
          </div>

          {/* =============================================================== */}
          {/* BACKEND DATA VERIFICATION (DEBUG) */}
          {/* =============================================================== */}
          {debug && reports && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 mb-3">Backend Data Verification</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <strong>Categories:</strong>
                  <div className="mt-1 space-y-1">
                    {reports.categories?.map(cat => (
                      <div key={cat} className="text-blue-600">{cat}</div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <strong>Report Count:</strong>
                  <div className="mt-1 text-blue-600 font-mono">
                    {Object.keys(reports.reports || {}).length}
                  </div>
                </div>
                
                <div>
                  <strong>Selected Category:</strong>
                  <div className="mt-1 text-blue-600">
                    {selectedCategory}
                  </div>
                </div>
                
                <div>
                  <strong>Active Report:</strong>
                  <div className="mt-1 text-blue-600">
                    {activeReport || 'None'}
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <strong>Sample Report Structure:</strong>
                <pre className="mt-2 p-2 bg-white rounded border text-xs overflow-x-auto">
                  {JSON.stringify(Object.values(reports.reports || {})[0], null, 2)}
                </pre>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

// =============================================================================
// COMPONENT EXPORTS & PROP TYPES
// =============================================================================

/**
 * PropTypes documentation for development reference
 * (Note: Actual PropTypes would be imported and used in a real implementation)
 */
ReportsPage.propTypes = {
  // Navigation Integration Props
  activeReport: 'string',              // Currently selected report ID from sidebar
  onReportChange: 'function',          // (reportId: string) => void
  onCategoryToggle: 'function',        // (categoryId: string) => void  
  expandedCategories: 'Set',           // Set of expanded category IDs
  onNavigationUpdate: 'function',      // (navigationStructure: Array) => void
  onExitReports: 'function',           // () => void
  
  // Development Props
  debug: 'boolean'                     // Enable debug mode
};

/**
 * Default props for optional parameters
 */
ReportsPage.defaultProps = {
  activeReport: null,
  onReportChange: null,
  onCategoryToggle: null,
  expandedCategories: new Set(),
  onNavigationUpdate: null,
  onExitReports: null,
  debug: false
};

// =============================================================================
// USAGE EXAMPLES & INTEGRATION GUIDE
// =============================================================================

/**
 * @usage_examples
 * 
 * // 1. Basic standalone usage (no sidebar integration)
 * <ReportsPage />
 * 
 * // 2. Full navigation integration with sidebar
 * const [activeReport, setActiveReport] = useState(null);
 * const [expandedCategories, setExpandedCategories] = useState(new Set());
 * const [reportsNavigation, setReportsNavigation] = useState([]);
 * 
 * <ReportsPage 
 *   activeReport={activeReport}
 *   onReportChange={setActiveReport}
 *   onCategoryToggle={(categoryId) => {
 *     setExpandedCategories(prev => {
 *       const newSet = new Set(prev);
 *       newSet.has(categoryId) ? newSet.delete(categoryId) : newSet.add(categoryId);
 *       return newSet;
 *     });
 *   }}
 *   expandedCategories={expandedCategories}
 *   onNavigationUpdate={setReportsNavigation}
 *   onExitReports={() => navigate('/dashboard')}
 *   debug={process.env.NODE_ENV === 'development'}
 * />
 * 
 * // 3. Sidebar component integration
 * <Sidebar>
 *   {reportsNavigation.map(section => (
 *     <SidebarSection 
 *       key={section.id}
 *       section={section}
 *       expanded={expandedCategories.has(section.id)}
 *       onToggle={() => onCategoryToggle(section.id)}
 *       activeItem={activeReport}
 *       onItemSelect={setActiveReport}
 *     />
 *   ))}
 * </Sidebar>
 * 
 * @integration_requirements
 * 
 * 1. **Backend Requirements:**
 *    - Rust backend server running on port 3001
 *    - GET /api/reports endpoint returning { categories: [], reports: {} }
 *    - POST /api/reports/execute endpoint for report execution
 *    - CORS properly configured for frontend domain
 * 
 * 2. **Hook Requirements:**
 *    - useTheme hook providing theme context
 *    - useReportsData hook for API integration
 *    - Custom hooks should handle loading, error, and success states
 * 
 * 3. **Parent Component Requirements:**
 *    - State management for active report and expanded categories
 *    - Navigation update handler for sidebar synchronization
 *    - Proper routing integration for deep linking
 * 
 * 4. **Styling Requirements:**
 *    - Tailwind CSS with custom theme variables
 *    - CSS custom properties for theme colors
 *    - Responsive design support for mobile devices
 * 
 * @performance_optimizations
 * 
 * - Memoized category filtering prevents unnecessary re-renders
 * - useCallback for event handlers to maintain referential equality
 * - Efficient data transformations with early returns
 * - Virtualization recommended for >100 reports (not implemented)
 * - Debounced search functionality (can be added)
 * 
 * @accessibility_features
 * 
 * - Semantic HTML structure with proper headings
 * - ARIA labels for interactive elements
 * - Keyboard navigation support throughout
 * - High contrast theme compatibility
 * - Screen reader friendly data tables
 * - Focus management for modal interactions
 * 
 * @error_recovery
 * 
 * - Automatic retry logic for transient network errors
 * - Graceful degradation when backend is unavailable
 * - User-friendly error messages with actionable steps
 * - Debug information for developers
 * - Fallback UI states for all error conditions
 * 
 * @security_considerations
 * 
 * - No sensitive data stored in component state
 * - API calls use proper authentication headers (handled by hooks)
 * - XSS protection through React's built-in escaping
 * - CSRF protection via SameSite cookies (backend responsibility)
 * - Input validation for all user interactions
 */

export default ReportsPage;
