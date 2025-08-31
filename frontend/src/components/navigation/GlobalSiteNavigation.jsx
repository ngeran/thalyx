// =============================================================================
// GlobalSiteNavigation.jsx
// -----------------------------------------------------------------------------
// DESCRIPTION:
// A reusable global navigation bar for the Thalyx platform. It provides
// backend-driven navigation links, WebSocket connection monitoring, theme
// toggling, and user session controls in a responsive layout.
//
// FEATURES:
// - Fetches navigation items from backend API (/api/navigation/yaml)
// - Caching, retries, and live updates via `useNavigation` hook
// - WebSocket status indicator with enhanced dropdown (server, uptime, stats)
// - Responsive design: desktop horizontal nav + mobile menu (placeholder)
// - User menu with profile, settings, logout
// - Dark/light theme toggle via `useTheme` hook
// - Consistent alignment with main content <h1>
//
// DEPENDENCIES:
// - React (useState, useEffect, useRef)
// - TailwindCSS for styling
// - lucide-react icons
// - useTheme (theme management)
// - useWebSocketContext (WebSocket integration)
// - useNavigation (backend navigation fetching)
//
// HOW TO USE:
// ```jsx
// import GlobalSiteNavigation from "@/components/navigation/GlobalSiteNavigation";
//
// function App() {
//   const user = { name: "Nikos", email: "nikos@example.com", role: "Admin" };
//
//   return (
//     <div className="min-h-screen">
//       <GlobalSiteNavigation
//         user={user}
//         currentPage="home" // pass the current active page id
//         onPageChange={(id, url) => console.log("Navigate:", id, url)}
//         onLogout={() => console.log("Logout")}
//       />
//       <main className="container mx-auto px-12 py-8">
//         <h1 className="text-2xl font-bold">Dashboard</h1>
//       </main>
//     </div>
//   );
// }
// ```
// - To ensure the active page highlights correctly, pass `currentPage` prop from
//   the parent component and handle `onPageChange` to update it when user clicks
//   a link.
//
// =============================================================================

import React, { useEffect, useRef, useState } from "react";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Sun,
  Moon,
  LogOut,
  Settings,
  Menu,
  ChevronDown,
} from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { useWebSocketContext } from "../../contexts/WebSocketContext";
import { useNavigation } from "../../hooks/useNavigation";

