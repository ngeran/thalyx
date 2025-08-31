/**
 * Enhanced useNavigation Hook
 *
 * Advanced React hook for fetching and managing navigation data with enhanced
 * error handling, caching, real-time updates, and WebSocket integration.
 * Provides a comprehensive navigation state management solution.
 *
 * Key Features:
 * - Automatic data fetching with health check validation
 * - Intelligent caching with configurable TTL
 * - Real-time navigation updates via WebSocket
 * - Comprehensive error handling and retry logic
 * - Loading states and progress indicators
 * - Icon mapping with fallback support
 * - Navigation breadcrumb generation
 * - Route validation and access control
 *
 * Dependencies:
 * - React (useState, useEffect, useCallback, useMemo hooks)
 * - Lucide React icons for navigation items
 * - WebSocket context for real-time updates
 * - Backend API endpoints for navigation data
 *
 * API Endpoints:
 * - Health Check: GET http://127.0.0.1:3001/health
 * - Navigation Data: GET http://127.0.0.1:3001/api/yaml/navigation
 * - Navigation Updates: WebSocket subscription to 'navigation:update'
 *
 * Environment Configuration:
 * - REACT_APP_API_BASE_URL: Backend API base URL (default: http://127.0.0.1:3001)
 * - REACT_APP_CACHE_TTL: Navigation cache TTL in milliseconds (default: 300000)
 *
 * Usage Examples:
 *
 * Basic Usage:
 * ```jsx
 * const { navigationData, loading, error } = useNavigation();
 * ```
 *
 * Advanced Usage with Options:
 * ```jsx
 * const {
 *   navigationData,
 *   loading,
 *   error,
 *   refresh,
 *   breadcrumbs,
 *   currentSection
 * } = useNavigation({
 *   enableRealTime: true,
 *   cacheEnabled: true,
 *   autoRefresh: 300000
 * });
 * ```
 *
 * Integration with Navigation Bar:
 * ```jsx
 * function NavigationBar() {
 *   const { navigationData, loading, breadcrumbs } = useNavigation();
 *
 *   if (loading) return <NavigationSkeleton />;
 *
 *   return (
 *     <nav className="flex items-center justify-between">
 *       <NavigationMenu items={navigationData} />
 *       <div className="flex items-center space-x-4">
 *         <Breadcrumbs items={breadcrumbs} />
 *         <WebSocketStatus variant="compact" />
 *       </div>
 *     </nav>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Home,
  Package,
  FileUp,
  BarChart3,
  Settings,
  LayoutDashboard,
  Microscope,
  Cpu,
  Users,
  Database,
  Shield,
  Globe,
  Folder,
  FileText,
  Calendar,
  Mail,
  Bell,
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  Edit,
  Trash,
  Eye,
  Lock,
  Unlock
} from "lucide-react";
import { useWebSocketContext } from '../contexts/WebSocketContext';

// =============================================================================
// CONFIGURATION & CONSTANTS
// =============================================================================

/**
 * API Configuration
 */
const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001',
  endpoints: {
    health: '/health',
    navigation: '/api/navigation/yaml'
  },
  cacheTTL: parseInt(import.meta.env.VITE_CACHE_TTL) || 300000, // 5 minutes
  retryAttempts: 3,
  retryDelay: 1000
};

/**
 * ICON_MAP
 * maps icon name strings from backend -> Lucide React components
 */
const ICON_MAP = {
  home: Home,
  dashboard: LayoutDashboard,
  device: Cpu,
  lab: Microscope,
  settings: Settings,
  chart: BarChart3,
  report: FileUp,

  users: Users,
  database: Database,
  security: Shield,
  globe: Globe,
  folder: Folder,
  file: FileText,
  calendar: Calendar,
  mail: Mail,
  notifications: Bell,
  search: Search,
  filter: Filter,
  download: Download,
  upload: Upload,
  add: Plus,
  edit: Edit,
  delete: Trash,
  view: Eye,
  lock: Lock,
  unlock: Unlock,

  package: Package,
  fileUp: FileUp,
  barChart3: BarChart3,
  activity: BarChart3
};

