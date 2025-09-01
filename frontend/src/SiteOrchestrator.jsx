/**
 * SiteOrchestrator.jsx - COMPLETE REVISED VERSION
 * 
 * @description
 * Advanced site orchestrator that manages navigation between main content and settings.
 * Properly connects EnhancedSidebar and SettingsPage components with shared state management.
 * 
 * Key Enhancements:
 * - Fixed settings navigation state management
 * - Proper connection between sidebar and settings page
 * - Context-aware navigation with seamless transitions
 * - Maintains all existing WebSocket and theme functionality
 * 
 * @dependencies
 * - React (useState, useEffect, useMemo, useCallback hooks)
 * - React Router (Routes, Route)
 * - Lucide React icons
 * - GlobalSiteNavigation component
 * - EnhancedSidebar component
 * - useNavigation hook
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
import { useNavigation } from "./hooks/useNavigation";
import { useWebSocketContext } from "./contexts/WebSocketContext";
import { ThemeProvider, useTheme } from './hooks/useTheme';
import { processNavigationData, flattenNavigationForTopNav, getSidebarItems } from "./utils/navigationProcessor";

// Pages
import SettingsPage from "./pages/SettingsPage";
import DashboardPage from "./pages/DashboardPage";
import InventoryPage from "./pages/InventoryPage";
import ReportsPage from "./pages/ReportsPage";

// =============================================================================
// SETTINGS NAVIGATION DATA
// =============================================================================
const SETTINGS_NAVIGATION = [
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
  // HOOKS AND CONTEXTS
  // =============================================================================
  
  // Navigation hook
  const { 
    navigationData: httpNavigationData, 
    loading, 
    error, 
    refresh: refreshNavigation, 
    breadcrumbs, 
    currentSection 
  } = useNavigation({
    enableRealTime: true,
    enableBreadcrumbs: true,
    cacheEnabled: true,
    currentPath: window.location.pathname
  });

  // WebSocket context
  const { 
    isConnected: wsConnected = false, 
    lastUpdate = null, 
    notifications = [], 
    connectionStats = null 
  } = useWebSocketContext() || {};

  // =============================================================================
  // EFFECTS FOR ROUTE SYNCHRONIZATION
  // =============================================================================
  
  // Sync active page with current route
  useEffect(() => {
    const path = location.pathname;
    if (path === '/settings' || path.startsWith('/settings/')) {
      setIsInSettingsContext(true);
      // Extract settings page from path if available
      const settingsPage = path.split('/')[2] || 'profile';
      setSettingsActivePageId(settingsPage);
    } else {
      setIsInSettingsContext(false);
      // Set main page based on route
      const page = path.replace('/', '') || 'dashboard';
      setActivePageId(page);
    }
  }, [location.pathname]);

  // Responsive sidebar handling
  useEffect(() => {
    const handleResize = () => setSidebarOpen(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // =============================================================================
  // NAVIGATION HANDLERS
  // =============================================================================
  
  // Handle main page navigation
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

  // Handle settings page navigation
  const handleSettingsPageChange = useCallback((settingsPageId) => {
    setSettingsActivePageId(settingsPageId);
    navigate(`/settings/${settingsPageId}`);
  }, [navigate]);

  // Exit settings context
  const handleExitSettings = useCallback(() => {
    navigate('/dashboard');
    setIsInSettingsContext(false);
    setActivePageId('dashboard');
  }, [navigate]);

  const toggleSidebar = useCallback(() => setSidebarOpen(!sidebarOpen), [sidebarOpen]);

  // =============================================================================
  // MEMOIZED NAVIGATION DATA
  // =============================================================================
  
  // Determine which navigation to show in sidebar
  const sidebarItems = useMemo(() => {
    if (isInSettingsContext) {
      // Show settings navigation when in settings context
      return SETTINGS_NAVIGATION;
    } else {
      // Show main navigation for other pages
      const navigationData = wsConnected && httpNavigationData ? httpNavigationData : httpNavigationData;
      if (!navigationData) {
        // Fallback main navigation
        return [
          { id: 'dashboard', label: 'Dashboard', icon: Home, type: 'page' },
          { id: 'inventory', label: 'Inventory', icon: Database, type: 'page' },
          { id: 'reports', label: 'Reports', icon: BarChart, type: 'page' },
          { id: 'settings', label: 'Settings', icon: Settings, type: 'page' }
        ];
      }
      const processedNavigation = processNavigationData(navigationData);
      return getSidebarItems(processedNavigation, activePageId);
    }
  }, [isInSettingsContext, activePageId, wsConnected, httpNavigationData]);

  // Memoized navigation data for top nav
  const navigationData = useMemo(() => (wsConnected && httpNavigationData ? httpNavigationData : httpNavigationData), [wsConnected, httpNavigationData]);
  const processedNavigation = useMemo(() => processNavigationData(navigationData), [navigationData]);
  const topNavItems = useMemo(() => flattenNavigationForTopNav(processedNavigation), [processedNavigation]);

  // =============================================================================
  // SIDEBAR PROPS CONFIGURATION
  // =============================================================================
  
  const sidebarProps = useMemo(() => {
    return {
      items: sidebarItems,
      pageTitle: isInSettingsContext ? "Settings" : "Thalyx",
      isOpen: sidebarOpen,
      onToggle: toggleSidebar,
      activePageId: isInSettingsContext ? settingsActivePageId : activePageId,
      onItemSelect: isInSettingsContext ? handleSettingsPageChange : handleMainPageChange,
      wsConnected,
      lastUpdate,
      theme,
      connectionStats,
      // Dynamic navigation props
      navigationContext: isInSettingsContext ? 'settings' : 'main',
      onSettingsItemSelect: handleSettingsPageChange
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
      {/* Navigation */}
      <GlobalSiteNavigation
        user={currentUser}
        currentPage={activePageId}
        onPageChange={handleMainPageChange}
        navigationData={topNavItems}
        showSettingsExit={isInSettingsContext}
        onExitSettings={handleExitSettings}
      />

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Enhanced Sidebar with Dynamic Navigation */}
        <EnhancedSidebar {...sidebarProps} />

        <main className="flex-1 overflow-auto p-6 mt-4">
          {/* Loading and Error States */}
          {loading && <Loader2 className="animate-spin h-12 w-12 mx-auto" />}
          {error && (
            <div className="text-center text-red-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
              <p>Navigation Error: {error}</p>
              <button 
                onClick={refreshNavigation} 
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
              >
                <RefreshCw className="inline h-4 w-4 mr-2" /> Retry
              </button>
            </div>
          )}
          
          {/* Routes */}
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            {/* Settings routes with dynamic content */}
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

      {/* Notifications */}
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
