/**
 * @file NavigationContext.jsx
 * @description Global navigation state management context that handles page data fetching,
 *              sidebar navigation updates, and page state management. This context serves as
 *              the central hub for all navigation-related operations in the application.
 *
 * @key-features
 * - Centralized navigation state management
 * - Automatic data fetching for pages
 * - Sidebar navigation transformation
 * - Page state persistence
 * - Data caching with configurable TTL
 * - URL synchronization
 * - Page lifecycle management
 *
 * @dependencies
 * - react: ^18.0.0
 * - react-router-dom: ^6.0.0
 * - @/hooks/useApiData: Custom API data hook
 * - @/core/registry/PageRegistry: Page registry
 * - @/core/types/page.types: Type definitions
 *
 * @usage-guide
 * ```jsx
 * // Wrap your app with the provider
 * import { NavigationProvider } from '@/core/contexts/NavigationContext';
 *
 * function App() {
 *   return (
 *     <NavigationProvider>
 *       <YourAppContent />
 *     </NavigationProvider>
 *   );
 * }
 *
 * // Use the context in components
 * import { useNavigation } from '@/core/contexts/NavigationContext';
 *
 * function MyComponent() {
 *   const {
 *     activePageId,
 *     navigateToPage,
 *     pageData,
 *     sidebarItems
 *   } = useNavigation();
 *
 *   return <div>Current page: {activePageId}</div>;
 * }
 * ```
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApiData } from '../../hooks/useApiData';
import { pageRegistry } from '../registry/PageRegistry';

// =============================================================================
// NAVIGATION PROVIDER COMPONENT
// =============================================================================

export const NavigationProvider = ({
  children,
  initialPageId = 'dashboard',
  debug = false,
  globalCacheDuration = 5 * 60 * 1000 // 5 minutes default
}) => {
  // ---------------------------------------------------------------------------
  // HOOKS
  // ---------------------------------------------------------------------------

  const location = useLocation();
  const navigate = useNavigate();

  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------

  const [activePageId, setActivePageId] = useState(initialPageId);
  const [sidebarItems, setSidebarItems] = useState([]);
  const [pageStates, setPageStates] = useState({});
  const [activeSidebarItem, setActiveSidebarItem] = useState(null);

  // ---------------------------------------------------------------------------
  // REFS
  // ---------------------------------------------------------------------------

  const dataCache = useRef(new Map());
  const abortControllers = useRef(new Map());
  const previousPageId = useRef(null);

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------

  const currentPage = useMemo(() => {
    const config = pageRegistry.getPage(activePageId);
    if (debug && !config) {
      console.warn(`⚠️ [NavigationContext] No configuration found for page: ${activePageId}`);
    }
    return config;
  }, [activePageId, debug]);

  const shouldFetchData = useMemo(() => {
    if (!currentPage?.fetchData) {
      if (debug) {
        console.log(`ℹ️ [NavigationContext] Page "${activePageId}" has no data fetcher`);
      }
      return false;
    }

    if (currentPage.options?.cacheData) {
      const cached = dataCache.current.get(activePageId);
      if (cached) {
        const cacheDuration = currentPage.options.cacheDuration || globalCacheDuration;
        const isCacheValid = Date.now() - cached.timestamp < cacheDuration;
        if (isCacheValid) {
          if (debug) {
            console.log(`✅ [NavigationContext] Using cached data for "${activePageId}"`);
          }
          return false;
        }
      }
    }

    return true;
  }, [currentPage, activePageId, globalCacheDuration, debug]);

  // ---------------------------------------------------------------------------
  // DATA FETCHING
  // ---------------------------------------------------------------------------

  const {
    data: pageData,
    loading: pageLoading,
    error: pageError,
    refresh: refreshPageData
  } = useApiData(
    `page-${activePageId}`,
    currentPage?.fetchData || (() => Promise.resolve(null)),
    {
      enabled: shouldFetchData,
      debug,
      onSuccess: (data) => {
        if (currentPage?.options?.cacheData) {
          dataCache.current.set(activePageId, {
            data,
            timestamp: Date.now(),
            pageId: activePageId
          });
          if (debug) {
            console.log(`💾 [NavigationContext] Cached data for "${activePageId}"`);
          }
        }

        if (currentPage?.onAfterFetch) {
          try {
            currentPage.onAfterFetch(data);
          } catch (error) {
            console.error(`❌ [NavigationContext] Error in onAfterFetch for "${activePageId}":`, error);
          }
        }
      },
      onError: (error) => {
        if (currentPage?.onFetchError) {
          try {
            currentPage.onFetchError(error);
          } catch (err) {
            console.error(`❌ [NavigationContext] Error in onFetchError for "${activePageId}":`, err);
          }
        }
      }
    }
  );

  const effectivePageData = useMemo(() => {
    if (!shouldFetchData && currentPage?.options?.cacheData) {
      const cached = dataCache.current.get(activePageId);
      if (cached) {
        if (debug) {
          console.log(`📦 [NavigationContext] Returning cached data for "${activePageId}"`);
        }
        return cached.data;
      }
    }
    return pageData;
  }, [pageData, shouldFetchData, activePageId, currentPage, debug]);

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (currentPage?.transformNavigation && effectivePageData) {
      try {
        const navigation = currentPage.transformNavigation(effectivePageData);
        setSidebarItems(navigation);
        if (debug) {
          console.log(`📊 [NavigationContext] Navigation updated for "${activePageId}": ${navigation.length} items`);
        }
      } catch (error) {
        console.error('❌ [NavigationContext] Error transforming navigation:', error);
        setSidebarItems([]);
      }
    } else if (!currentPage?.transformNavigation) {
      setSidebarItems([]);
      if (debug) {
        console.log(`🧹 [NavigationContext] Cleared navigation for "${activePageId}"`);
      }
    }
  }, [currentPage, effectivePageData, activePageId, debug]);

  useEffect(() => {
    const path = location.pathname.slice(1) || initialPageId;
    const segments = path.split('/');
    const pageId = segments[0];

    if (pageRegistry.hasPage(pageId) && pageId !== activePageId) {
      if (debug) {
        console.log(`🔗 [NavigationContext] URL sync: navigating to "${pageId}"`);
      }
      setActivePageId(pageId);
    }
  }, [location.pathname, initialPageId, activePageId, debug]);

  useEffect(() => {
    if (currentPage?.onMount) {
      if (debug) {
        console.log(`🚀 [NavigationContext] Mounting page: ${activePageId}`);
      }
      try {
        currentPage.onMount();
      } catch (error) {
        console.error(`❌ [NavigationContext] Error in onMount for "${activePageId}":`, error);
      }
    }

    return () => {
      if (previousPageId.current) {
        const prevConfig = pageRegistry.getPage(previousPageId.current);
        if (prevConfig?.onUnmount) {
          if (debug) {
            console.log(`🔚 [NavigationContext] Unmounting page: ${previousPageId.current}`);
          }
          try {
            prevConfig.onUnmount();
          } catch (error) {
            console.error(`❌ [NavigationContext] Error in onUnmount for "${previousPageId.current}":`, error);
          }
        }
      }
      previousPageId.current = activePageId;
    };
  }, [currentPage, activePageId, debug]);

  // ---------------------------------------------------------------------------
  // ACTIONS
  // ---------------------------------------------------------------------------

  const setPageState = useCallback((pageId, state) => {
    setPageStates(prev => ({
      ...prev,
      [pageId]: { ...prev[pageId], ...state }
    }));
    if (debug) {
      console.log(`📝 [NavigationContext] Updated state for "${pageId}":`, state);
    }
  }, [debug]);

  const getPageState = useCallback((pageId) => {
    return pageStates[pageId] || {};
  }, [pageStates]);

  const navigateToPage = useCallback((pageId) => {
    if (!pageRegistry.hasPage(pageId)) {
      console.warn(`⚠️ [NavigationContext] Page "${pageId}" is not registered`);
      return;
    }

    const currentController = abortControllers.current.get(activePageId);
    if (currentController) {
      currentController.abort();
      abortControllers.current.delete(activePageId);
    }

    if (debug) {
      console.log(`🧭 [NavigationContext] Navigating to page: ${pageId}`);
    }

    navigate(`/${pageId}`);
    setActivePageId(pageId);
    setActiveSidebarItem(null);
  }, [navigate, activePageId, debug]);

  const handleSetActiveSidebarItem = useCallback((itemId) => {
    setActiveSidebarItem(itemId);
    setPageState(activePageId, {
      ...getPageState(activePageId),
      selectedItem: itemId
    });
    if (debug) {
      console.log(`👆 [NavigationContext] Selected sidebar item: ${itemId}`);
    }
  }, [activePageId, setPageState, getPageState, debug]);

  const clearCache = useCallback((pageId) => {
    if (pageId) {
      dataCache.current.delete(pageId);
      if (debug) {
        console.log(`🧹 [NavigationContext] Cleared cache for: ${pageId}`);
      }
    } else {
      dataCache.current.clear();
      if (debug) {
        console.log(`🧹 [NavigationContext] Cleared all cache`);
      }
    }
  }, [debug]);

  const prefetchPage = useCallback(async (pageId) => {
    const config = pageRegistry.getPage(pageId);
    if (!config?.fetchData) {
      if (debug) {
        console.log(`ℹ️ [NavigationContext] No data to prefetch for: ${pageId}`);
      }
      return;
    }

    if (config.options?.cacheData) {
      const cached = dataCache.current.get(pageId);
      if (cached) {
        const cacheDuration = config.options.cacheDuration || globalCacheDuration;
        if (Date.now() - cached.timestamp < cacheDuration) {
          if (debug) {
            console.log(`✅ [NavigationContext] Page already cached: ${pageId}`);
          }
          return;
        }
      }
    }

    try {
      if (debug) {
        console.log(`🔄 [NavigationContext] Prefetching: ${pageId}`);
      }

      const controller = new AbortController();
      abortControllers.current.set(pageId, controller);

      const data = await config.fetchData(controller.signal);

      if (config.options?.cacheData) {
        dataCache.current.set(pageId, {
          data,
          timestamp: Date.now(),
          pageId
        });
      }

      if (debug) {
        console.log(`✅ [NavigationContext] Prefetched: ${pageId}`);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error(`❌ [NavigationContext] Prefetch failed for "${pageId}":`, error);
      }
    } finally {
      abortControllers.current.delete(pageId);
    }
  }, [globalCacheDuration, debug]);

  // ---------------------------------------------------------------------------
  // CONTEXT VALUE
  // ---------------------------------------------------------------------------

  const value = {
    // State
    activePageId,
    sidebarItems,
    pageData: effectivePageData,
    pageLoading,
    pageError,
    pageStates,
    activeSidebarItem,

    // Actions
    navigateToPage,
    setPageState,
    getPageState,
    refreshPageData,
    setActiveSidebarItem: handleSetActiveSidebarItem,
    clearCache,
    prefetchPage,

    // Registry access
    registry: pageRegistry
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

// =============================================================================
// CONTEXT HOOK
// =============================================================================

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
};

export const useCurrentPage = () => {
  const { activePageId, registry } = useNavigation();
  return registry.getPage(activePageId);
};

export const usePageState = (pageId) => {
  const { activePageId, getPageState, setPageState } = useNavigation();
  const targetPageId = pageId || activePageId;

  const state = getPageState(targetPageId);
  const setState = useCallback(
    (newState) => setPageState(targetPageId, newState),
    [targetPageId, setPageState]
  );

  return [state, setState];
};

// =============================================================================
// CONTEXT CREATION
// =============================================================================

const NavigationContext = createContext(null);
export default NavigationProvider;