/**
 * DEFAULT_NAVIGATION
 * fallback structure if API is unreachable
 */
const DEFAULT_NAVIGATION = {
  sections: [
    {
      id: 'main',
      title: 'Main Navigation',
      items: [
        { id: 'home', title: 'Home', icon: 'home', path: '/' },
        { id: 'dashboard', title: 'Dashboard', icon: 'dashboard', path: '/dashboard' }
      ]
    }
  ]
};

// =============================================================================
// CACHE MANAGEMENT
// =============================================================================

/**
 * NavigationCache
 * simple Map-based TTL cache
 */
class NavigationCache {
  constructor(ttl = API_CONFIG.cacheTTL) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expires: Date.now() + this.ttl
    });
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  clear() {
    this.cache.clear();
  }

  isValid(key) {
    const entry = this.cache.get(key);
    return entry && Date.now() <= entry.expires;
  }
}

const navigationCache = new NavigationCache();

// =============================================================================
// SHARED HELPERS
// =============================================================================

/**
 * buildBreadcrumbs
 * A standalone breadcrumbs builder used both inside the main hook and
 * in the exported useNavigationBreadcrumbs helper hook.
 *
 * - navData: the processed navigation data (with `.sections`)
 * - path: current path string (e.g. window.location.pathname)
 * - enableBreadcrumbs: boolean toggle for this logic
 */
const buildBreadcrumbs = (navData, path, enableBreadcrumbs = true) => {
  if (!enableBreadcrumbs || !navData || !path) return [];

  const breadcrumbs = [];
  const pathSegments = path.split('/').filter(Boolean);

  // Always start with home
  breadcrumbs.push({
    title: 'Home',
    path: '/',
    icon: ICON_MAP.home
  });

  const findItemByPath = (items, targetPath) => {
    for (const item of items || []) {
      if (item.path === targetPath) return item;
      if (item.children) {
        const found = findItemByPath(item.children, targetPath);
        if (found) return found;
      }
    }
    return null;
  };

  let currentAccumulatedPath = '';
  pathSegments.forEach((segment) => {
    currentAccumulatedPath += `/${segment}`;
    for (const section of navData.sections || []) {
      const item = findItemByPath(section.items || [], currentAccumulatedPath);
      if (item) {
        breadcrumbs.push({
          title: item.title,
          path: item.path,
          icon: item.icon
        });
        break;
      }
    }
  });

  return breadcrumbs;
};

// =============================================================================
// MAIN HOOK IMPLEMENTATION
// =============================================================================

/**
 * useNavigation
 *
 * @param {Object} options
 *   - enableRealTime: enable websocket updates
 *   - cacheEnabled: use cached navigation payload
 *   - autoRefresh: interval in ms for auto-refresh
 *   - enableBreadcrumbs: build breadcrumbs
 *   - currentPath: override for current path used by isActive/breadcrumbs
 */
