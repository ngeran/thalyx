/**
 * @file PageRegistry.js
 * @description Central registry for managing page plugins in the application.
 *              Singleton class that handles page registration, validation, and provides
 *              centralized access to all registered pages.
 *
 * @key-features
 * - Singleton pattern for global page management
 * - Page registration with validation
 * - Support for hot module replacement in development
 * - Page lifecycle management
 * - Statistics and debugging capabilities
 *
 * @dependencies
 * - None (pure JavaScript)
 *
 * @usage-guide
 * ```javascript
 * import { pageRegistry } from '@/core/registry/PageRegistry';
 * import { myPageConfig } from '@/pages/mypage/mypage.config';
 *
 * // Register a page
 * pageRegistry.register(myPageConfig);
 *
 * // Get a page configuration
 * const config = pageRegistry.getPage('mypage');
 * ```
 */

// =============================================================================
// CONSTANTS
// =============================================================================

const REGISTRY_EVENT_TYPES = {
  PAGE_REGISTERED: 'page-registered',
  PAGE_UNREGISTERED: 'page-unregistered',
  PAGE_UPDATED: 'page-updated',
  REGISTRY_CLEARED: 'registry-cleared',
  REGISTRY_INITIALIZED: 'registry-initialized'
};

// =============================================================================
// PAGE REGISTRY CLASS
// =============================================================================

class PageRegistry {
  // ---------------------------------------------------------------------------
  // PRIVATE PROPERTIES
  // ---------------------------------------------------------------------------

  static instance;

  constructor() {
    /** @type {Map<string, PageConfig>} Map of registered pages */
    this.pages = new Map();

    /** @type {Set<Function>} Set of event listeners */
    this.listeners = new Set();

    /** @type {boolean} Registry initialization flag */
    this.initialized = false;

    /** @type {boolean} Development mode flag */
    this.isDevelopment = process.env.NODE_ENV === 'development';

    /** @type {Object} Registry metadata */
    this.metadata = {
      createdAt: Date.now(),
      lastModified: Date.now(),
      version: '1.0.0'
    };

    if (this.isDevelopment) {
      console.log('🚀 [PageRegistry] Creating new instance');
    }
  }

  // ---------------------------------------------------------------------------
  // SINGLETON INSTANCE
  // ---------------------------------------------------------------------------

  static getInstance() {
    if (!PageRegistry.instance) {
      PageRegistry.instance = new PageRegistry();
      PageRegistry.instance.initialize();
    }
    return PageRegistry.instance;
  }

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  initialize() {
    if (this.initialized) {
      console.warn('⚠️ [PageRegistry] Already initialized');
      return;
    }

    this.initialized = true;
    this.emit({
      type: REGISTRY_EVENT_TYPES.REGISTRY_INITIALIZED,
      timestamp: Date.now(),
      data: { version: this.metadata.version }
    });

    console.log('✅ [PageRegistry] Initialized successfully');

    // Set up hot module replacement in development
    if (this.isDevelopment) {
      this.setupHotReload();
    }
  }

  setupHotReload() {
    // Check if we're in a development environment and HMR is available
    if (this.isDevelopment) {
      // Check for different HMR implementations
      const hasWebpackHMR = typeof module !== 'undefined' && module?.hot;
      const hasViteHMR = typeof import.meta !== 'undefined' && import.meta?.hot;
      
      if (hasWebpackHMR) {
        module.hot.accept();
        module.hot.dispose(() => {
          console.log('🔄 [PageRegistry] Hot reload - disposing');
          this.clear();
        });
      } else if (hasViteHMR) {
        import.meta.hot.accept();
        import.meta.hot.dispose(() => {
          console.log('🔄 [PageRegistry] Hot reload - disposing');
          this.clear();
        });
      } else {
        console.log('🔧 [PageRegistry] Hot reload available but no HMR implementation detected');
      }
    }
  }

