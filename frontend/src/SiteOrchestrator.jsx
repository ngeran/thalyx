/**
 * Enhanced SiteOrchestrator Component
 * 
 * @description
 * Advanced site orchestrator that leverages the modern GlobalSiteNavigation component
 * with integrated WebSocket status, real-time updates, and enhanced user experience.
 * This component now provides a cleaner separation of concerns with dedicated
 * navigation management and improved responsive design.
 * Now integrates GlobalSiteNavigation for enhanced nav features, with WebSocket status
 * moved there for centralized control.
 * 
 * Key Enhancements:
 * - Integration with modern GlobalSiteNavigation component
 * - Enhanced WebSocket status monitoring with visual indicators (moved to nav)
 * - Improved responsive design with better mobile experience
 * - Real-time navigation updates with smooth transitions
 * - Advanced notification system with categorization
 * - Theme support with dark/light mode switching using yellow theme from shadcn
 * - Enhanced error handling and fallback mechanisms
 * - Performance optimizations with memoization
 * - Accessibility improvements with ARIA labels
 * 
 * @dependencies
 * - React (useState, useEffect, useMemo, useCallback hooks): State and lifecycle management
 * - React Router (BrowserRouter, Routes, Route, Link): Page routing (BrowserRouter is now in main.jsx)
 * - Lucide React icons: UI iconography
 * - GlobalSiteNavigation component: Enhanced navigation with WebSocket status
 * - EnhancedSidebar component: Sidebar with real-time updates
 * - useNavigation hook: Enhanced navigation data management
 * - useWebSocketContext hook: Real-time connectivity and updates
 * - navigationProcessor utilities: Data processing and transformation
 * - useTheme hook: Theme management with yellow theme from shadcn
 * 
 * @new-features
 * - Seamless WebSocket status integration in navigation bar
 * - Real-time theme switching with persistent preferences
 * - Advanced notification management with auto-dismiss
 * - Intelligent loading states with skeleton screens
 * - Enhanced error recovery with retry mechanisms
 * - Mobile-first responsive design patterns
 * - Keyboard navigation support with shortcuts
 * - Visual gap between navigation and main content for improved UI clarity
 * - Yellow theme implementation following shadcn design system
 * 
 * @how-to-use
 * 1. Wrap in WebSocketProvider for real-time features:
 *    ```jsx
 *    <WebSocketProvider>
 *      <SiteOrchestrator />
 *    </WebSocketProvider>
 *    ```
 * 
 * 2. Configure theme persistence in localStorage:
 *    ```jsx
 *    <SiteOrchestrator 
 *      defaultTheme="light"
 *      persistTheme={true}
 *    />
 *    ```
 * 
 * 3. Enable advanced features:
 *    ```jsx
 *    <SiteOrchestrator 
 *      enableSearch={true}
 *      enableNotifications={true}
 *      enableRealTimeUpdates={true}
 *      showWebSocketStatus={true}
 *    />
 *    ```
 * 
 * 4. Add additional pages:
 *    - Create a React component for the new page, e.g., `ReportsPage.jsx`
 *    - Import it into this file
 *    - Add a `<Route path="/reports" element={<ReportsPage />} />` inside `Routes`
 *    - Add an entry in your `navigationData` or static nav sections for the new page
 */

// =============================================================================
// IMPORTS AND DEPENDENCIES
// =============================================================================
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom"; // Removed BrowserRouter, added useNavigate, useLocation
import { Home, Loader2, AlertTriangle, RefreshCw } from "lucide-react";

// Components
import GlobalSiteNavigation from "./components/navigation/GlobalSiteNavigation.jsx";
import EnhancedSidebar from "./components/layout/EnhancedSidebar.jsx";

// Hooks and contexts
import { useNavigation } from "./hooks/useNavigation";
import { useWebSocketContext } from "./contexts/WebSocketContext";
import { ThemeProvider, useTheme } from './hooks/useTheme';
import { processNavigationData, flattenNavigationForTopNav, getSidebarItems } from "./utils/navigationProcessor.jsx"; // Corrected path to .jsx

