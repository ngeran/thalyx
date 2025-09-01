/**
 * useDynamicNavigation Hook - PRODUCTION READY VERSION WITH DEBUGGING
 * 
 * ## Version: 3.1.0
 * ## Description: Hook for dynamic navigation with backend integration and comprehensive debugging
 * ## Key Features:
 * - Fetches navigation data exclusively from backend API
 * - Real-time navigation state management
 * - Detailed debug logging and state inspection
 * - Performance monitoring
 * - No fallback data - requires backend connection
 * 
 * ## Dependencies:
 * - React (useState, useEffect, useMemo, useCallback)
 * - useApiData hook
 * 
 * ## Usage:
 * const navigation = useDynamicNavigation('dashboard', {
 *   updateUrl: true,
 *   syncWithUrl: true,
 *   debug: true // Enable navigation debugging
 * });
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useApiData } from './useApiData';

/**
 * Main navigation hook for managing dynamic navigation state with debugging
 * 
 * @param {string} initialPage - Initial active page ID
 * @param {Object} options - Configuration options
 * @param {boolean} options.updateUrl - Whether to update browser URL on navigation
 * @param {boolean} options.syncWithUrl - Whether to sync state with browser URL
 * @param {boolean} options.debug - Enable detailed debug logging
 * 
 * @returns {Object} Navigation state and actions with debug information
 */
