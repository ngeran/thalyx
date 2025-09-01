/**
 * SiteOrchestrator.jsx - COMPLETE REVISED VERSION
 * 
 * @description
 * Central navigation orchestrator that manages the entire application structure.
 * Uses EXCLUSIVELY backend API data for navigation - no hardcoded fallbacks.
 * 
 * Key Features:
 * - Single source of truth: All navigation data comes from backend APIs
 * - Seamless context switching between main content and settings
 * - Real-time WebSocket integration for live updates
 * - Comprehensive state management with React Router synchronization
 * - Theme-aware styling throughout
 * 
 * @backend_endpoints
 * - GET /api/navigation - Main navigation structure
 * - GET /api/navigation/settings - Settings navigation structure
 * 
 * @dependencies
 * - React (useState, useEffect, useMemo, useCallback hooks)
 * - React Router (Routes, Route, useNavigate, useLocation)
 * - Lucide React icons
 * - useApiData custom hook
 * - useWebSocketContext hook
 * - useTheme hook
 * - navigationProcessor utilities
 */

// =============================================================================
// IMPORTS AND DEPENDENCIES
// =============================================================================
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { 
  Home, 
  Loader2, 
  AlertTriangle, 
  RefreshCw,
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
  BarChart,
  X
} from "lucide-react";

// Components
import GlobalSiteNavigation from "./components/navigation/GlobalSiteNavigation.jsx";
import EnhancedSidebar from "./components/layout/EnhancedSidebar.jsx";

// Hooks and contexts
import { useApiData } from "./hooks/useApiData";
import { useWebSocketContext } from "./contexts/WebSocketContext";
import { ThemeProvider, useTheme } from './hooks/useTheme';
import { processNavigationData, flattenNavigationForTopNav, getSidebarItems } from "./utils/navigationProcessor";

