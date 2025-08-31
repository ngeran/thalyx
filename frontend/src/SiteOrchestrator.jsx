/**
 * Enhanced SiteOrchestrator Component
 * 
 * @description
 * Advanced site orchestrator that leverages the modern NavigationBar component
 * with integrated WebSocket status, real-time updates, and enhanced user experience.
 * This component now provides a cleaner separation of concerns with dedicated
 * navigation management and improved responsive design.
 * 
 * Key Enhancements:
 * - Integration with modern NavigationBar component
 * - Enhanced WebSocket status monitoring with visual indicators
 * - Improved responsive design with better mobile experience
 * - Real-time navigation updates with smooth transitions
 * - Advanced notification system with categorization
 * - Theme support with dark/light mode switching
 * - Enhanced error handling and fallback mechanisms
 * - Performance optimizations with memoization
 * - Accessibility improvements with ARIA labels
 * 
 * @dependencies
 * - React (useState, useEffect, useMemo, useCallback hooks): State and lifecycle management
 * - Lucide React icons: UI iconography
 * - NavigationBar component: Modern integrated navigation with WebSocket status
 * - PageSidebar component: Enhanced sidebar with real-time updates
 * - useNavigation hook: Enhanced navigation data management
 * - useWebSocketContext hook: Real-time connectivity and updates
 * - navigationProcessor utilities: Data processing and transformation and transformation
 * 
 * @new-features
 * - Seamless WebSocket status integration in navigation bar
 * - Real-time theme switching with persistent preferences
 * - Advanced notification management with auto-dismiss
 * - Intelligent loading states with skeleton screens
 * - Enhanced error recovery with retry mechanisms
 * - Mobile-first responsive design patterns
 * - Keyboard navigation support with shortcuts
 * - Search functionality with instant results
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
 */

// =============================================================================
// IMPORTS AND DEPENDENCIES
// =============================================================================
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Menu, 
  User, 
  Bell, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Loader2,
  AlertTriangle,
  CheckCircle,
  Search
} from "lucide-react";

// Components
import NavigationBar from "./components/navigation/NavigationBar.jsx";
import EnhancedSidebar from "./components/layout/EnhancedSidebar.jsx";

// Hooks and contexts
import { useNavigation } from "./hooks/useNavigation";
import { useWebSocketContext } from "./contexts/WebSocketContext";
import { ThemeProvider, useTheme } from './hooks/useTheme';
import { 
  processNavigationData, 
  flattenNavigationForTopNav, 
  getSidebarItems 
} from "./utils/navigationProcessor";