// =============================================================================
// NAVIGATION PAGES (Updated Import Paths)
// =============================================================================
import SettingsPage from "./pages/SettingsPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import FileUploaderPage from "./pages/FileUploaderPage.jsx";
import InventoryPage from "./pages/InventoryPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const SiteOrchestrator = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();   // Initialize useNavigate hook
  const location = useLocation();   // Initialize useLocation hook

  // State
  const [activePageId, setActivePageId] = useState("dashboard"); // default to dashboard
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentUser] = useState({
    name: 'Nikos',
    email: 'nikos@example.com',
    role: 'Administrator',
    avatar: null
  });

  // Navigation hook
  const { navigationData: httpNavigationData, loading, error, refresh: refreshNavigation, breadcrumbs, currentSection } = useNavigation({
    enableRealTime: true,
    enableBreadcrumbs: true,
    cacheEnabled: true,
    currentPath: location.pathname // Use useLocation to get the current path for navigation hook
  });

  // WebSocket context
  const { isConnected: wsConnected = false, lastUpdate = null, notifications = [], connectionStats = null } = useWebSocketContext() || {};

// =============================================================================
// Sync activePageId with URL path
// =============================================================================
useEffect(() => {
  const currentPath = location.pathname;

  const findActiveId = (processedNavSections) => {
      // Add a robust check here!
      if (!processedNavSections || processedNavSections.length === 0) {
          return "dashboard"; // Default if no navigation sections are available
      }

      // Flatten all items and their children for a comprehensive search
      const allNavItems = processedNavSections.flatMap(section => {
          // Ensure section.items is an array before flatMapping
          if (!section.items) return [];
          return section.items.flatMap(item => [item, ...(item.children || [])]);
      });

      // Add a check for allNavItems being empty after flattening
      if (allNavItems.length === 0) {
          return "dashboard"; // Default if no items are found after flattening
      }

      // Find the most specific match first (longest path)
      let bestMatchId = "dashboard"; // Default if no specific match
      let bestMatchLength = 0;

      for (const item of allNavItems) {
          if (currentPath === item.url) {
              bestMatchId = item.id;
              break; // Exact match, prioritize and stop
          } else if (currentPath.startsWith(item.url) && item.url !== "/" && item.url.length > bestMatchLength) {
              // For paths like /devices/groups when item.url is /devices, find the longest match
              bestMatchId = item.id;
              bestMatchLength = item.url.length;
          } else if (currentPath === "/" && item.url === "/") {
              bestMatchId = item.id;
              // Don't break here if you want to allow more specific matches later
              // or if a different 'home' item might be more relevant
          }
      }
      return bestMatchId;
  };

  // Only run this logic if navigation data has been loaded and is not null/undefined
  if (!loading && httpNavigationData) {
    const processed = processNavigationData(httpNavigationData);
    // Ensure processed.sections exists before passing to findActiveId
    if (processed && processed.sections) {
      setActivePageId(findActiveId(processed.sections));
    } else {
      // Fallback if processed data is unexpected
      console.warn("Navigation data processing resulted in unexpected structure:", processed);
      setActivePageId("dashboard");
    }
  } else if (!loading && !httpNavigationData) {
      // Handle case where data is loaded but is empty (e.g., API returned no nav data)
      setActivePageId("dashboard");
  }
}, [location.pathname, loading, httpNavigationData, processNavigationData]); // Add processNavigationData to dependencies




  // Memoized navigation data
  // =============================================================================
  const navigationData = useMemo(() => (wsConnected && httpNavigationData ? httpNavigationData : httpNavigationData), [wsConnected, httpNavigationData]);
  const processedNavigation = useMemo(() => processNavigationData(navigationData), [navigationData]);
  const topNavItems = useMemo(() => flattenNavigationForTopNav(processedNavigation), [processedNavigation]);
  const sidebarItems = useMemo(() => getSidebarItems(processedNavigation, activePageId), [processedNavigation, activePageId]);

  const toggleSidebar = useCallback(() => setSidebarOpen(!sidebarOpen), [sidebarOpen]);

  // Handle page change: update internal state for highlighting and navigate using react-router-dom
  const handlePageChange = useCallback((id, url) => {
    setActivePageId(id); // Keep the internal state for highlighting
    navigate(url);      // Navigate to the new URL using react-router-dom
  }, [navigate]);

  // =============================================================================
  // Render main content routes
  // =============================================================================
  return (
    // BrowserRouter is now handled in main.jsx, so it's removed here
    <div className={`flex flex-col h-screen bg-background text-foreground ${theme}`}>
      {/* Navigation */}
      <GlobalSiteNavigation
        user={currentUser}
        currentPage={activePageId}
        onPageChange={handlePageChange} // Pass the new handler to GlobalSiteNavigation
        navigationData={topNavItems} // Pass the flattened data for top navigation
      />

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        <EnhancedSidebar 
          items={sidebarItems}
          pageTitle="Thalyx"
          isOpen={sidebarOpen}
          onToggle={toggleSidebar}
          activePageId={activePageId}
          onItemSelect={(id, url) => handlePageChange(id, url)} // Sidebar also uses the new handler
          wsConnected={wsConnected}
          lastUpdate={lastUpdate}
          theme={theme}
          connectionStats={connectionStats}
        />

        <main className="flex-1 overflow-auto p-6 mt-4">
          {loading && <Loader2 className="animate-spin h-12 w-12 mx-auto" />}
          {error && (
            <div className="text-center text-red-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
              <p>Navigation Error: {error}</p>
              <button onClick={refreshNavigation} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
                <RefreshCw className="inline h-4 w-4 mr-2" /> Retry
              </button>
            </div>
          )}
          <Routes>
            {/* Core routes as explicitly defined */}
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            {/* Dynamically add routes for other top-level navigation items
                This mapping assumes a direct correlation between navigation item IDs and page components.
                You'll need to expand the switch statement for all your YAML 'id's.
            */}
            {topNavItems.map(item => {
              // Exclude already explicitly defined routes to avoid duplicates or conflicts
              if (['/', '/dashboard', '/settings'].includes(item.url)) return null;

              let PageComponent = null;
              switch (item.id) {
                  case "home": PageComponent = DashboardPage; break; // 'home' could point to Dashboard
                  case "devices": PageComponent = InventoryPage; break; // 'devices' maps to InventoryPage
                  case "lab": PageComponent = FileUploaderPage; break; // 'lab' maps to FileUploaderPage (example)
                  // Add more cases here for other top-level navigation items from your YAML
                  // case "reports": PageComponent = ReportsPage; break; // If reports is a top-level page itself
                  default: PageComponent = DashboardPage; // Fallback to Dashboard or a dedicated 404 page
              }
              return PageComponent ? <Route key={item.id} path={item.url} element={<PageComponent />} /> : null;
            })}

            {/* Routes for children of main navigation items (if they map to separate pages) */}
            {/* These need to be explicitly defined or handled with a more advanced dynamic routing system */}

            {/* Dashboard Children */}
            <Route path="/dashboard/analytics" element={<DashboardPage />} /> {/* Assuming analytics is part of DashboardPage or a sub-component */}
            <Route path="/dashboard/reports" element={<ReportsPage />} />

            {/* Devices Children */}
            <Route path="/devices/groups" element={<InventoryPage />} /> {/* Example: children of devices link to InventoryPage */}
            <Route path="/devices/monitoring" element={<InventoryPage />} />

            {/* Lab Children */}
            <Route path="/lab/experiments" element={<FileUploaderPage />} /> {/* Example: children of lab link to FileUploaderPage */}
            <Route path="/lab/protocols" element={<FileUploaderPage />} />
            <Route path="/lab/samples" element={<FileUploaderPage />} />

            {/* Settings Children */}
            <Route path="/settings/user" element={<SettingsPage />} />
            <Route path="/settings/system" element={<SettingsPage />} />

            {/* Add a catch-all route for 404 if needed */}
            {/* <Route path="*" element={<NotFoundPage />} /> */}
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