export const useNavigation = (options = {}) => {
  const {
    enableRealTime = false,
    cacheEnabled = true,
    autoRefresh = null,
    enableBreadcrumbs = false,
    currentPath = (typeof window !== 'undefined' ? window.location.pathname : '/')
  } = options;

  // WebSocket context (optional)
  const webSocketContext = enableRealTime ? useWebSocketContext() : null;

  // Local state
  const [navigationData, setNavigationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // ---------------------------------------------------------------------------
  // PROCESS NAV DATA (maps backend shape -> frontend shape)
  // ---------------------------------------------------------------------------
  const processNavigationData = useCallback((rawData) => {
    if (!rawData) return null;

    const processItem = (item) => ({
      ...item,
      title: item.label || item.title, // map backend 'label' to frontend 'title'
      path: item.url || item.path,     // map backend 'url' to frontend 'path'
      icon: ICON_MAP[item.icon] || ICON_MAP.folder,
      iconName: item.icon,
      isActive: currentPath === (item.url || item.path),
      children: item.children ? item.children.map(processItem) : []
    });

    const transformedSections = [
      {
        id: 'main-backend-section',
        title: 'Main Navigation',
        items: rawData.items ? rawData.items.map(processItem) : []
      }
    ];

    return {
      metadata: rawData.metadata,
      version: rawData.version,
      sections: transformedSections,
      lastProcessed: Date.now()
    };
  }, [currentPath]);

  // ---------------------------------------------------------------------------
  // HEALTH CHECK
  // ---------------------------------------------------------------------------
  /**
   * performHealthCheck
   * Accepts JSON or plain text "OK" responses from /health endpoint.
   */
  const performHealthCheck = useCallback(async () => {
    const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.health}`;
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      throw new Error(`Health check failed: ${res.status} ${res.statusText}`);
    }

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('application/json')) {
      // If JSON -> parse and return it
      try {
        return await res.json();
      } catch (err) {
        // Parsing error -> treat as failure
        throw new Error(`Health check JSON parse error: ${err.message}`);
      }
    }

    // If not JSON, accept plain-text "OK" (case-insensitive)
    const text = (await res.text()).trim();
    if (/^ok$/i.test(text)) {
      return { status: 'ok', raw: text };
    }

    // Unexpected health response
    throw new Error(`Unexpected health response (non-JSON): ${text.slice(0, 120)}`);
  }, []);

  // ---------------------------------------------------------------------------
  // FETCH NAVIGATION DATA WITH RETRY AND STEP-AWARE LOGGING
  // ---------------------------------------------------------------------------
  const fetchNavigationData = useCallback(async (attempt = 1) => {
    let step = 'health';
    try {
      // use cache if available
      if (cacheEnabled) {
        const cached = navigationCache.get('navigation');
        if (cached) {
          console.log('[useNavigation] Using cached navigation data');
          return cached;
        }
      }

      // 1) Health check (tolerant to plain "OK")
      await performHealthCheck();

      // 2) Fetch navigation payload
      step = 'navigation';
      const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.navigation}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }

      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (!contentType.includes('application/json')) {
        // If backend responds with non-JSON, print the raw text for debugging.
        const textResponse = await response.text();
        console.error('[useNavigation] Invalid response format. Expected JSON but got:', textResponse);
        throw new Error(`Invalid response format. Expected JSON but received: "${textResponse.substring(0, 100)}..."`);
      }

      const data = await response.json();

      // Validate structure
      if (!data || typeof data !== 'object' || !Array.isArray(data.items)) {
        throw new Error('Invalid navigation data structure received: expected an "items" array at the root.');
      }

      // Cache raw data
      if (cacheEnabled) {
        navigationCache.set('navigation', data);
      }

      return data;

    } catch (err) {
      // Step-aware logging helps distinguish which stage failed
      console.error(`[useNavigation] Navigation fetch attempt ${attempt} failed at step: ${step}`, {
        error: err.message,
        step,
        url: step === 'health' ? `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.health}` : `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.navigation}`,
        attempt
      });

      // Retry (exponential-ish backoff-ish by multiplying delay by attempt)
      if (attempt < API_CONFIG.retryAttempts) {
        const backoff = API_CONFIG.retryDelay * attempt;
        console.warn(`[useNavigation] Retrying navigation load in ${backoff}ms (attempt ${attempt + 1})...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        return fetchNavigationData(attempt + 1);
      }

      // Exhausted retries -> rethrow
      throw err;
    }
  }, [cacheEnabled, performHealthCheck]);

  // ---------------------------------------------------------------------------
  // LOAD (wrapper that calls fetchNavigationData + processing)
  // ---------------------------------------------------------------------------
  const loadNavigationData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setRetryCount(0);

      const rawData = await fetchNavigationData();
      const processedData = processNavigationData(rawData);

      setNavigationData(processedData);
      setLastFetch(Date.now());
      setLoading(false);
    } catch (err) {
      const errorMessage = err.message || 'Failed to load navigation data';
      setError(errorMessage);
      setRetryCount(prev => prev + 1);
      setLoading(false);

      // Use default fallback (processed to match structure)
      const fallbackData = processNavigationData(DEFAULT_NAVIGATION);
      setNavigationData(fallbackData);

      console.error('[useNavigation] Navigation data loading error:', err);
    }
  }, [fetchNavigationData, processNavigationData]);

  // ---------------------------------------------------------------------------
  // WEBSOCKET REAL-TIME UPDATES
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!enableRealTime || !webSocketContext?.isConnected || !webSocketContext?.subscribe) return;

    const handleNavigationUpdate = (message) => {
      // Expect message.payload to be the raw navigation data (flat `items`)
      if (message?.type === 'navigation-updated' || message?.type === 'navigation-update') {
        console.log('[useNavigation] Received navigation update via WebSocket');
        const processedData = processNavigationData(message.payload);
        setNavigationData(processedData);

        if (cacheEnabled) {
          // store raw payload into cache so subsequent reads use updated raw payload
          navigationCache.set('navigation', message.payload);
        }
      }
    };

    // subscribe returns an unsubscribe function in some implementations
    const maybeUnsub = webSocketContext.subscribe('navigation-updated', handleNavigationUpdate);

    return () => {
      // attempt graceful unsubscribe
      try {
        if (typeof webSocketContext.unsubscribe === 'function') {
          webSocketContext.unsubscribe('navigation-updated', handleNavigationUpdate);
        } else if (typeof maybeUnsub === 'function') {
          maybeUnsub();
        }
      } catch (e) {
        // ignore unsubscribe problems on cleanup
        console.warn('[useNavigation] Error during websocket unsubscribe:', e);
      }
    };
  }, [enableRealTime, webSocketContext, processNavigationData, cacheEnabled]);

  // ---------------------------------------------------------------------------
  // AUTO-REFRESH EFFECT
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!autoRefresh || autoRefresh <= 0) return;

    const interval = setInterval(() => {
      console.log('[useNavigation] Auto-refreshing navigation data');
      loadNavigationData();
    }, autoRefresh);

    return () => clearInterval(interval);
  }, [autoRefresh, loadNavigationData]);

  // ---------------------------------------------------------------------------
  // INITIAL LOAD ON MOUNT
  // ---------------------------------------------------------------------------
  useEffect(() => {
    loadNavigationData();
  }, []); // mount-only

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------

  // breadcrumbs via top-level helper
  const breadcrumbs = useMemo(() => {
    return buildBreadcrumbs(navigationData, currentPath, enableBreadcrumbs);
  }, [navigationData, currentPath, enableBreadcrumbs]);

  // current section detection (checks isActive flags computed in processNavigationData)
  const currentSection = useMemo(() => {
    if (!navigationData?.sections) return null;

    for (const section of navigationData.sections) {
      const hasActiveItem = section.items?.some(item =>
        item.isActive || item.children?.some(child => child.isActive)
      );
      if (hasActiveItem) return section;
    }

    // default to first section if none active
    return navigationData.sections[0];
  }, [navigationData]);

  // stats
  const navigationStats = useMemo(() => {
    if (!navigationData) return null;

    const stats = {
      totalSections: navigationData.sections?.length || 0,
      totalItems: 0,
      totalSubItems: 0,
      activeItems: 0
    };

    navigationData.sections?.forEach(section => {
      stats.totalItems += section.items?.length || 0;
      section.items?.forEach(item => {
        if (item.isActive) stats.activeItems++;
        if (item.children) {
          stats.totalSubItems += item.children.length;
          item.children.forEach(child => {
            if (child.isActive) stats.activeItems++;
          });
        }
      });
    });

    return stats;
  }, [navigationData]);

  // ---------------------------------------------------------------------------
  // UTILITIES
  // ---------------------------------------------------------------------------

  const refresh = useCallback(async () => {
    if (cacheEnabled) navigationCache.clear();
    await loadNavigationData();
  }, [loadNavigationData, cacheEnabled]);

  const findNavigationItem = useCallback((identifier, searchBy = 'id') => {
    if (!navigationData?.sections) return null;

    for (const section of navigationData.sections) {
      for (const item of section.items || []) {
        const searchTarget = searchBy === 'path' ? item.path : item[searchBy];
        if (searchTarget === identifier) return item;

        if (item.children) {
          for (const child of item.children) {
            const childSearchTarget = searchBy === 'path' ? child.path : child[searchBy];
            if (childSearchTarget === identifier) return child;
          }
        }
      }
    }

    return null;
  }, [navigationData]);

  const getNavigationPath = useCallback((itemId) => {
    if (!navigationData?.sections) return [];

    for (const section of navigationData.sections) {
      for (const item of section.items || []) {
        if (item.id === itemId) return [section, item];
        if (item.children) {
          for (const child of item.children) {
            if (child.id === itemId) return [section, item, child];
          }
        }
      }
    }

    return [];
  }, [navigationData]);

  const validateAccess = useCallback((itemId, userPermissions = []) => {
    const item = findNavigationItem(itemId);
    if (!item) return false;

    // backend metadata.permission -> item.metadata.permission
    const requiredPermissions = item.metadata?.permission ? [item.metadata.permission] : [];

    if (requiredPermissions.length === 0) return true;

    return requiredPermissions.some(permission =>
      userPermissions.includes(permission)
    );
  }, [findNavigationItem]);

  // ---------------------------------------------------------------------------
  // HOOK RETURN
  // ---------------------------------------------------------------------------

  return {
    navigationData,
    loading,
    error,

    // computed
    breadcrumbs,
    currentSection,
    navigationStats,

    // methods
    refresh,
    findNavigationItem,
    getNavigationPath,
    validateAccess,

    // status
    lastFetch,
    retryCount,
    isFromCache: cacheEnabled && navigationCache.isValid('navigation'),

    clearCache: () => cacheEnabled && navigationCache.clear(),

    realTimeEnabled: enableRealTime,
    webSocketConnected: webSocketContext?.isConnected || false
  };
};