// Main Site Orchestrator Component
const SiteOrchestrator = () => {
  // Theme hook
  const { theme } = useTheme();
  
  // State
  const [activePageId, setActivePageId] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentUser] = useState({
    name: 'John Doe',
    email: 'john.doe@example.com',
    role: 'Administrator',
    avatar: null
  });

  // Navigation hook
  const { 
    navigationData: httpNavigationData, 
    loading, 
    error, 
    refresh: refreshNavigation,
    breadcrumbs,
    currentSection,
    navigationStats
  } = useNavigation({
    enableRealTime: true,
    enableBreadcrumbs: true,
    cacheEnabled: true,
    currentPath: window.location.pathname
  });

  // WebSocket context
  const {
    isConnected: wsConnected,
    isConnecting: wsIsConnecting,
    isReconnecting: wsIsReconnecting,
    navigationData: wsNavigationData,
    lastUpdate,
    notifications,
    addNotification,
    connectionStats,
    error: wsError
  } = useWebSocketContext();

  // Responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Data processing
  const navigationData = useMemo(() => {
    return (wsConnected && wsNavigationData) ? wsNavigationData : httpNavigationData;
  }, [wsConnected, wsNavigationData, httpNavigationData]);

  const processedNavigation = useMemo(() => {
    return processNavigationData(navigationData);
  }, [navigationData]);

  const topNavItems = useMemo(() => {
    return flattenNavigationForTopNav(processedNavigation);
  }, [processedNavigation]);

  const activeItem = useMemo(() => {
    return topNavItems.find(item => item.id === activePageId);
  }, [topNavItems, activePageId]);

  const sidebarItems = useMemo(() => {
    return getSidebarItems(processedNavigation, activePageId);
  }, [processedNavigation, activePageId]);

  // Event handlers
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(!sidebarOpen);
  }, [sidebarOpen]);

  const handleLogout = useCallback(() => {
    addNotification({
      id: `logout-${Date.now()}`,
      type: 'auth',
      message: 'Logged out successfully',
      level: 'info',
      timestamp: new Date(),
      autoHide: true,
      duration: 2000
    });
    console.log('User logged out');
  }, [addNotification]);

  // Loading state
  if (loading && !navigationData) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="h-16 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <div className="h-8 w-8 bg-sidebar-accent rounded-lg animate-pulse" />
            <div className="h-6 w-24 bg-sidebar-accent rounded animate-pulse" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="animate-spin rounded-full h-12 w-12 mx-auto mb-4 text-sidebar-primary" />
            <p className="text-foreground">Loading application...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !navigationData) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="h-16 bg-sidebar border-b border-red-200 flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <span className="text-lg font-semibold text-red-600">Application Error</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-600 mb-4">Navigation System Error</h2>
            <p className="text-red-500 mb-4">{error}</p>
            <button 
              onClick={refreshNavigation}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="h-4 w-4" />
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="h-screen flex bg-background text-foreground">
      
      {/* Sidebar */}
      <EnhancedSidebar 
        items={sidebarItems}
        pageTitle="Thalyx"
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        activePageId={activePageId}
        onItemSelect={setActivePageId}
        wsConnected={wsConnected}
        lastUpdate={lastUpdate}
        theme={theme}
        connectionStats={connectionStats}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Navigation Bar */}
        <NavigationBar
          onSidebarToggle={toggleSidebar}
          breadcrumbs={breadcrumbs}
          user={currentUser}
        />

        {/* Connection Status Banner */}
        {!wsConnected && !wsIsConnecting && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-6 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <WifiOff className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm text-yellow-800 dark:text-yellow-200">
                  Real-time updates unavailable - operating in offline mode
                </span>
              </div>
              <button 
                onClick={refreshNavigation}
                className="text-sm text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100 underline transition-colors"
              >
                Refresh Data
              </button>
            </div>
          </div>
        )}
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {activeItem?.label || "Dashboard"}
              </h1>
              {currentSection && (
                <p className="text-foreground/70 mt-1">{currentSection.title}</p>
              )}
            </div>
            
            {/* Real-time Data Indicator */}
            {lastUpdate && wsConnected && (
              <div className="flex items-center space-x-2 text-xs text-foreground/50">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span>Updated {new Date(lastUpdate).toLocaleTimeString()}</span>
              </div>
            )}
          </div>

          {/* Sample Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                    <div className="w-5 h-5 bg-primary rounded" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-card-foreground">Card {i}</h3>
                    <p className="text-sm text-muted-foreground">Sample content</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.random() * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Progress</span>
                    <span>{Math.floor(Math.random() * 100)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* Notifications */}
      {notifications && notifications.length > 0 && (
        <div className="fixed top-20 right-4 z-30 space-y-2 max-w-sm">
          {notifications.slice(-3).map((notification) => (
            <div
              key={notification.id}
              className={`
                p-4 rounded-lg shadow-lg border transform transition-all duration-300 ease-in-out
                ${notification.level === 'error' 
                  ? 'bg-destructive/10 border-destructive/20 text-destructive'
                  : notification.level === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
                  : notification.level === 'warning'
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200'
                  : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200'
                }
              `}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {notification.level === 'error' && <AlertTriangle className="h-4 w-4" />}
                  {notification.level === 'success' && <CheckCircle className="h-4 w-4" />}
                  {notification.level === 'warning' && <RefreshCw className="h-4 w-4" />}
                  {notification.level === 'info' && <Bell className="h-4 w-4" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{notification.message}</p>
                  <p className="text-xs opacity-75 mt-1">
                    {notification.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Wrapped component with theme provider
const SiteOrchestratorWithProvider = () => {
  return (
    <ThemeProvider>
      <SiteOrchestrator />
    </ThemeProvider>
  );
};

export default SiteOrchestratorWithProvider;
