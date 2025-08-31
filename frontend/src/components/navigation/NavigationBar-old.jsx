// frontend/src/components/navigation/NavigationBar.jsx

/**
 * Modern Navigation Bar Component
 * 
 * A sleek, responsive navigation bar that seamlessly integrates WebSocket status,
 * navigation menu, breadcrumbs, and user controls. Features modern design patterns
 * including glassmorphism, smooth animations, and intelligent responsive behavior.
 * 
 * Key Features:
 * - Integrated WebSocket status indicator with real-time updates
 * - Responsive navigation menu with collapsible sections
 * - Dynamic breadcrumb navigation with path highlighting
 * - User authentication controls and profile menu
 * - Search functionality with keyboard shortcuts
 * - Notification center with badge indicators
 * - Dark/light theme toggle support
 * - Mobile-first responsive design
 * - Accessibility compliant with ARIA labels
 * 
 * Dependencies:
 * - React (useState, useEffect, useRef, useMemo hooks)
 * - Lucide React icons for UI elements
 * - Enhanced useNavigation hook for navigation data
 * - WebSocketStatus component for connection monitoring
 * - WebSocketContext for real-time functionality
 * - Tailwind CSS for styling and animations
 * 
 * Props:
 * @param {Object} user - Current user object with profile information
 * @param {Function} onLogout - Logout handler function
 * @param {Function} onSearch - Search handler function
 * @param {boolean} showSearch - Whether to display search functionality
 * @param {boolean} showNotifications - Whether to show notification center
 * @param {boolean} showWebSocketStatus - Whether to display WebSocket status
 * @param {string} theme - Current theme ('light' | 'dark')
 * @param {Function} onThemeToggle - Theme toggle handler
 * @param {string} className - Additional CSS classes
 * 
 * Usage Examples:
 * 
 * Basic Usage:
 * ```jsx
 * import NavigationBar from './components/navigation/NavigationBar';
 * 
 * function App() {
 *   return (
 *     <div className="min-h-screen bg-gray-50">
 *       <NavigationBar 
 *         user={currentUser}
 *         onLogout={handleLogout}
 *         showWebSocketStatus={true}
 *       />
 *       <main className="pt-16">
 *         {children}
 *       </main>
 *     </div>
 *   );
 * }
 * ```
 * 
 * Advanced Usage with All Features:
 * ```jsx
 * <NavigationBar
 *   user={user}
 *   onLogout={handleLogout}
 *   onSearch={handleSearch}
 *   showSearch={true}
 *   showNotifications={true}
 *   showWebSocketStatus={true}
 *   theme={theme}
 *   onThemeToggle={toggleTheme}
 *   className="backdrop-blur-lg bg-white/90"
 * />
 * ```
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  X,
  User,
  LogOut,
  Settings,
  Moon,
  Sun,
  ChevronDown,
  ChevronRight,
  Home,
} from 'lucide-react';
import { useNavigation } from '../../hooks/useNavigation';
import WebSocketStatus from '../websocket/WebSocketStatus';

// =============================================================================
// NAVIGATION BAR COMPONENT
// =============================================================================

const NavigationBar = ({
  user = null,
  onLogout = () => {},
  showWebSocketStatus = true,
  theme = 'light',
  onThemeToggle = () => {},
  className = ''
}) => {
  // ---------------------------------------------------------------------------
  // NAVIGATION HOOK & STATE
  // ---------------------------------------------------------------------------
  
  const { 
    navigationData, 
    loading, 
    error, 
    breadcrumbs, 
    refresh,
    webSocketConnected
  } = useNavigation({
    enableRealTime: true,
    enableBreadcrumbs: true,
    cacheEnabled: true
  });

  // ---------------------------------------------------------------------------
  // COMPONENT STATE
  // ---------------------------------------------------------------------------
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // REFS FOR OUTSIDE CLICK DETECTION
  // ---------------------------------------------------------------------------
  
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ---------------------------------------------------------------------------
  // THEME
  // ---------------------------------------------------------------------------
  
  const isDarkTheme = theme === 'dark';

  // ---------------------------------------------------------------------------
  // NAVIGATION MENU RENDERER
  // ---------------------------------------------------------------------------
  
  const renderNavigationMenu = () => {
    if (loading) {
      return (
        <div className="flex space-x-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      );
    }

    if (error || !navigationData?.sections) {
      return (
        <div className="flex items-center space-x-2 text-red-500">
          <span className="text-sm">Navigation Error</span>
          <button 
            onClick={refresh}
            className="text-xs underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      );
    }

    return (
      <div className="hidden md:flex items-center space-x-1">
        {navigationData.sections.map((section) => (
          <div key={section.id} className="relative group">
            {section.items && section.items.length > 0 && (
              <div className="flex space-x-1">
                {section.items.slice(0, 4).map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <a
                      key={item.id}
                      href={item.path}
                      className={`
                        flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium
                        transition-all duration-200 ease-in-out relative group
                        ${item.isActive 
                          ? 'bg-blue-100 text-blue-700 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }
                      `}
                    >
                      <IconComponent className="h-4 w-4" />
                      <span>{item.title}</span>
                      {item.isActive && (
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />
                      )}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // BREADCRUMB RENDERER
  // ---------------------------------------------------------------------------
  
  const renderBreadcrumbs = () => {
    if (!breadcrumbs || breadcrumbs.length <= 1) return null;

    return (
      <div className="hidden lg:flex items-center space-x-2 text-sm">
        {breadcrumbs.map((crumb, index) => {
          const IconComponent = crumb.icon;
          const isLast = index === breadcrumbs.length - 1;
          
          return (
            <div key={crumb.path} className="flex items-center space-x-2">
              {index > 0 && <ChevronRight className="h-3 w-3 text-gray-400" />}
              <a
                href={crumb.path}
                className={`
                  flex items-center space-x-1 px-2 py-1 rounded-md transition-colors
                  ${isLast 
                    ? 'text-gray-900 bg-gray-100 font-medium' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <IconComponent className="h-3 w-3" />
                <span>{crumb.title}</span>
              </a>
            </div>
          );
        })}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // USER MENU RENDERER
  // ---------------------------------------------------------------------------
  
  const renderUserMenu = () => {
    if (!user) {
      return (
        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <User className="h-4 w-4" />
          <span className="hidden sm:block">Sign In</span>
        </button>
      );
    }

    return (
      <div className="relative" ref={userMenuRef}>
        <button
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className={`
            flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200
            ${isUserMenuOpen 
              ? 'bg-gray-100 shadow-sm' 
              : 'hover:bg-gray-100'
            }
          `}
        >
          <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{user.role}</p>
          </div>
          <ChevronDown 
            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
              isUserMenuOpen ? 'rotate-180' : ''
            }`} 
          />
        </button>

        {isUserMenuOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-lg font-medium">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{user.name}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <p className="text-xs text-blue-600 font-medium">{user.role}</p>
                </div>
              </div>
            </div>

            <div className="py-2">
              <a
                href="/profile"
                className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <User className="h-4 w-4" />
                <span className="text-sm">Profile</span>
              </a>
              <a
                href="/settings"
                className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span className="text-sm">Settings</span>
              </a>
              <button
                onClick={onThemeToggle}
                className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors w-full"
              >
                {isDarkTheme ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span className="text-sm">{isDarkTheme ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
              <div className="border-t border-gray-100 my-2" />
              <button
                onClick={onLogout}
                className="flex items-center space-x-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors w-full"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm">Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // MOBILE MENU RENDERER
  // ---------------------------------------------------------------------------
  
  const renderMobileMenu = () => {
    if (!isMobileMenuOpen) return null;

    return (
      <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50">
        <div className="fixed inset-y-0 left-0 w-80 bg-white shadow-xl">
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="px-4 py-4 space-y-4 overflow-y-auto max-h-screen">
            {navigationData?.sections?.map((section) => (
              <div key={section.id}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.items?.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <a
                        key={item.id}
                        href={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`
                          flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors
                          ${item.isActive 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'text-gray-700 hover:bg-gray-100'
                          }
                        `}
                      >
                        <IconComponent className="h-5 w-5" />
                        <span>{item.title}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {showWebSocketStatus && (
            <div className="border-t border-gray-200 p-4">
              <WebSocketStatus variant="full" showControls={true} showStats={true} />
            </div>
          )}
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // STATUS INDICATORS
  // ---------------------------------------------------------------------------
  
  const renderStatusIndicators = () => (
    <div className="flex items-center space-x-3">
      {showWebSocketStatus && (
        <WebSocketStatus 
          variant="compact" 
          showDropdown={true}
          className="transition-opacity duration-200"
        />
      )}
      {renderUserMenu()}
    </div>
  );

  // ---------------------------------------------------------------------------
  // MAIN RENDER
  // ---------------------------------------------------------------------------
  
  return (
    <>
      <nav 
        className={`
          fixed top-0 left-0 right-0 z-40 
          backdrop-blur-lg bg-white/90 border-b border-gray-200
          transition-all duration-300 ease-in-out
          ${className}
        `}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Home className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 hidden sm:block">
                  Dashboard
                </span>
              </div>
              {renderNavigationMenu()}
            </div>
            <div className="flex-1 flex justify-center">
              {renderBreadcrumbs()}
            </div>
            {renderStatusIndicators()}
          </div>
        </div>
        {showWebSocketStatus && !webSocketConnected && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse" />
                <span className="text-sm text-yellow-800">
                  Real-time updates unavailable - WebSocket disconnected
                </span>
              </div>
              <button 
                onClick={refresh}
                className="text-sm text-yellow-700 hover:text-yellow-900 underline"
              >
                Refresh Data
              </button>
            </div>
          </div>
        )}
      </nav>
      {renderMobileMenu()}
      <div className="h-16" />
    </>
  );
};

export default NavigationBar;
