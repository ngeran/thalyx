/**
 * EnhancedGlobalSiteNavigation.jsx - MULTI-LEVEL NAVIGATION
 * 
 * @description
 * Enhanced global navigation component with modern multi-level dropdown menus
 * that fully utilizes the hierarchical backend navigation data structure.
 * 
 * Key Features:
 * - Multi-level dropdown navigation with smooth animations
 * - Smart hover and click interactions
 * - Mobile-responsive design with collapsible menu
 * - Icon support with fallback handling
 * - Active state detection across all levels
 * - Accessibility features (ARIA labels, keyboard navigation)
 * - Theme-aware styling
 * 
 * @dependencies
 * - React (useState, useEffect, useRef, useCallback)
 * - Lucide React icons
 * - useTheme hook
 * - useWebSocketContext hook
 * - useNavigation hook
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  Sun,
  Moon,
  LogOut,
  Settings,
  Menu,
  ChevronDown,
  ChevronRight,
  X,
  // Navigation Icons
  Home,
  LayoutDashboard,
  Cpu,
  Cog,
  Activity,
  BarChart3,
  Bot,
  Router,
  Shield,
  List,
  Database,
  Upload,
  Download,
  FileCheck,
  Command,
  CheckCircle,
  MessageSquare,
  UserCheck,
  TrendingUp,
  Zap,
  Wrench,
  Monitor,
  HardDrive,
  Network
} from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { useWebSocketContext } from "../../contexts/WebSocketContext";
import { useNavigation } from "../../hooks/useNavigation";

// =============================================================================
// Enhanced Icon Mapping
// =============================================================================
const ENHANCED_ICON_MAP = {
  // Top Level Icons
  dashboard: LayoutDashboard,
  device: Cpu,
  config: Cog,
  operations: Activity,
  chart: BarChart3,
  ai: Bot,
  settings: Settings,
  
  // Sub-level Icons
  overview: Home,
  widget: Monitor,
  router: Router,
  switch: Network,
  firewall: Shield,
  list: List,
  backup: Database,
  restore: Upload,
  compliance: FileCheck,
  upgrade: TrendingUp,
  command: Command,
  validation: CheckCircle,
  interface: Monitor,
  protocol: Network,
  chassis: HardDrive,
  capacity: BarChart3,
  chat: MessageSquare,
  assist: UserCheck,
  anomaly: TrendingUp,
  maintenance: Wrench,
  fix: Zap,
  
  // Fallback
  default: Home
};

// =============================================================================
// WebSocketStatus Component (Enhanced)
// =============================================================================
const WebSocketStatus = ({ showControls = true, showStats = true, variant = "default" }) => {
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

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-1 ${statusColorClass}`}>
        {statusIcon}
        {!isConnected && <span className="text-xs">Offline</span>}
      </div>
    );
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
                className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
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
// NavigationDropdown Component
// =============================================================================
const NavigationDropdown = ({ 
  item, 
  currentPage, 
  onPageChange, 
  isOpen, 
  onToggle, 
  onClose 
}) => {
  const dropdownRef = useRef(null);
  const timeoutRef = useRef(null);

  const handleMouseEnter = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    onToggle(true);
  }, [onToggle]);

  const handleMouseLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      onToggle(false);
    }, 150); // Small delay for better UX
  }, [onToggle]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getIcon = (iconName) => {
    const IconComponent = ENHANCED_ICON_MAP[iconName] || ENHANCED_ICON_MAP.default;
    return <IconComponent className="h-4 w-4" />;
  };

  const isActive = currentPage === item.id || 
    item.children?.some(child => 
      currentPage === child.id || 
      child.children?.some(grandchild => currentPage === grandchild.id)
    );

  const hasChildren = item.children && item.children.length > 0;

  if (!hasChildren) {
    // Simple navigation item without children
    return (
      <a
        href={item.url || item.path}
        onClick={(e) => {
          e.preventDefault();
          onPageChange(item.id, item.url || item.path);
        }}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive
            ? "bg-primary text-primary-foreground"
            : "hover:bg-accent hover:text-accent-foreground"
        }`}
      >
        {getIcon(item.icon)}
        {item.label || item.title}
      </a>
    );
  }

  return (
    <div 
      className="relative"
      ref={dropdownRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={() => onToggle(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          isActive
            ? "bg-primary text-primary-foreground"
            : "hover:bg-accent hover:text-accent-foreground"
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {getIcon(item.icon)}
        {item.label || item.title}
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 min-w-[280px] bg-popover border border-border rounded-md shadow-lg z-50 py-2">
          {/* Featured Item (if this is a main section) */}
          {item.url && (
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <a
                href={item.url}
                onClick={(e) => {
                  e.preventDefault();
                  onPageChange(item.id, item.url);
                  onClose();
                }}
                className="block hover:bg-accent/50 rounded p-2 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-md">
                    {getIcon(item.icon)}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{item.label || item.title}</div>
                    <div className="text-xs text-muted-foreground">
                      Main {item.label || item.title} section
                    </div>
                  </div>
                </div>
              </a>
            </div>
          )}

          {/* Navigation Items */}
          <div className="py-1">
            {item.children.map((child) => (
              <NavigationItem
                key={child.id}
                item={child}
                currentPage={currentPage}
                onPageChange={onPageChange}
                onClose={onClose}
                level={1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// NavigationItem Component (Recursive for nested items)
// =============================================================================
const NavigationItem = ({ 
  item, 
  currentPage, 
  onPageChange, 
  onClose, 
  level = 0 
}) => {
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);
  const subMenuRef = useRef(null);

  const getIcon = (iconName) => {
    const IconComponent = ENHANCED_ICON_MAP[iconName] || ENHANCED_ICON_MAP.default;
    return <IconComponent className="h-4 w-4" />;
  };

  const isActive = currentPage === item.id || 
    item.children?.some(child => currentPage === child.id);

  const hasChildren = item.children && item.children.length > 0;

  const handleClick = (e) => {
    if (hasChildren) {
      e.preventDefault();
      setIsSubMenuOpen(!isSubMenuOpen);
    } else {
      e.preventDefault();
      onPageChange(item.id, item.url || item.path);
      onClose();
    }
  };

  const handleMouseEnter = () => {
    if (hasChildren && level === 1) {
      setIsSubMenuOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (hasChildren && level === 1) {
      setTimeout(() => setIsSubMenuOpen(false), 100);
    }
  };

  if (!hasChildren) {
    return (
      <a
        href={item.url || item.path}
        onClick={handleClick}
        className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-accent ${
          isActive ? "bg-accent text-accent-foreground font-medium" : ""
        }`}
      >
        {getIcon(item.icon)}
        <div>
          <div className="font-medium">{item.label || item.title}</div>
          {item.description && (
            <div className="text-xs text-muted-foreground">{item.description}</div>
          )}
        </div>
      </a>
    );
  }

  return (
    <div 
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={handleClick}
        className={`flex items-center justify-between w-full px-4 py-2 text-sm transition-colors hover:bg-accent ${
          isActive ? "bg-accent text-accent-foreground font-medium" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          {getIcon(item.icon)}
          <span className="font-medium">{item.label || item.title}</span>
        </div>
        <ChevronRight className={`h-4 w-4 transition-transform ${isSubMenuOpen ? "rotate-90" : ""}`} />
      </button>

      {isSubMenuOpen && (
        <div 
          ref={subMenuRef}
          className="absolute left-full top-0 ml-1 min-w-[240px] bg-popover border border-border rounded-md shadow-lg z-50 py-2"
        >
          {item.children.map((child) => (
            <NavigationItem
              key={child.id}
              item={child}
              currentPage={currentPage}
              onPageChange={onPageChange}
              onClose={onClose}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// MobileNavigationMenu Component
// =============================================================================
const MobileNavigationMenu = ({ 
  navigationData, 
  currentPage, 
  onPageChange, 
  isOpen, 
  onClose 
}) => {
  const [expandedItems, setExpandedItems] = useState(new Set());

  const toggleExpanded = (itemId) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const getIcon = (iconName) => {
    const IconComponent = ENHANCED_ICON_MAP[iconName] || ENHANCED_ICON_MAP.default;
    return <IconComponent className="h-4 w-4" />;
  };

  const MobileNavItem = ({ item, level = 0 }) => {
    const isExpanded = expandedItems.has(item.id);
    const isActive = currentPage === item.id;
    const hasChildren = item.children && item.children.length > 0;
    const paddingLeft = `${1 + level * 1}rem`;

    return (
      <div>
        <button
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.id);
            } else {
              onPageChange(item.id, item.url || item.path);
              onClose();
            }
          }}
          className={`flex items-center justify-between w-full px-4 py-3 text-left transition-colors ${
            isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent"
          }`}
          style={{ paddingLeft }}
        >
          <div className="flex items-center gap-3">
            {getIcon(item.icon)}
            <span className="font-medium">{item.label || item.title}</span>
          </div>
          {hasChildren && (
            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          )}
        </button>
        
        {hasChildren && isExpanded && (
          <div className="border-l-2 border-accent ml-4">
            {item.children.map((child) => (
              <MobileNavItem key={child.id} item={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed left-0 top-0 h-full w-[280px] bg-background border-r border-border overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="font-bold text-lg">Thalyx</span>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <nav className="py-2">
          {navigationData?.sections?.[0]?.items?.map((item) => (
            <MobileNavItem key={item.id} item={item} />
          ))}
        </nav>
      </div>
    </div>
  );
};

// =============================================================================
// Enhanced GlobalSiteNavigation Component
// =============================================================================
const EnhancedGlobalSiteNavigation = ({
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
  const [openDropdowns, setOpenDropdowns] = useState(new Set());
  const userMenuRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function onDocClick(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpenDropdowns(new Set());
        setUserMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleDropdown = useCallback((itemId, isOpen) => {
    setOpenDropdowns(prev => {
      const newSet = new Set();
      if (isOpen) {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  const closeAllDropdowns = useCallback(() => {
    setOpenDropdowns(new Set());
  }, []);

  // =============================================================================
  // Navigation Rendering Functions
  // =============================================================================
  
  const renderDesktopNav = () => {
    if (loading) {
      return (
        <nav className="flex items-center space-x-2 pl-12">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-8 w-20 bg-accent animate-pulse rounded" />
          ))}
        </nav>
      );
    }

    if (error) {
      return (
        <nav className="flex items-center space-x-2 pl-12">
          <span className="text-red-500 text-sm">Navigation error</span>
        </nav>
      );
    }

    // Check if we're in settings context
    const isInSettingsContext = currentPage === 'settings' || 
      (typeof window !== 'undefined' && window.location.pathname.startsWith('/settings'));

    // Process navigation data
    if (navigationData?.sections?.[0]?.items) {
      return (
        <nav className="flex items-center space-x-1 pl-12">
          {navigationData.sections[0].items.map((item) => {
            const isDropdownOpen = openDropdowns.has(item.id);
            
            return (
              <NavigationDropdown
                key={item.id}
                item={item}
                currentPage={currentPage}
                onPageChange={onPageChange}
                isOpen={isDropdownOpen}
                onToggle={(open) => toggleDropdown(item.id, open)}
                onClose={closeAllDropdowns}
              />
            );
          })}
        </nav>
      );
    }

    return null;
  };

  // =============================================================================
  // Main Render
  // =============================================================================
  return (
    <>
      {!ws?.isConnected && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm text-yellow-800 dark:text-yellow-200">WebSocket disconnected</span>
          </div>
          <button 
            onClick={ws.refresh} 
            className="text-sm underline text-yellow-800 dark:text-yellow-200 hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      <header
        className={`sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${className}`}
      >
        <div className="container mx-auto flex items-center h-16 gap-4 px-4">
          {/* Logo and Mobile Menu Toggle */}
          <div className="flex items-center gap-4">
            <button
              className="md:hidden p-2 rounded-md hover:bg-accent transition-colors"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open mobile menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <a 
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onPageChange("home", "/");
              }}
              className="font-bold text-lg hover:text-primary transition-colors"
            >
              Thalyx
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block flex-1">
            {renderDesktopNav()}
          </div>

          {/* Right Side Controls */}
          <div className="flex items-center gap-2 ml-auto" ref={userMenuRef}>
            <WebSocketStatus variant="compact" />
            
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-md hover:bg-accent transition-colors"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            
            <button
              onClick={() => setUserMenuOpen((s) => !s)}
              className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-accent transition-colors"
              aria-label="Open user menu"
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-popover border border-border rounded-md shadow-lg z-50">
                <div className="px-4 py-3 border-b border-border">
                  <p className="font-medium text-sm">{user.name}</p>
                  {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
                  <p className="text-xs text-muted-foreground">{user.role}</p>
                </div>
                <div className="py-1">
                  <a
                    href="/settings"
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange("settings", "/settings");
                      setUserMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </a>
                  <button
                    onClick={onLogout}
                    className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      <MobileNavigationMenu
        navigationData={navigationData}
        currentPage={currentPage}
        onPageChange={onPageChange}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
    </>
  );
};

export default EnhancedGlobalSiteNavigation;