  // ---------------------------------------------------------------------------
  // PAGE REGISTRATION
  // ---------------------------------------------------------------------------

  register(config) {
    try {
      // Validate configuration
      this.validateConfig(config);

      // Check if page already exists
      const isUpdate = this.pages.has(config.id);

      if (isUpdate && this.isDevelopment) {
        console.warn(`⚠️ [PageRegistry] Updating existing page: ${config.id}`);
      }

      // Store the configuration
      this.pages.set(config.id, config);
      this.metadata.lastModified = Date.now();

      // Emit appropriate event
      this.emit({
        type: isUpdate ? REGISTRY_EVENT_TYPES.PAGE_UPDATED : REGISTRY_EVENT_TYPES.PAGE_REGISTERED,
        pageId: config.id,
        timestamp: Date.now(),
        data: { config }
      });

      console.log(`✅ [PageRegistry] ${isUpdate ? 'Updated' : 'Registered'} page: ${config.id}`);

      return this;

    } catch (error) {
      console.error(`❌ [PageRegistry] Failed to register page: ${config.id}`, error);
      throw error;
    }
  }

  registerMultiple(configs) {
    console.log(`📦 [PageRegistry] Registering ${configs.length} pages`);

    configs.forEach(config => {
      try {
        this.register(config);
      } catch (error) {
        console.error(`❌ Failed to register page: ${config.id}`, error);
      }
    });

    return this;
  }

  // ---------------------------------------------------------------------------
  // PAGE UNREGISTRATION
  // ---------------------------------------------------------------------------

