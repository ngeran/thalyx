/**
 * useDynamicNavigation Hook - FIXED VERSION
 * 
 * Custom hook that manages dynamic navigation contexts for the sidebar.
 * Handles switching between main navigation and settings navigation seamlessly.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Settings,
  User,
  Shield,
  Network,
  Database,
  Palette,
  Bell,
  Monitor,
  Lock,
  Users,
  Activity,
  Globe,
  Home,
  BarChart
} from 'lucide-react';

// ===========================================================================
// NAVIGATION DATA DEFINITIONS
// ===========================================================================

const mainNavigationData = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, type: 'page', href: '/dashboard' },
  { id: 'inventory', label: 'Inventory', icon: Database, type: 'page', href: '/inventory' },
  { id: 'reports', label: 'Reports', icon: BarChart, type: 'page', href: '/reports' },
  { id: 'settings', label: 'Settings', icon: Settings, type: 'page', href: '/settings' }
];

const settingsNavigationData = [
  {
    id: 'general',
    label: 'General',
    icon: Settings,
    type: 'section',
    children: [
      { id: 'profile', label: 'Profile', icon: User, type: 'page' },
      { id: 'preferences', label: 'Preferences', icon: Monitor, type: 'page' },
      { id: 'notifications', label: 'Notifications', icon: Bell, type: 'page' }
    ]
  },
  {
    id: 'security',
    label: 'Security',
    icon: Shield,
    type: 'section',
    children: [
      { id: 'authentication', label: 'Authentication', icon: Lock, type: 'page' },
      { id: 'permissions', label: 'Permissions', icon: Users, type: 'page' }
    ]
  },
  {
    id: 'network',
    label: 'Network',
    icon: Network,
    type: 'section',
    children: [
      { id: 'inventory', label: 'Device Inventory', icon: Database, type: 'page' },
      { id: 'monitoring', label: 'Monitoring', icon: Activity, type: 'page' },
      { id: 'topology', label: 'Network Topology', icon: Globe, type: 'page' }
    ]
  },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: Palette,
    type: 'section',
    children: [
      { id: 'theme', label: 'Theme Settings', icon: Palette, type: 'page' }
    ]
  }
];

// ===========================================================================
// MAIN HOOK
// ===========================================================================

export const useDynamicNavigation = (initialPage = 'dashboard', options = {}) => {
  // ===========================================================================
  // STATE MANAGEMENT
  // ===========================================================================
  
  const [activePageId, setActivePageId] = useState(initialPage);
  const [settingsActivePageId, setSettingsActivePageId] = useState('profile');
  const [expandedSections, setExpandedSections] = useState(new Set(['general']));
  const [searchQuery, setSearchQuery] = useState('');

  // ===========================================================================
  // COMPUTED VALUES
  // ===========================================================================
  
  const navigationContext = useMemo(() => {
    return activePageId === 'settings' ? 'settings' : 'main';
  }, [activePageId]);

  const currentNavigationData = useMemo(() => {
    return navigationContext === 'settings' ? settingsNavigationData : mainNavigationData;
  }, [navigationContext]);

  const currentActiveId = useMemo(() => {
    return navigationContext === 'settings' ? settingsActivePageId : activePageId;
  }, [navigationContext, activePageId, settingsActivePageId]);

  const breadcrumbs = useMemo(() => {
    if (navigationContext === 'settings') {
      const currentSection = settingsNavigationData.find(section =>
        section.children?.some(child => child.id === settingsActivePageId)
      );
      const currentPage = currentSection?.children?.find(child => child.id === settingsActivePageId);
      
      return [
        { label: 'Settings', href: '/settings' },
        ...(currentSection ? [{ label: currentSection.label, href: `#${currentSection.id}` }] : []),
        ...(currentPage ? [{ label: currentPage.label, href: `/settings/${currentPage.id}` }] : [])
      ];
    }
    
    const currentPage = mainNavigationData.find(page => page.id === activePageId);
    return currentPage ? [{ label: currentPage.label, href: currentPage.href }] : [];
  }, [navigationContext, activePageId, settingsActivePageId]);

  // ===========================================================================
  // ACTION HANDLERS
  // ===========================================================================
  
  const handlePageChange = useCallback((pageId) => {
    setActivePageId(pageId);
    
    // Reset settings page when leaving settings
    if (pageId !== 'settings') {
      setSettingsActivePageId('profile');
      setExpandedSections(new Set(['general']));
    }
    
    // Clear search when switching contexts
    setSearchQuery('');
    
    // Update URL if enabled
    if (options.updateUrl && window.history) {
      window.history.pushState(null, '', pageId === 'dashboard' ? '/' : `/${pageId}`);
    }
  }, [options.updateUrl]);

  const handleSettingsPageChange = useCallback((settingsPageId) => {
    setSettingsActivePageId(settingsPageId);
    
    // Auto-expand the section containing this page
    const section = settingsNavigationData.find(section => 
      section.children?.some(child => child.id === settingsPageId)
    );
    
    if (section) {
      setExpandedSections(prev => new Set([...prev, section.id]));
    }
    
    // Update URL for settings pages
    if (options.updateUrl && window.history) {
      window.history.pushState(null, '', `/settings/${settingsPageId}`);
    }
  }, [options.updateUrl]);

  const toggleSection = useCallback((sectionId) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  const updateSearchQuery = useCallback((query) => {
    setSearchQuery(query);
    
    // Auto-expand sections when searching in settings
    if (query && navigationContext === 'settings') {
      setExpandedSections(new Set(settingsNavigationData.map(section => section.id)));
    }
  }, [navigationContext]);

  // ===========================================================================
  // SIDEBAR PROPS CALCULATOR
  // ===========================================================================
  
  const getSidebarProps = useCallback(() => {
    return {
      items: currentNavigationData,
      navigationContext,
      activePageId: currentActiveId,
      onItemSelect: navigationContext === 'settings' ? handleSettingsPageChange : handlePageChange,
      onSettingsItemSelect: handleSettingsPageChange,
      expandedSections,
      onToggleSection: toggleSection,
      searchQuery,
      onSearchChange: updateSearchQuery
    };
  }, [
    currentNavigationData,
    navigationContext,
    currentActiveId,
    handlePageChange,
    handleSettingsPageChange,
    expandedSections,
    toggleSection,
    searchQuery,
    updateSearchQuery
  ]);

  // ===========================================================================
  // URL SYNCHRONIZATION
  // ===========================================================================
  
  useEffect(() => {
    if (options.syncWithUrl) {
      const path = window.location.pathname;
      const segments = path.split('/').filter(Boolean);
      
      if (segments.length === 0 || segments[0] === 'dashboard') {
        setActivePageId('dashboard');
      } else if (segments[0] === 'settings') {
        setActivePageId('settings');
        if (segments[1]) {
          // Check if the settings page exists
          const pageExists = settingsNavigationData.some(section =>
            section.children?.some(child => child.id === segments[1])
          );
          if (pageExists) {
            setSettingsActivePageId(segments[1]);
          }
        }
      } else {
        // Check if it's a valid main page
        const pageExists = mainNavigationData.some(page => page.id === segments[0]);
        if (pageExists) {
          setActivePageId(segments[0]);
        }
      }
    }
  }, [options.syncWithUrl]);

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
    
    // Navigation data
    mainNavigationData,
    settingsNavigationData,
    currentNavigationData,
    currentActiveId,
    
    // Actions
    handlePageChange,
    handleSettingsPageChange,
    toggleSection,
    updateSearchQuery,
    clearSearch: () => setSearchQuery(''),
    
    // Sidebar integration
    getSidebarProps,
    
    // Utilities
    isSettingsContext: navigationContext === 'settings',
    isMainContext: navigationContext === 'main',
    getCurrentPageData: () => {
      if (navigationContext === 'settings') {
        const section = settingsNavigationData.find(s => 
          s.children?.some(c => c.id === settingsActivePageId)
        );
        return section?.children?.find(c => c.id === settingsActivePageId);
      }
      return mainNavigationData.find(p => p.id === activePageId);
    }
  };
};
