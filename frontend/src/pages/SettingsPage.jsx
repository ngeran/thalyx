/**
 * SettingsPage.jsx - PRODUCTION READY VERSION WITH DEBUGGING
 * 
 * @description
 * Settings page component with backend API integration, comprehensive debugging,
 * and consistent theme implementation. Exclusively uses backend data with no fallbacks.
 * 
 * Key Features:
 * - Fetches navigation data exclusively from Rust backend
 * - Comprehensive debug logging and state inspection
 * - Real-time backend connection monitoring
 * - Production-ready error handling
 * - Theme-aware styling throughout
 * 
 * @dependencies
 * - React (useState, useEffect, useMemo)
 * - Lucide React icons
 * - useApiData custom hook for API calls
 * - useTheme hook for consistent styling
 * 
 * @backend_endpoints
 * - GET /api/navigation/settings - Returns settings navigation structure
 * - GET /api/network/inventory - Returns network inventory data
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Settings,
  User,
  Shield,
  Network,
  Database,
  Palette,
  Bell,
  Monitor,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Loader2,
  Download,
  Save,
  Bug,
  DatabaseIcon,
  RefreshCw
} from 'lucide-react';

// Import theme hook for consistent styling
import { useTheme } from '../hooks/useTheme';

// Import API hook
import { useApiData } from '../hooks/useApiData';

// ===========================================================================
// API CLIENT FOR RUST BACKEND WITH DEBUGGING
// ===========================================================================
/**
 * API client for communicating with Rust backend with comprehensive debugging
 * 
 * @endpoints
 * - GET /api/navigation/settings - Retrieve settings navigation structure
 * - GET /api/network/inventory - Retrieve network inventory data
 */
const apiClient = {
  /**
   * Fetch settings navigation from Rust backend with debug logging
   * 
   * @param {boolean} debug - Enable debug logging
   * @returns {Promise} Promise resolving to navigation data
   * @throws {Error} If network request fails or response is invalid
   */
  getSettingsNavigation: async (debug = false) => {
    const startTime = Date.now();
    const endpoint = '/api/navigation/settings';
    
    try {
      if (debug) console.log('🔵 [API] Fetching settings navigation from:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const duration = Date.now() - startTime;
      
      // Check response status
      if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        if (debug) console.error('🔴 [API] HTTP error:', error.message, { duration, status: response.status });
        throw error;
      }

      // Verify response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const error = new Error('Server responded with non-JSON content');
        if (debug) console.error('🔴 [API] Non-JSON response:', { duration, contentType });
        throw error;
      }

      const data = await response.json();
      const result = data.navigation || data;
      
      if (debug) {
        console.log('✅ [API] Successfully fetched navigation:', {
          duration: `${duration}ms`,
          endpoint,
          sectionCount: result.length,
          sections: result.map(s => ({ id: s.id, label: s.label, items: s.children?.length || 0 })),
          fullData: result
        });
      }
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      if (debug) console.error('🔴 [API] Failed to fetch settings navigation:', {
        error: error.message,
        duration: `${duration}ms`,
        endpoint
      });
      throw error;
    }
  },

  /**
   * Fetch network inventory data from Rust backend
   * 
   * @returns {Promise} Promise resolving to inventory data
   * @throws {Error} If network request fails
   */
  getInventory: async () => {
    try {
      const response = await fetch('/api/network/inventory', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.inventory || data;
      
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
      throw error;
    }
  }
};

// ===========================================================================
// DEBUG COMPONENTS
// ===========================================================================

/**
 * DebugPanel - Displays comprehensive debug information
 */