  unregister(pageId) {
    const config = this.pages.get(pageId);

    if (!config) {
      console.warn(`⚠️ [PageRegistry] Cannot unregister non-existent page: ${pageId}`);
      return false;
    }

    // Call onUnmount if defined
    if (config.onUnmount) {
      try {
        config.onUnmount();
      } catch (error) {
        console.error(`❌ [PageRegistry] Error in onUnmount for ${pageId}:`, error);
      }
    }

    // Remove from registry
    const result = this.pages.delete(pageId);

    if (result) {
      this.metadata.lastModified = Date.now();
      this.emit({
        type: REGISTRY_EVENT_TYPES.PAGE_UNREGISTERED,
        pageId,
        timestamp: Date.now()
      });
      console.log(`🗑️ [PageRegistry] Unregistered page: ${pageId}`);
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // PAGE RETRIEVAL
  // ---------------------------------------------------------------------------

  getPage(pageId) {
    return this.pages.get(pageId);
  }

  getAllPages() {
    return Array.from(this.pages.values());
  }

  getNavigationPages() {
    return this.getAllPages()
      .filter(page => page.options?.showInNavigation !== false)
      .sort((a, b) => {
        const orderA = a.options?.navigationOrder ?? 999;
        const orderB = b.options?.navigationOrder ?? 999;
        return orderA - orderB;
      });
  }

  getPagesByPermission(permissions) {
    return this.getAllPages().filter(page => {
      if (!page.options?.permissions) return true;
      return page.options.permissions.some(p => permissions.includes(p));
    });
  }

  // ---------------------------------------------------------------------------
  // PAGE QUERIES
  // ---------------------------------------------------------------------------

  hasPage(pageId) {
    return this.pages.has(pageId);
  }

  findPages(predicate) {
    return this.getAllPages().filter(predicate);
  }

  // ---------------------------------------------------------------------------
  // REGISTRY MANAGEMENT
  // ---------------------------------------------------------------------------

  clear() {
    // Call onUnmount for all pages
    this.pages.forEach((config, pageId) => {
      if (config.onUnmount) {
        try {
          config.onUnmount();
        } catch (error) {
          console.error(`❌ [PageRegistry] Error in onUnmount for ${pageId}:`, error);
        }
      }
    });

    this.pages.clear();
    this.metadata.lastModified = Date.now();

    this.emit({
      type: REGISTRY_EVENT_TYPES.REGISTRY_CLEARED,
      timestamp: Date.now()
    });

    console.log('🧹 [PageRegistry] Cleared all pages');
  }

  reset() {
    this.clear();
    this.listeners.clear();
    this.initialized = false;
    this.metadata = {
      createdAt: Date.now(),
      lastModified: Date.now(),
      version: '1.0.0'
    };
    console.log('🔄 [PageRegistry] Reset to initial state');
  }

  // ---------------------------------------------------------------------------
  // EVENT MANAGEMENT
  // ---------------------------------------------------------------------------

  subscribe(listener) {
    this.listeners.add(listener);
    console.log(`👂 [PageRegistry] Added event listener (total: ${this.listeners.size})`);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
      console.log(`🔇 [PageRegistry] Removed event listener (remaining: ${this.listeners.size})`);
    };
  }

  emit(event) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('❌ [PageRegistry] Error in event listener:', error);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // VALIDATION
  // ---------------------------------------------------------------------------

  validateConfig(config) {
    // Check required fields
    if (!config.id) {
      throw new Error('Page configuration must have an id');
    }

    if (!config.component) {
      throw new Error(`Page "${config.id}" must have a component`);
    }

    // Validate ID format (alphanumeric and hyphens only)
    if (!/^[a-z0-9-]+$/.test(config.id)) {
      throw new Error(
        `Page ID "${config.id}" must contain only lowercase letters, numbers, and hyphens`
      );
    }

    // Validate function types
    if (config.fetchData && typeof config.fetchData !== 'function') {
      throw new Error(`Page "${config.id}" fetchData must be a function`);
    }

    if (config.transformNavigation && typeof config.transformNavigation !== 'function') {
      throw new Error(`Page "${config.id}" transformNavigation must be a function`);
    }

    // Validate lifecycle hooks
    const hooks = ['onMount', 'onUnmount', 'onBeforeFetch', 'onAfterFetch', 'onFetchError'];
    hooks.forEach(hook => {
      if (config[hook] && typeof config[hook] !== 'function') {
        throw new Error(`Page "${config.id}" ${hook} must be a function`);
      }
    });

    // Validate options
    if (config.options) {
      if (config.options.navigationOrder !== undefined &&
          typeof config.options.navigationOrder !== 'number') {
        throw new Error(`Page "${config.id}" navigationOrder must be a number`);
      }

      if (config.options.cacheDuration !== undefined &&
          typeof config.options.cacheDuration !== 'number') {
        throw new Error(`Page "${config.id}" cacheDuration must be a number`);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // STATISTICS & DEBUGGING
  // ---------------------------------------------------------------------------

  getStats() {
    const pages = this.getAllPages();

    return {
      totalPages: pages.length,
      navigationPages: pages.filter(p => p.options?.showInNavigation !== false).length,
      authRequired: pages.filter(p => p.options?.requiresAuth).length,
      withDataFetching: pages.filter(p => !!p.fetchData).length,
      withNavigation: pages.filter(p => !!p.transformNavigation).length,
      pageIds: pages.map(p => p.id)
    };
  }

  getMetadata() {
    return { ...this.metadata };
  }

  exportState() {
    return {
      metadata: this.getMetadata(),
      stats: this.getStats(),
      pages: this.getAllPages().map(config => ({
        id: config.id,
        options: config.options,
        hasDataFetcher: !!config.fetchData,
        hasNavTransform: !!config.transformNavigation
      }))
    };
  }

  debug() {
    console.group('📊 [PageRegistry] Debug Information');
    console.log('Metadata:', this.getMetadata());
    console.log('Statistics:', this.getStats());
    console.table(this.exportState().pages);
    console.groupEnd();
  }
}

// =============================================================================
// EXPORT SINGLETON INSTANCE
// =============================================================================

export const pageRegistry = PageRegistry.getInstance();
export { PageRegistry };
export default pageRegistry;