// =============================================================================
// ADDITIONAL HOOKS / EXPORTS
// =============================================================================

/**
 * useNavigationItem
 * small helper hook to fetch a single item and path
 */
export const useNavigationItem = (itemId) => {
  const {
    findNavigationItem,
    getNavigationPath,
    validateAccess
  } = useNavigation();

  return useMemo(() => ({
    item: findNavigationItem(itemId),
    path: getNavigationPath(itemId),
    hasAccess: (permissions) => validateAccess(itemId, permissions)
  }), [itemId, findNavigationItem, getNavigationPath, validateAccess]);
};

/**
 * useNavigationBreadcrumbs
 * convenience hook to compute breadcrumbs only
 */
export const useNavigationBreadcrumbs = (currentPath = (typeof window !== 'undefined' ? window.location.pathname : '/')) => {
  // we call useNavigation here with enableBreadcrumbs=true so the hook will
  // fetch or return cached navigationData. If you already fetch navigationData
  // elsewhere, consider using buildBreadcrumbs directly to avoid an extra fetch.
  const { navigationData } = useNavigation({ enableBreadcrumbs: true, currentPath });

  const breadcrumbs = useMemo(() => {
    return buildBreadcrumbs(navigationData, currentPath, true);
  }, [navigationData, currentPath]);

  return breadcrumbs;
};

// Export icon map and cache for external use
export { ICON_MAP, navigationCache };