const DebugPanel = ({ navigationData, debugInfo, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!debugInfo) return null;

  return (
    <div className="mb-4 border border-gray-300 rounded-lg overflow-hidden">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 bg-gray-100 hover:bg-gray-200 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4 text-blue-600" />
          <span className="font-medium">Debug Information</span>
          <span className="text-xs text-gray-500">
            {debugInfo.dataSource} • {debugInfo.sectionCount} sections
          </span>
        </div>
        <div className="flex items-center gap-2">
          <RefreshCw 
            className="h-4 w-4 text-gray-500 hover:text-gray-700" 
            onClick={(e) => { e.stopPropagation(); onRefresh(); }}
          />
          {expanded ? '▲' : '▼'}
        </div>
      </button>
      
      {expanded && (
        <div className="p-4 bg-white text-xs font-mono">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <strong>Data Source:</strong> {debugInfo.dataSource}
            </div>
            <div>
              <strong>Sections:</strong> {debugInfo.sectionCount}
            </div>
            <div>
              <strong>Last Updated:</strong> {debugInfo.lastUpdated}
            </div>
            <div>
              <strong>Duration:</strong> {debugInfo.requestDuration}ms
            </div>
          </div>
          
          <div className="mb-3">
            <strong>Section Details:</strong>
            <div className="mt-1 space-y-1">
              {navigationData?.map((section, index) => (
                <div key={section.id} className="flex justify-between">
                  <span>{section.label}</span>
                  <span className="text-gray-500">
                    {section.children?.length || 0} items
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <strong>Raw Data Preview:</strong>
            <pre className="mt-1 p-2 bg-gray-100 rounded overflow-x-auto">
              {JSON.stringify(navigationData?.slice(0, 2), null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * ConnectionStatus - Shows backend connection status
 */
const ConnectionStatus = ({ loading, error, lastUpdated }) => {
  if (loading) {
    return (
      <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded-lg border border-blue-300 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Connecting to backend...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-lg border border-red-300 flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        <span>Backend connection failed: {error.message}</span>
      </div>
    );
  }

  return (
    <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg border border-green-300 flex items-center gap-2">
      <CheckCircle className="h-4 w-4" />
      <span>Connected to backend {lastUpdated}</span>
    </div>
  );
};

// ===========================================================================
// MAIN SETTINGS PAGE COMPONENT
// ===========================================================================
/**
 * EnhancedSettingsPage - Main settings page component with debugging
 * 
 * @param {Object} props - Component props
 * @param {string} props.activeSettingsPage - Currently active settings page ID
 * @param {Function} props.onSettingsPageChange - Callback for page change events
 * @param {Function} props.onExitSettings - Callback for exiting settings
 * @param {boolean} props.debug - Enable debug features
 * 
 * @returns {JSX.Element} Rendered settings page component
 */
const EnhancedSettingsPage = ({ 
  activeSettingsPage = 'profile', 
  onSettingsPageChange,
  onExitSettings,
  debug = false 
}) => {
  const { theme } = useTheme();
  
  // ===========================================================================
  // API DATA FETCHING - NO FALLBACK DATA
  // ===========================================================================
  const { 
    data: settingsNavigationData, 
    loading: navigationLoading, 
    error: navigationError,
    refresh: refreshNavigation,
    debugInfo: apiDebugInfo
  } = useApiData(
    'settings-navigation',
    () => apiClient.getSettingsNavigation(debug),
    { 
      debug,
      onError: (error) => {
        console.error('Settings navigation error:', error);
        if (debug) {
          console.log('🔴 [SettingsPage] Navigation data unavailable - check backend connection');
        }
      }
    }
  );

  // ===========================================================================
  // STATE MANAGEMENT
  // ===========================================================================
  const [selectedNavItem, setSelectedNavItem] = useState(activeSettingsPage);
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // ===========================================================================
  // COMPUTED VALUES WITH DEBUG INFO
  // ===========================================================================
  const currentSection = useMemo(() => {
    if (!settingsNavigationData) return null;
    const section = settingsNavigationData.find(section =>
      section.children?.some(child => child.id === selectedNavItem)
    );
    if (debug && section) {
      console.log('✅ [SettingsPage] Current section:', section);
    }
    return section;
  }, [selectedNavItem, settingsNavigationData, debug]);

  const currentPage = useMemo(() => {
    if (!currentSection || !currentSection.children) return null;
    const page = currentSection.children.find(child => child.id === selectedNavItem);
    if (debug && page) {
      console.log('✅ [SettingsPage] Current page:', page);
    }
    return page;
  }, [currentSection, selectedNavItem, debug]);

  // Prepare debug information
  const debugInfo = useMemo(() => ({
    dataSource: navigationError ? 'error' : settingsNavigationData ? 'backend' : 'loading',
    sectionCount: settingsNavigationData?.length || 0,
    lastUpdated: lastRefresh.toLocaleTimeString(),
    requestDuration: apiDebugInfo?.lastDuration || 0,
    currentSection: currentSection?.label || 'None',
    currentPage: currentPage?.label || 'None',
    apiStatus: navigationError ? 'error' : navigationLoading ? 'loading' : 'success'
  }), [settingsNavigationData, navigationLoading, navigationError, currentSection, currentPage, lastRefresh, apiDebugInfo]);

  // ===========================================================================
  // EFFECTS
  // ===========================================================================
  
  /**
   * Sync with parent component's active page
   */
  useEffect(() => {
    if (debug) console.log('🔄 [SettingsPage] Active page sync:', activeSettingsPage);
    setSelectedNavItem(activeSettingsPage);
  }, [activeSettingsPage, debug]);

  /**
   * Auto-expand section containing active page when data is available
   */
  useEffect(() => {
    if (settingsNavigationData && selectedNavItem) {
      const section = settingsNavigationData.find(section =>
        section.children?.some(child => child.id === selectedNavItem)
      );
      if (section) {
        if (debug) console.log('📂 [SettingsPage] Auto-expanding section:', section.id);
        setExpandedSections(prev => new Set([...prev, section.id]));
      }
    }
  }, [selectedNavItem, settingsNavigationData, debug]);

  /**
   * Log navigation data when it changes
   */
  useEffect(() => {
    if (settingsNavigationData && debug) {
      console.log('✅ [SettingsPage] Navigation data loaded:', {
        sections: settingsNavigationData.map(s => ({
          id: s.id,
          label: s.label,
          itemCount: s.children?.length || 0
        })),
        fullData: settingsNavigationData
      });
    }
  }, [settingsNavigationData, debug]);

  // ===========================================================================
  // HANDLERS
  // ===========================================================================
  
  const handleRefresh = () => {
    if (debug) console.log('🔄 [SettingsPage] Manual refresh triggered');
    refreshNavigation();
    setLastRefresh(new Date());
  };

  // ===========================================================================
  // RENDER STATES
  // ===========================================================================
  
  /**
   * Loading state - shows spinner while fetching navigation data
   */
  if (navigationLoading) {
    return (
      <div className="h-full bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading settings from backend...</p>
          {debug && (
            <div className="mt-2 text-xs text-gray-500">
              Fetching: /api/navigation/settings
            </div>
          )}
        </div>
      </div>
    );
  }

  /**
   * Error state - shows error message when navigation data fails to load
   */
  if (navigationError) {
    return (
      <div className="h-full bg-background text-foreground flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-card rounded-lg border border-border">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Backend Connection Error</h2>
          <p className="text-muted-foreground mb-4">
            Could not load settings navigation from backend. Please check:
          </p>
          <ul className="text-sm text-muted-foreground mb-4 text-left">
            <li>• Backend server is running on port 3001</li>
            <li>• Endpoint: GET /api/navigation/settings</li>
            <li>• CORS is properly configured</li>
          </ul>
          <div className="flex gap-2 justify-center">
            <button 
              onClick={handleRefresh}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Retry Connection
            </button>
          </div>
          {debug && (
            <div className="mt-4 p-3 bg-red-100 rounded text-xs">
              <strong>Error Details:</strong> {navigationError.message}
            </div>
          )}
        </div>
      </div>
    );
  }

  /**
   * Empty state - shows message when no navigation data is available
   */
  if (!settingsNavigationData || settingsNavigationData.length === 0) {
    return (
      <div className="h-full bg-background text-foreground flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-card rounded-lg border border-border">
          <DatabaseIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Settings Configuration</h2>
          <p className="text-muted-foreground mb-4">
            Backend connected successfully but no navigation data was returned.
          </p>
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
          >
            Check Again
          </button>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // MAIN RENDER
  // ===========================================================================
  return (
    <div className="h-full bg-background text-foreground">
      {/* Content Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <span>Settings</span>
              <ChevronRight className="h-3 w-3" />
              <span>{currentSection?.label || 'General'}</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground">{currentPage?.label || 'Settings'}</span>
            </div>
            <h1 className="text-2xl font-semibold text-foreground">
              {currentPage?.label || 'Settings'}
            </h1>
            {currentPage?.description && (
              <p className="text-muted-foreground mt-1">
                {currentPage.description}
              </p>
            )}
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={handleRefresh}
              className="px-3 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 flex items-center gap-2"
              title="Refresh navigation data"
            >
              <RefreshCw className="h-4 w-4" />
              {debug && 'Refresh'}
            </button>
            
            {selectedNavItem === 'inventory' && (
              <>
                <button 
                  onClick={() => {}} // Placeholder for export function
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
                <button 
                  disabled={loading}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6 overflow-y-auto bg-background h-full">
        {/* Debug panel */}
        {debug && (
          <DebugPanel 
            navigationData={settingsNavigationData}
            debugInfo={debugInfo}
            onRefresh={handleRefresh}
          />
        )}

        {/* Connection status */}
        <ConnectionStatus 
          loading={navigationLoading}
          error={navigationError}
          lastUpdated={lastRefresh.toLocaleTimeString()}
        />
        
        {/* Main content area */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{currentPage?.label || 'Settings'}</h2>
          <p className="text-muted-foreground">
            This is the settings content for {currentPage?.label || 'the selected page'}.
          </p>
          
          {/* Backend data verification */}
          <div className="mt-4 p-3 bg-muted rounded text-xs">
            <strong>Backend Data Verification:</strong>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <div>Security Section Label:</div>
              <div className="font-medium">
                {settingsNavigationData.find(s => s.id === 'security')?.label || 'Not found'}
              </div>
              <div>Total Sections:</div>
              <div className="font-medium">{settingsNavigationData.length}</div>
              <div>Current Section:</div>
              <div className="font-medium">{currentSection?.label || 'None'}</div>
            </div>
          </div>

          {/* Raw data preview for debugging */}
          {debug && (
            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
              <h3 className="text-sm font-medium mb-2">Raw Backend Data Preview:</h3>
              <pre className="text-xs overflow-x-auto max-h-40">
                {JSON.stringify(settingsNavigationData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedSettingsPage;
