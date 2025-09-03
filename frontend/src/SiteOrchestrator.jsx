/**
 * SiteOrchestrator.jsx
 * =============================================================================
 * @description
 * Central navigation orchestrator for the Thalyx platform. This component
 * coordinates global navigation, sidebar rendering, routing, theme integration,
 * and real-time updates. It is the **single source of truth** for navigation
 * state, syncing backend API-driven structures with frontend UI.
 * 
 * -----------------------------------------------------------------------------
 * Key Features:
 * - 🔗 Backend-driven navigation (no hardcoded fallbacks)
 * - 📑 Context-aware sidebar (main, settings, reports)
 * - 🔄 Real-time WebSocket updates and status indicators
 * - 🎨 Theme-aware styling via `useTheme` hook
 * - 📡 Robust error handling and retry mechanisms
 * - 📱 Responsive sidebar (collapses on small screens, expands on desktop)
 * - ⚡ Efficient state synchronization with React Router
 * 
 * -----------------------------------------------------------------------------
 * Dependencies:
 * - React (useState, useEffect, useMemo, useCallback)
 * - React Router (Routes, Route, useNavigate, useLocation)
 * - Custom Hooks: `useApiData`, `useWebSocketContext`, `useTheme`
 * - Utilities: `processNavigationData`, `flattenNavigationForTopNav`, `getSidebarItems`
 * - Components: `GlobalSiteNavigation`, `EnhancedSidebar`, `SettingsPage`, 
 *               `DashboardPage`, `InventoryPage`, `ReportsPage`
 * 
 * -----------------------------------------------------------------------------
 * How to Use:
 * 
 * 1. Import into your app root:
 *    ```jsx
 *    import SiteOrchestrator from './SiteOrchestrator';
 *    
 *    function App() {
 *      return <SiteOrchestrator />;
 *    }
 *    ```
 * 
 * 2. Backend API must provide:
 *    - GET /api/navigation
 *    - GET /api/navigation/settings
 *    - GET /api/reports (for ReportsPage integration)
 * 
 * 3. ReportsPage integration:
 *    - ReportsPage emits navigation structure → SiteOrchestrator stores it
 *    - Sidebar switches to reports navigation when `/reports` is active
 * 
 * -----------------------------------------------------------------------------
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import {
  Loader2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

// =============================================================================
// COMPONENT IMPORTS
// =============================================================================
import GlobalSiteNavigation from "./components/navigation/GlobalSiteNavigation.jsx";
import EnhancedSidebar from "./components/layout/EnhancedSidebar.jsx";

// Pages
import SettingsPage from "./pages/SettingsPage";
import DashboardPage from "./pages/DashboardPage";
import InventoryPage from "./pages/InventoryPage";
import ReportsPage from "./pages/ReportsPage";

// =============================================================================
// HOOKS & CONTEXTS
// =============================================================================
import { useApiData } from "./hooks/useApiData";
import { useWebSocketContext } from "./contexts/WebSocketContext";
import { ThemeProvider, useTheme } from "./hooks/useTheme";

// =============================================================================
// UTILITIES
// =============================================================================
import {
  processNavigationData,
  flattenNavigationForTopNav,
  getSidebarItems,
} from "./utils/navigationProcessor";

// =============================================================================
// MAIN ORCHESTRATOR COMPONENT
// =============================================================================
const SiteOrchestrator = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------
  const [activePageId, setActivePageId] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Settings state
  const [settingsActivePageId, setSettingsActivePageId] = useState("profile");
  const [isInSettingsContext, setIsInSettingsContext] = useState(false);

  // Reports state
  const [reportsNavigation, setReportsNavigation] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [isReportsNavigationLoading, setIsReportsNavigationLoading] = useState(false);

  // User info
  const [currentUser] = useState({
    name: "Nikos",
    email: "nikos@example.com",
    role: "Administrator",
    avatar: null,
  });

  // ---------------------------------------------------------------------------
  // API DATA FETCHING
  // ---------------------------------------------------------------------------
  const {
    data: mainNavigationData,
    loading: mainLoading,
    error: mainError,
    refresh: refreshMainNavigation,
  } = useApiData(
    "main-navigation",
    () => fetch("/api/navigation").then((res) => res.json()),
    { debug: true }
  );

  const {
    data: settingsNavigationData,
    loading: settingsLoading,
    error: settingsError,
    refresh: refreshSettingsNavigation,
  } = useApiData(
    "settings-navigation",
    () => fetch("/api/navigation/settings").then((res) => res.json()),
    { debug: true }
  );

  const {
    isConnected: wsConnected = false,
    lastUpdate = null,
    notifications = [],
    connectionStats = null,
  } = useWebSocketContext() || {};

  // ---------------------------------------------------------------------------
  // COMPUTED STATES
  // ---------------------------------------------------------------------------
  const loading = mainLoading || settingsLoading;
  const error = mainError || settingsError;

  const processedNavigation = useMemo(
    () => processNavigationData(mainNavigationData),
    [mainNavigationData]
  );

  const topNavItems = useMemo(
    () => flattenNavigationForTopNav(processedNavigation),
    [processedNavigation]
  );

  // ---------------------------------------------------------------------------
  // EFFECTS: ROUTE SYNCHRONIZATION
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const path = location.pathname;

    if (path === "/settings" || path.startsWith("/settings/")) {
      setIsInSettingsContext(true);
      const pathSegments = path.split("/").filter(Boolean);
      const settingsPage =
        pathSegments.length > 1 ? pathSegments[1] : "profile";
      setSettingsActivePageId(settingsPage);
    } else {
      setIsInSettingsContext(false);
      const page = path.replace("/", "") || "dashboard";
      setActivePageId(page);
    }
  }, [location.pathname]);

  // Effect to clear selectedReportId when leaving the reports page
  useEffect(() => {
    if (activePageId !== "reports") {
      setSelectedReportId(null);
      setIsReportsNavigationLoading(false);
    }
  }, [activePageId]);

  useEffect(() => {
    const handleResize = () => setSidebarOpen(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ---------------------------------------------------------------------------
  // NAVIGATION HANDLERS
  // ---------------------------------------------------------------------------
  const handleMainPageChange = useCallback(
    (pageId) => {
      if (pageId === "settings") {
        navigate("/settings");
        setIsInSettingsContext(true);
        setSettingsActivePageId("profile");
      } else {
        navigate(`/${pageId}`);
        setIsInSettingsContext(false);
        setActivePageId(pageId);
      }
    },
    [navigate]
  );

  const handleSettingsPageChange = useCallback(
    (settingsPageId) => {
      setSettingsActivePageId(settingsPageId);
      navigate(`/settings/${settingsPageId}`);
    },
    [navigate]
  );

  const handleExitSettings = useCallback(() => {
    navigate("/dashboard");
    setIsInSettingsContext(false);
    setActivePageId("dashboard");
  }, [navigate]);

  const toggleSidebar = useCallback(
    () => setSidebarOpen((prev) => !prev),
    []
  );

  // ---------------------------------------------------------------------------
  // REPORTS NAVIGATION HANDLERS
  // ---------------------------------------------------------------------------
  const handleReportsNavigationUpdate = useCallback((navigationData) => {
    setReportsNavigation(navigationData);
    setIsReportsNavigationLoading(false);
  }, []);

  const handleReportsNavigationLoading = useCallback(() => {
    setIsReportsNavigationLoading(true);
  }, []);

  // ---------------------------------------------------------------------------
  // SIDEBAR ITEMS LOGIC
  // ---------------------------------------------------------------------------
  const sidebarItems = useMemo(() => {
    if (isInSettingsContext) {
      return settingsNavigationData?.navigation || settingsNavigationData || [];
    }

    // Reports context - show reports navigation when available
    if (activePageId === "reports") {
      if (isReportsNavigationLoading) {
        // Show loading state or empty array while reports navigation loads
        return [];
      }
      return reportsNavigation && reportsNavigation.length > 0 
        ? reportsNavigation 
        : [];
    }
    
    // Main navigation context
    if (!mainNavigationData) return [];
    const processedNav = processNavigationData(mainNavigationData);
    return getSidebarItems(processedNav, activePageId);
  }, [
    isInSettingsContext,
    settingsNavigationData,
    mainNavigationData,
    activePageId,
    reportsNavigation,
    isReportsNavigationLoading
  ]);

  const sidebarProps = useMemo(
    () => ({
      items: sidebarItems,
      pageTitle: isInSettingsContext ? "Settings" : "Thalyx",
      isOpen: sidebarOpen,
      onToggle: toggleSidebar,
      activePageId: isInSettingsContext 
        ? settingsActivePageId 
        : (activePageId === 'reports' ? selectedReportId : activePageId),
      onItemSelect: isInSettingsContext
        ? handleSettingsPageChange
        : handleMainPageChange,
      navigationContext: isInSettingsContext ? "settings" : "main",
      onSettingsItemSelect: handleSettingsPageChange,
      wsConnected,
      lastUpdate,
      theme,
      connectionStats,
    }),
    [
      sidebarItems,
      isInSettingsContext,
      settingsActivePageId,
      activePageId,
      selectedReportId,
      sidebarOpen,
      toggleSidebar,
      handleMainPageChange,
      handleSettingsPageChange,
      wsConnected,
      lastUpdate,
      theme,
      connectionStats,
    ]
  );

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div
      className={`flex flex-col h-screen bg-background text-foreground ${theme}`}
    >
      {/* Global Top Navigation */}
      <GlobalSiteNavigation
        user={currentUser}
        currentPage={activePageId}
        onPageChange={handleMainPageChange}
        navigationData={topNavItems}
        showSettingsExit={isInSettingsContext}
        onExitSettings={handleExitSettings}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <EnhancedSidebar {...sidebarProps} />

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6 mt-4">
          {loading && (
            <div className="text-center py-12">
              <Loader2 className="animate-spin h-12 w-12 mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">
                Loading navigation data from backend...
              </p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <p className="text-destructive mb-4">
                Navigation Error: {error.message}
              </p>
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

          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route
              path="/reports"
              element={
                <ReportsPage
                  activeReport={selectedReportId}
                  onReportChange={setSelectedReportId}
                  onNavigationUpdate={handleReportsNavigationUpdate}
                  onNavigationLoading={handleReportsNavigationLoading}
                  debug={true}
                />
              }
            />
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
                notification.level === "error"
                  ? "bg-destructive/10 border-destructive/20 text-destructive"
                  : notification.level === "success"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : notification.level === "warning"
                  ? "bg-yellow-50 border-yellow-200 text-yellow-800"
                  : "bg-blue-50 border-blue-200 text-blue-800"
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
// EXPORT WITH THEME PROVIDER
// =============================================================================
const SiteOrchestratorWithProvider = () => (
  <ThemeProvider>
    <SiteOrchestrator />
  </ThemeProvider>
);

export default SiteOrchestratorWithProvider;