export const useDynamicNavigation = (initialPage = 'dashboard', options = {}) => {
  const { debug = false, ...navOptions } = options;
  
  /**
   * Log debug information with consistent formatting
   */
  const logDebug = useCallback((message, data = null) => {
    if (debug) {
      console.log(`🔵 [useDynamicNavigation] ${message}`, data || '');
    }
  }, [debug]);

  // ===========================================================================
  // API DATA FETCHING - NO FALLBACK DATA
  // ===========================================================================
  
  const { 
    data: mainNavigationData, 
    loading: mainLoading, 
    error: mainError,
    refresh: refreshMainNavigation,
    debugInfo: mainDebugInfo
  } = useApiData(
    'main-navigation',
    () => {
      logDebug('Fetching main navigation');
      return fetch('/api/navigation').then(res => res.json());
    },
    { debug }
  );

  const { 
    data: settingsNavigationData, 
    loading: settingsLoading, 
    error: settingsError,
    refresh: refreshSettingsNavigation,
    debugInfo: settingsDebugInfo
  } = useApiData(
    'settings-navigation',
    () => {
      logDebug('Fetching settings navigation');
      return fetch('/api/navigation/settings').then(res => res.json());
    },
    { debug }
  );

  // ===========================================================================
  // STATE MANAGEMENT
  // ===========================================================================
  
  const [activePageId, setActivePageId] = useState(initialPage);
  const [settingsActivePageId, setSettingsActivePageId] = useState('profile');
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Log state changes for debugging
  useEffect(() => {
    logDebug('Active page changed', { activePageId, settingsActivePageId });
  }, [activePageId, settingsActivePageId, logDebug]);

  useEffect(() => {
    logDebug('Expanded sections changed', Array.from(expandedSections));
  }, [expandedSections, logDebug]);

  // ===========================================================================
  // COMPUTED VALUES WITH DEBUGGING
  // ===========================================================================
  
  const navigationContext = useMemo(() => {
    const context = activePageId === 'settings' ? 'settings' : 'main';
    logDebug('Navigation context determined', context);
    return context;
  }, [activePageId, logDebug]);

  const currentNavigationData = useMemo(() => {
    const data = navigationContext === 'settings' ? settingsNavigationData : mainNavigationData;
    logDebug('Current navigation data resolved', { 
      context: navigationContext,
      hasData: !!data,
      dataType: data ? (Array.isArray(data) ? 'array' : 'object') : 'null',
      dataLength: data ? (Array.isArray(data) ? data.length : Object.keys(data).length) : 0
    });
    return data;
  }, [navigationContext, mainNavigationData, settingsNavigationData, logDebug]);

  const currentActiveId = useMemo(() => {
    const activeId = navigationContext === 'settings' ? settingsActivePageId : activePageId;
    logDebug('Current active ID resolved', activeId);
    return activeId;
  }, [navigationContext, activePageId, settingsActivePageId, logDebug]);

  const breadcrumbs = useMemo(() => {
    let crumbs = [];
    
    if (navigationContext === 'settings' && settingsNavigationData) {
      const currentSection = settingsNavigationData.find(section =>
        section.children?.some(child => child.id === settingsActivePageId)
      );
      const currentPage = currentSection?.children?.find(child => child.id === settingsActivePageId);
      
      crumbs = [
        { label: 'Settings', href: '/settings' },
        ...(currentSection ? [{ label: currentSection.label, href: `#${currentSection.id}` }] : []),
        ...(currentPage ? [{ label: currentPage.label, href: `/settings/${currentPage.id}` }] : [])
      ];
    } else if (mainNavigationData) {
      const currentPage = mainNavigationData.find(page => page.id === activePageId);
      crumbs = currentPage ? [{ label: currentPage.label, href: currentPage.href }] : [];
    }
    
    logDebug('Breadcrumbs generated', crumbs);
    return crumbs;
  }, [navigationContext, activePageId, settingsActivePageId, mainNavigationData, settingsNavigationData, logDebug]);

  // ===========================================================================
  // ACTION HANDLERS WITH DEBUGGING
  // ===========================================================================
  
  const handlePageChange = useCallback((pageId) => {
    logDebug('Page change requested', { from: activePageId, to: pageId });
    setActivePageId(pageId);
    
    if (pageId !== 'settings') {
      setSettingsActivePageId('profile');
      setExpandedSections(new Set());
    }
    
    setSearchQuery('');
    
    if (navOptions.updateUrl && window.history) {
      const url = pageId === 'dashboard' ? '/' : `/${pageId}`;
      logDebug('Updating URL', url);
      window.history.pushState(null, '', url);
    }
  }, [activePageId, navOptions.updateUrl, logDebug]);

  const handleSettingsPageChange = useCallback((settingsPageId) => {
    logDebug('Settings page change requested', { from: settingsActivePageId, to: settingsPageId });
    setSettingsActivePageId(settingsPageId);
    
    if (settingsNavigationData) {
      const section = settingsNavigationData.find(section => 
        section.children?.some(child => child.id === settingsPageId)
      );
      
      if (section) {
        logDebug('Expanding section', section.id);
        setExpandedSections(prev => new Set([...prev, section.id]));
      }
    }
    
    if (navOptions.updateUrl && window.history) {
      const url = `/settings/${settingsPageId}`;
      logDebug('Updating settings URL', url);
      window.history.pushState(null, '', url);
    }
  }, [navOptions.updateUrl, settingsNavigationData, settingsActivePageId, logDebug]);

  const toggleSection = useCallback((sectionId) => {
    logDebug('Toggling section', sectionId);
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
        logDebug('Section collapsed', sectionId);
      } else {
        newSet.add(sectionId);
        logDebug('Section expanded', sectionId);
      }
      return newSet;
    });
  }, [logDebug]);

  const updateSearchQuery = useCallback((query) => {
    logDebug('Search query updated', query);
    setSearchQuery(query);
    
    if (query && navigationContext === 'settings' && settingsNavigationData) {
      logDebug('Expanding all sections for search');
      setExpandedSections(new Set(settingsNavigationData.map(section => section.id)));
    }
  }, [navigationContext, settingsNavigationData, logDebug]);

  // ===========================================================================
  // SIDEBAR PROPS CALCULATOR
  // ===========================================================================
  
  const getSidebarProps = useCallback(() => {
    const props = {
      items: currentNavigationData || [],
      navigationContext,
      activePageId: currentActiveId,
      onItemSelect: navigationContext === 'settings' ? handleSettingsPageChange : handlePageChange,
      expandedSections,
      onToggleSection: toggleSection,
      searchQuery,
      onSearchChange: updateSearchQuery,
      loading: mainLoading || settingsLoading,
      error: mainError || settingsError
    };
    
    logDebug('Sidebar props generated', props);
    return props;
  }, [
    currentNavigationData,
    navigationContext,
    currentActiveId,
    handlePageChange,
    handleSettingsPageChange,
    expandedSections,
    toggleSection,
    searchQuery,
    updateSearchQuery,
    mainLoading,
    settingsLoading,
    mainError,
    settingsError,
    logDebug
  ]);

  // ===========================================================================
  // URL SYNCHRONIZATION WITH DEBUGGING
  // ===========================================================================
  
  useEffect(() => {
    if (navOptions.syncWithUrl && mainNavigationData && settingsNavigationData) {
      const path = window.location.pathname;
      const segments = path.split('/').filter(Boolean);
      
      logDebug('URL synchronization triggered', { path, segments });
      
      if (segments.length === 0 || segments[0] === 'dashboard') {
        logDebug('Setting active page to dashboard');
        setActivePageId('dashboard');
      } else if (segments[0] === 'settings') {
        logDebug('Entering settings context');
        setActivePageId('settings');
        if (segments[1]) {
          const pageExists = settingsNavigationData.some(section =>
            section.children?.some(child => child.id === segments[1])
          );
          if (pageExists) {
            logDebug('Setting settings page', segments[1]);
            setSettingsActivePageId(segments[1]);
          }
        }
      } else {
        const pageExists = mainNavigationData.some(page => page.id === segments[0]);
        if (pageExists) {
          logDebug('Setting main page', segments[0]);
          setActivePageId(segments[0]);
        }
      }
    }
  }, [navOptions.syncWithUrl, mainNavigationData, settingsNavigationData, logDebug]);

  // ===========================================================================
  // DEBUG INFORMATION
  // ===========================================================================
  
  const debugInfo = useMemo(() => ({
    // API states
    mainNavigation: {
      loading: mainLoading,
      error: mainError,
      data: mainNavigationData ? {
        type: Array.isArray(mainNavigationData) ? 'array' : 'object',
        count: Array.isArray(mainNavigationData) ? mainNavigationData.length : Object.keys(mainNavigationData || {}).length,
        sample: mainNavigationData ? mainNavigationData[0] : null
      } : null,
      debug: mainDebugInfo
    },
    settingsNavigation: {
      loading: settingsLoading,
      error: settingsError,
      data: settingsNavigationData ? {
        type: Array.isArray(settingsNavigationData) ? 'array' : 'object',
        count: Array.isArray(settingsNavigationData) ? settingsNavigationData.length : Object.keys(settingsNavigationData || {}).length,
        sample: settingsNavigationData ? settingsNavigationData[0] : null
      } : null,
      debug: settingsDebugInfo
    },
    
    // Navigation state
    navigationState: {
      activePageId,
      settingsActivePageId,
      navigationContext,
      expandedSections: Array.from(expandedSections),
      searchQuery,
      breadcrumbs
    },
    
    // Performance
    timestamp: Date.now(),
    options: navOptions
  }), [
    mainLoading, mainError, mainNavigationData, mainDebugInfo,
    settingsLoading, settingsError, settingsNavigationData, settingsDebugInfo,
    activePageId, settingsActivePageId, navigationContext, expandedSections, searchQuery, breadcrumbs,
    navOptions
  ]);

  // ===========================================================================
  // RETURN VALUES
  // ===========================================================================
  
  return {
    // Current state
    activePageId,
    settingsActivePageId,
    navigationContext,
    expandedSections,
    searchQuery,
    breadcrumbs,
    
    // Navigation data (direct from backend)
    mainNavigationData,
    settingsNavigationData,
    currentNavigationData,
    currentActiveId,
    
    // Loading states
    loading: mainLoading || settingsLoading,
    mainLoading,
    settingsLoading,
    mainError,
    settingsError,
    
    // Refresh functions
    refreshMainNavigation,
    refreshSettingsNavigation,
    
    // Actions
    handlePageChange,
    handleSettingsPageChange,
    toggleSection,
    updateSearchQuery,
    clearSearch: () => {
      logDebug('Clearing search');
      setSearchQuery('');
    },
    
    // Sidebar integration
    getSidebarProps,
    
    // Utilities
    isSettingsContext: navigationContext === 'settings',
    isMainContext: navigationContext === 'main',
    
    // Debug information
    debugInfo,
    logDebug: (message, data) => logDebug(message, data)
  };
};

export default useDynamicNavigation;
