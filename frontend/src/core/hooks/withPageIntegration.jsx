/**
 * @file withPageIntegration.jsx
 * @description Higher-order component that integrates page components with the navigation system.
 *              This HOC provides all necessary props and functionality to pages, including data,
 *              state management, and navigation integration.
 *
 * @key-features
 * - Automatic prop injection for page components
 * - Page state management integration
 * - Navigation context connection
 * - Error boundary integration
 * - Performance optimization with memoization
 *
 * @dependencies
 * - react: ^18.0.0
 * - @/core/contexts/NavigationContext: Navigation context
 *
 * @usage-guide
 * ```jsx
 * import { withPageIntegration } from '@/core/hooks/withPageIntegration';
 *
 * // Define your page component
 * const MyPage = ({ data, loading, error, pageState, setPageState }) => {
 *   return <div>Page content</div>;
 * };
 *
 * // Export with HOC
 * export default withPageIntegration(MyPage, 'mypage');
 * ```
 */

import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigation } from '../contexts/NavigationContext';

// =============================================================================
// ERROR BOUNDARY COMPONENT
// =============================================================================

class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`❌ [PageErrorBoundary] Error in page "${this.props.pageId}":`, error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="flex items-center justify-center h-full p-6">
          <div className="text-center max-w-md bg-card rounded-lg border border-destructive p-6">
            <h2 className="text-xl font-semibold mb-2 text-destructive">Page Error</h2>
            <p className="text-muted-foreground mb-4">An error occurred while rendering this page.</p>
            <details className="text-left text-sm text-muted-foreground">
              <summary className="cursor-pointer">Error Details</summary>
              <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
                {this.state.error.toString()}
              </pre>
            </details>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// =============================================================================
// PERFORMANCE MONITOR
// =============================================================================

const usePerformanceMonitor = (pageId, enabled = false) => {
  useEffect(() => {
    if (!enabled) return;

    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.log(`⏱️ [Performance] Page "${pageId}" rendered in ${duration.toFixed(2)}ms`);
    };
  }, [pageId, enabled]);
};

// =============================================================================
// HIGHER-ORDER COMPONENT
// =============================================================================

export function withPageIntegration(
  Component,
  pageId,
  options = {}
) {
  // ---------------------------------------------------------------------------
  // VALIDATION
  // ---------------------------------------------------------------------------

  if (!Component) {
    throw new Error('withPageIntegration: Component is required');
  }

  if (!pageId) {
    throw new Error('withPageIntegration: pageId is required');
  }

  // ---------------------------------------------------------------------------
  // ENHANCED COMPONENT
  // ---------------------------------------------------------------------------

  const IntegratedPage = (props) => {
    const {
      debug = false,
      errorFallback,
      loadingComponent,
      persistState = true,
      trackPerformance = false
    } = options;

    // -------------------------------------------------------------------------
    // HOOKS
    // -------------------------------------------------------------------------

    const {
      pageData,
      pageLoading,
      pageError,
      getPageState,
      setPageState,
      refreshPageData,
      setActiveSidebarItem,
      activePageId,
      activeSidebarItem
    } = useNavigation();

    usePerformanceMonitor(pageId, trackPerformance);

    // -------------------------------------------------------------------------
    // STATE MANAGEMENT
    // -------------------------------------------------------------------------

    const pageState = useMemo(() => {
      return getPageState(pageId);
    }, [getPageState, pageId]);

    const handleSetPageState = useCallback((state) => {
      setPageState(pageId, state);
      if (debug) {
        console.log(`📝 [withPageIntegration] State updated for "${pageId}":`, state);
      }
    }, [setPageState, pageId, debug]);

    const handleItemChange = useCallback((itemId) => {
      setActiveSidebarItem(itemId);
      if (debug) {
        console.log(`👆 [withPageIntegration] Item selected for "${pageId}":`, itemId);
      }
    }, [setActiveSidebarItem, debug, pageId]);

    // -------------------------------------------------------------------------
    // LIFECYCLE
    // -------------------------------------------------------------------------

    useEffect(() => {
      if (debug) {
        console.log(`🚀 [withPageIntegration] Mounting page: ${pageId}`);
      }

      if (!persistState) {
        handleSetPageState({});
      }

      return () => {
        if (debug) {
          console.log(`🔚 [withPageIntegration] Unmounting page: ${pageId}`);
        }

        if (!persistState) {
          handleSetPageState({});
        }
      };
    }, [pageId, persistState, debug, handleSetPageState]);

    const isActive = useMemo(() => {
      return activePageId === pageId;
    }, [activePageId, pageId]);

    // -------------------------------------------------------------------------
    // COMPUTED PROPS
    // -------------------------------------------------------------------------

    const componentProps = useMemo(() => ({
      ...props,
      data: pageData,
      loading: pageLoading,
      error: pageError,
      pageState,
      setPageState: handleSetPageState,
      refresh: refreshPageData,
      activeItem: pageState.selectedItem || activeSidebarItem,
      onItemChange: handleItemChange,
      isActive,
      pageId
    }), [
      props,
      pageData,
      pageLoading,
      pageError,
      pageState,
      handleSetPageState,
      refreshPageData,
      activeSidebarItem,
      handleItemChange,
      isActive,
      pageId
    ]);

    // -------------------------------------------------------------------------
    // RENDER
    // -------------------------------------------------------------------------

    if (pageLoading && loadingComponent) {
      const LoadingComponent = loadingComponent;
      return <LoadingComponent />;
    }

    if (pageError && errorFallback) {
      const ErrorComponent = errorFallback;
      return (
        <ErrorComponent
          error={pageError}
          retry={refreshPageData}
        />
      );
    }

    return (
      <PageErrorBoundary
        pageId={pageId}
        onError={(error, errorInfo) => {
          if (debug) {
            console.error(`❌ [withPageIntegration] Error in "${pageId}":`, error, errorInfo);
          }
        }}
      >
        <Component {...componentProps} />
      </PageErrorBoundary>
    );
  };

  // ---------------------------------------------------------------------------
  // COMPONENT CONFIGURATION
  // ---------------------------------------------------------------------------

  IntegratedPage.displayName = `withPageIntegration(${
    Component.displayName || Component.name || 'Component'
  })`;

  return IntegratedPage;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function createPageComponent({
  pageId,
  component,
  options = {}
}) {
  return withPageIntegration(component, pageId, options);
}

export function usePageIntegration(pageId) {
  const {
    pageData,
    pageLoading,
    pageError,
    getPageState,
    setPageState,
    refreshPageData,
    setActiveSidebarItem
  } = useNavigation();

  const state = getPageState(pageId);

  return {
    data: pageData,
    loading: pageLoading,
    error: pageError,
    state,
    setState: (newState) => setPageState(pageId, newState),
    refresh: refreshPageData,
    selectItem: setActiveSidebarItem
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default withPageIntegration;
export {
  PageErrorBoundary,
  usePerformanceMonitor
};