// =============================================================================
// SECTION 1: WebSocketStatus Indicator
// -----------------------------------------------------------------------------
// A reusable inline component showing connection state with dropdown
// details: status, attempts, errors, server, uptime, etc.
// =============================================================================
const WebSocketStatus = ({ showControls = true, showStats = true }) => {
  const {
    isConnected,
    isConnecting,
    isReconnecting,
    lastUpdate,
    connectionStats,
    error,
    refresh,
    serverUrl = "ws://127.0.0.1:3001",
  } = useWebSocketContext();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (isDropdownOpen && dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") setIsDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDropdownOpen]);

  let statusIcon = <Wifi className="h-4 w-4" />;
  let statusColorClass = "text-green-500";
  if (isConnecting || isReconnecting) {
    statusIcon = <RefreshCw className="h-4 w-4 animate-spin" />;
    statusColorClass = "text-yellow-500";
  } else if (!isConnected) {
    statusIcon = <WifiOff className="h-4 w-4" />;
    statusColorClass = "text-red-500";
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        aria-label="WebSocket status"
        onClick={() => setIsDropdownOpen((s) => !s)}
        className={`p-2 rounded-md hover:bg-accent transition-colors ${statusColorClass}`}
      >
        {statusIcon}
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-popover border rounded-md shadow-lg z-50 p-4">
          <h4 className="font-semibold mb-2">WebSocket Connection</h4>
          <ul className="text-sm space-y-1">
            <li>
              Status:{" "}
              <span className={statusColorClass}>
                {isConnected ? "Connected" : isConnecting ? "Connecting..." : "Disconnected"}
              </span>
            </li>
            <li>Server: {serverUrl}</li>
            <li>Last Update: {lastUpdate ? new Date(lastUpdate).toLocaleString() : "—"}</li>
            {showStats && (
              <>
                <li>Attempts: {connectionStats?.attempts ?? 0}</li>
                <li>Messages: {connectionStats?.messages ?? 0}</li>
                <li>Uptime: {connectionStats?.uptime ?? "—"}</li>
              </>
            )}
            {error && <li className="text-red-500">Error: {String(error)}</li>}
          </ul>
          {showControls && (
            <div className="mt-3">
              <button
                onClick={refresh}
                className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded"
              >
                Reconnect
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// SECTION 2: GlobalSiteNavigation Component
// -----------------------------------------------------------------------------
// Provides the full header UI: brand, nav links, theme toggle,
// WebSocket status, and user profile menu.
// =============================================================================
const GlobalSiteNavigation = ({
  user = { name: "John Doe", email: "", role: "User" },
  currentPage = "home",
  onPageChange = () => {},
  onLogout = () => {},
  className = "",
}) => {
  const { theme, toggleTheme } = useTheme();
  const ws = useWebSocketContext();

  const { navigationData, loading, error } = useNavigation({
    enableRealTime: true,
    cacheEnabled: true,
  });

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // ---------------------------------------------------------------------------
  // Render Desktop Navigation (active link highlighting)
  // ---------------------------------------------------------------------------
  const renderDesktopNav = () => {
    if (loading) return <span>Loading...</span>;
    if (error) return <span className="text-red-500">Nav error</span>;

    // First check if we have the processed structure with sections
    if (navigationData?.sections) {
      return (
        <nav className="flex items-center space-x-2 pl-12">
          {navigationData.sections.map((section) =>
            section.items.map((item) => (
              <a
                key={item.id}
                href={item.path || item.url}
                onClick={(e) => {
                  e.preventDefault();
                  // Pass both ID and URL to the parent handler
                  onPageChange(item.id, item.path || item.url);
                }}
                className={`px-3 py-2 rounded-md text-sm ${
                  currentPage === item.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {item.icon && <item.icon className="h-4 w-4 mr-2 inline" />}
                {item.title || item.label}
              </a>
            ))
          )}
        </nav>
      );
    }

    // Fallback: check if we have raw YAML structure with items array
    if (navigationData?.items) {
      return (
        <nav className="flex items-center space-x-2 pl-12">
          {navigationData.items.map((item) => (
            <a
              key={item.id}
              href={item.url}
              onClick={(e) => {
                e.preventDefault();
                // Pass both ID and URL to the parent handler
                onPageChange(item.id, item.url);
              }}
              className={`px-3 py-2 rounded-md text-sm ${
                currentPage === item.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>
      );
    }

    return null;
  };

  // ---------------------------------------------------------------------------
  // Render Main Header
  // ---------------------------------------------------------------------------
  return (
    <>
      {!ws?.isConnected && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm">WebSocket disconnected</span>
          </div>
          <button onClick={ws.refresh} className="text-sm underline">
            Retry
          </button>
        </div>
      )}

      <header
        className={`sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur ${className}`}
      >
        <div className="container mx-auto flex items-center h-16 gap-4 px-4">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden p-2 rounded hover:bg-accent"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-bold text-lg">Thalyx</span>
          </div>

          <div className="hidden md:block">{renderDesktopNav()}</div>

          <div className="flex items-center gap-2 ml-auto" ref={userMenuRef}>
            <WebSocketStatus />
            <button onClick={toggleTheme} className="p-2 rounded hover:bg-accent">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setUserMenuOpen((s) => !s)}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent"
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <ChevronDown className={`h-4 w-4 ${userMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-popover border rounded-md shadow-lg z-50">
                <div className="px-4 py-3 border-b">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs">{user.email}</p>
                  <p className="text-xs">{user.role}</p>
                </div>
                <a
                  href="/settings"
                  onClick={(e) => {
                    e.preventDefault();
                    onPageChange("settings", "/settings");
                    setUserMenuOpen(false);
                  }}
                  className="block px-4 py-2 text-sm hover:bg-accent"
                >
                  <Settings className="h-4 w-4 inline mr-2" />
                  Settings
                </a>
                <button
                  onClick={onLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4 inline mr-2" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

export default GlobalSiteNavigation