// Pages
import SettingsPage from "./pages/SettingsPage";
import DashboardPage from "./pages/DashboardPage";
import InventoryPage from "./pages/InventoryPage";
import ReportsPage from "./pages/ReportsPage";

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const SiteOrchestrator = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // =============================================================================
  // STATE MANAGEMENT
  // =============================================================================
  
  // Main navigation state
  const [activePageId, setActivePageId] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Settings navigation state
  const [settingsActivePageId, setSettingsActivePageId] = useState("profile");
  const [isInSettingsContext, setIsInSettingsContext] = useState(false);

  // User state
  const [currentUser] = useState({
    name: 'Nikos',
    email: 'nikos@example.com',
    role: 'Administrator',
    avatar: null
  });

  // =============================================================================
  // API DATA FETCHING - BACKEND ONLY (NO FALLBACKS)
  // =============================================================================
  
  // Main navigation data from backend
  const { 
    data: mainNavigationData, 
    loading: mainLoading, 
    error: mainError, 
    refresh: refreshMainNavigation 
  } = useApiData(
    'main-navigation',
    () => fetch('/api/navigation').then(res => res.json()),
    { debug: true }
  );

  // Settings navigation data from backend
  const { 
    data: settingsNavigationData, 
    loading: settingsLoading, 
    error: settingsError,
    refresh: refreshSettingsNavigation
  } = useApiData(
    'settings-navigation',
    () => fetch('/api/navigation/settings').then(res => res.json()),
    { debug: true }
  );

  // WebSocket context for real-time updates
  const { 
    isConnected: wsConnected = false, 
    lastUpdate = null, 
    notifications = [], 
    connectionStats = null 
  } = useWebSocketContext() || {};

  // =============================================================================
  // COMPUTED VALUES
  // =============================================================================
  
  // Combined loading and error states
  const loading = mainLoading || settingsLoading;
  const error = mainError || settingsError;

  // Process navigation data for consumption
  const processedNavigation = useMemo(() => 
    processNavigationData(mainNavigationData), 
    [mainNavigationData]
  );

  const topNavItems = useMemo(() => 
    flattenNavigationForTopNav(processedNavigation), 
    [processedNavigation]
  );

  // =============================================================================
  // EFFECTS FOR ROUTE SYNCHRONIZATION
  // =============================================================================
  
  /**
   * Sync active page with current browser route
   * Handles both main navigation and settings routes
   */
  useEffect(() => {
    const path = location.pathname;
    
    if (path === '/settings' || path.startsWith('/settings/')) {
      // We're in settings context
      setIsInSettingsContext(true);
      
      // Extract settings page from URL path
      const pathSegments = path.split('/').filter(Boolean);
      const settingsPage = pathSegments.length > 1 ? pathSegments[1] : 'profile';
      setSettingsActivePageId(settingsPage);
    } else {
      // We're in main navigation context
      setIsInSettingsContext(false);
      
      // Extract main page from URL path
      const page = path.replace('/', '') || 'dashboard';
      setActivePageId(page);
    }
  }, [location.pathname]);

  /**
   * Responsive sidebar handling
   * Auto-collapse on mobile, expand on desktop
   */
  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth >= 1024);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // =============================================================================
  // NAVIGATION HANDLERS
  // =============================================================================
  
  /**
   * Handle main page navigation
   * @param {string} pageId - The page ID to navigate to
   */
  const handleMainPageChange = useCallback((pageId) => {
    if (pageId === 'settings') {
      // Enter settings context
      navigate('/settings');
      setIsInSettingsContext(true);
      setSettingsActivePageId('profile');
    } else {
      // Regular page navigation
      navigate(`/${pageId}`);
      setIsInSettingsContext(false);
      setActivePageId(pageId);
    }
  }, [navigate]);

  /**
   * Handle settings page navigation
   * @param {string} settingsPageId - The settings page ID to navigate to
   */
  const handleSettingsPageChange = useCallback((settingsPageId) => {
    setSettingsActivePageId(settingsPageId);
    navigate(`/settings/${settingsPageId}`);
  }, [navigate]);

  /**
   * Exit settings context and return to main navigation
   */
  const handleExitSettings = useCallback(() => {
    navigate('/dashboard');
    setIsInSettingsContext(false);
    setActivePageId('dashboard');
  }, [navigate]);

  /**
   * Toggle sidebar open/closed state
   */
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // =============================================================================
  // MEMOIZED NAVIGATION DATA FOR SIDEBAR
  // =============================================================================
  
  /**
   * Determine which navigation data to show in sidebar based on context
   * Uses backend data exclusively - no fallbacks
   */
  const sidebarItems = useMemo(() => {
    if (isInSettingsContext) {
      // Show settings navigation from backend
      return settingsNavigationData?.navigation || settingsNavigationData || [];
    } else {
      // Show main navigation from backend
      if (!mainNavigationData) return [];
      
      const processedNav = processNavigationData(mainNavigationData);
      return getSidebarItems(processedNav, activePageId);
    }
  }, [
    isInSettingsContext, 
    settingsNavigationData, 
    mainNavigationData, 
    activePageId
  ]);

  // =============================================================================
  // SIDEBAR PROPS CONFIGURATION
  // =============================================================================
  
  const sidebarProps = useMemo(() => {
    return {
      // Navigation data
      items: sidebarItems,
      pageTitle: isInSettingsContext ? "Settings" : "Thalyx",
      
      // State management
      isOpen: sidebarOpen,
      onToggle: toggleSidebar,
      activePageId: isInSettingsContext ? settingsActivePageId : activePageId,
      
      // Navigation handlers
      onItemSelect: isInSettingsContext ? handleSettingsPageChange : handleMainPageChange,
      navigationContext: isInSettingsContext ? 'settings' : 'main',
      onSettingsItemSelect: handleSettingsPageChange,
      
      // Real-time status
      wsConnected,
      lastUpdate,
      theme,
      connectionStats
    };
  }, [
    sidebarItems,
    isInSettingsContext,
    settingsActivePageId,
    activePageId,
    sidebarOpen,
    toggleSidebar,
    handleMainPageChange,
    handleSettingsPageChange,
    wsConnected,
    lastUpdate,
    theme,
    connectionStats
  ]);

  // =============================================================================
  // RENDER MAIN CONTENT ROUTES
  // =============================================================================
  return (
    <div className={`flex flex-col h-screen bg-background text-foreground ${theme}`}>
      {/* Global Navigation Header */}
      <GlobalSiteNavigation
        user={currentUser}
        currentPage={activePageId}
        onPageChange={handleMainPageChange}
        navigationData={topNavItems}
        showSettingsExit={isInSettingsContext}
        onExitSettings={handleExitSettings}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Enhanced Sidebar with Dynamic Navigation */}
        <EnhancedSidebar {...sidebarProps} />

        <main className="flex-1 overflow-auto p-6 mt-4">
          {/* Loading and Error States */}
          {loading && (
            <div className="text-center py-12">
              <Loader2 className="animate-spin h-12 w-12 mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading navigation data from backend...</p>
            </div>
          )}
          
          {error && (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <p className="text-destructive mb-4">Navigation Error: {error.message}</p>
              <button 
                onClick={() => {
                  refreshMainNavigation();
                  refreshSettingsNavigation();
                }} 
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                <RefreshCw className="inline h-4 w-4 mr-2" /> Retry Connection
              </button>
            </div>
          )}
          
          {/* Application Routes */}
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            
            {/* Settings Routes */}
            <Route 
              path="/settings" 
              element={
                <SettingsPage 
                  activeSettingsPage={settingsActivePageId}
                  onSettingsPageChange={handleSettingsPageChange}
                  onExitSettings={handleExitSettings}
                />
              } 
            />
            <Route 
              path="/settings/:pageId" 
              element={
                <SettingsPage 
                  activeSettingsPage={settingsActivePageId}
                  onSettingsPageChange={handleSettingsPageChange}
                  onExitSettings={handleExitSettings}
                />
              } 
            />
          </Routes>
        </main>
      </div>

      {/* Real-time Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-20 right-4 z-30 space-y-2 max-w-sm">
          {notifications.slice(-3).map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg shadow-lg border ${
                notification.level === 'error' ? 'bg-destructive/10 border-destructive/20 text-destructive' :
                notification.level === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                notification.level === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// WRAP WITH THEME PROVIDER
// =============================================================================
const SiteOrchestratorWithProvider = () => (
  <ThemeProvider>
    <SiteOrchestrator />
  </ThemeProvider>
);

export default SiteOrchestratorWithProvider;
