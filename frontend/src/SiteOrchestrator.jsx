/**
 * @file SiteOrchestrator.jsx
 * @description Main application orchestrator using the plugin-based architecture.
 *              Coordinates page registration, routing, and navigation management.
 *
 * @key-features
 * - Dynamic page registration from PageRegistry
 * - Automatic route generation
 * - Navigation state management
 * - Responsive layout handling
 *
 * @dependencies
 * - react-router-dom: For routing
 * - @/core/registry/PageRegistry: Page registry instance
 * - @/core/contexts/NavigationContext: Navigation context provider
 * - @/components/layout/EnhancedSidebar: Sidebar component
 * - @/components/navigation/GlobalSiteNavigation: Top navigation component
 * - All page configuration files
 *
 * @usage-guide
 * ```jsx
 * // Use as the main application component
 * import SiteOrchestrator from './SiteOrchestrator';
 *
 * function App() {
 *   return <SiteOrchestrator />;
 * }
 * ```
 */
/**
 * @file SiteOrchestrator.jsx
 * @description Main application orchestrator using the plugin-based architecture.
 *              Coordinates page registration, routing, and navigation management.
 */

import React, { useMemo, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { NavigationProvider, useNavigation } from './core/contexts/NavigationContext';
import { pageRegistry } from './core/registry/PageRegistry';
// =============================================================================
// COMPONENT IMPORTS
// =============================================================================
import GlobalSiteNavigation from "./components/navigation/GlobalSiteNavigation.jsx";
import EnhancedSidebar from "./components/layout/EnhancedSidebar.jsx";

// Import page configurations
import dashboardConfig from './pages/dashboard/dashboard.config';
import reportsConfig from './pages/reports/reports.config';
import settingsConfig from './pages/settings/settings.config';

// =============================================================================
// HOOKS & CONTEXTS
// =============================================================================
import { useApiData } from "./hooks/useApiData";
import { useWebSocketContext } from "./contexts/WebSocketContext";
import { ThemeProvider, useTheme } from "./hooks/useTheme";

// Register all pages
pageRegistry
  .register(dashboardConfig)
  .register(reportsConfig)
  .register(settingsConfig);

// =============================================================================
// SITE ORCHESTRATOR CONTENT
// =============================================================================

const SiteOrchestratorContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    activePageId,
    sidebarItems,
    navigateToPage,
    pageLoading
  } = useNavigation();

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  // Sync navigation context with URL changes (but don't trigger navigation)
  useEffect(() => {
    const path = location.pathname.slice(1) || 'dashboard';
    if (pageRegistry.hasPage(path) && activePageId !== path) {
      navigateToPage(path);
    }
  }, [location.pathname, navigateToPage, activePageId]);

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------

  // Generate routes dynamically from registered pages - FIXED: Remove wildcards
  const routes = useMemo(() => {
    return pageRegistry.getAllPages().map(page => (
      <Route
        key={page.id}
        path={`/${page.id}`}
        element={<page.component />}
      />
    ));
  }, []);

  // Get navigation pages for top navigation
  const navigationPages = useMemo(() => {
    return pageRegistry.getNavigationPages();
  }, []);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  // FIXED: Simplified navigation handler - let React Router handle the navigation
  const handlePageChange = (pageId) => {
    navigate(`/${pageId}`);
    // navigateToPage will be called by the useEffect above when location changes
  };

  const handleSidebarItemSelect = (itemId) => {
    // Handle sidebar navigation
    navigate(`/${itemId}`);
    console.log('Sidebar item selected:', itemId);
  };

  // ---------------------------------------------------------------------------
  // DEBUG: Add some logging to help troubleshoot
  // ---------------------------------------------------------------------------
  console.log('Current location:', location.pathname);
  console.log('Active page ID:', activePageId);
  console.log('Available pages:', pageRegistry.getAllPages().map(p => p.id));

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Global Top Navigation */}
      <GlobalSiteNavigation
        currentPage={activePageId}
        onPageChange={handlePageChange}
        pages={navigationPages}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <EnhancedSidebar
          items={sidebarItems}
          activePageId={activePageId}
          onItemSelect={handleSidebarItemSelect}
          loading={pageLoading}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          {pageLoading ? (
            <div className="flex items-center justify-center h-full">
              <div>Loading...</div>
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              {routes}
              {/* 404 Fallback */}
              <Route path="*" element={
                <div className="text-center py-8">
                  <h2 className="text-2xl font-bold mb-4">Page not found</h2>
                  <p>The page you're looking for doesn't exist.</p>
                  <button 
                    onClick={() => navigate('/dashboard')}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Go to Dashboard
                  </button>
                </div>
              } />
            </Routes>
          )}
        </main>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const SiteOrchestrator = () => {
  return (
    <ThemeProvider>
      <NavigationProvider>
        <SiteOrchestratorContent />
      </NavigationProvider>
    </ThemeProvider>
  );
};

export default SiteOrchestrator;
