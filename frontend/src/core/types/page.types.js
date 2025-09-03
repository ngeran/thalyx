/**
 * @file page.types.js
 * @description Core type definitions for the plugin-based page system using JSDoc.
 *              This file documents all data structures used throughout the page
 *              registration and navigation system.
 *
 * @key-features
 * - Comprehensive JSDoc type definitions for page configuration
 * - Navigation item structure with support for nested items
 * - Page state management documentation
 * - Function signatures for data fetching and transformation
 * - Support for page metadata and custom options
 *
 * @dependencies
 * - None (pure JavaScript with JSDoc)
 *
 * @usage-guide
 * ```javascript
 * import { validatePageConfig } from '@/core/types/page.types';
 *
 * // Use JSDoc types for type hints in your IDE
 * /** @type {PageConfig} *./
 * const myPageConfig = {
 *   id: 'mypage',
 *   component: MyPageComponent,
 *   fetchData: async () => fetch('/api/mypage').then(r => r.json())
 * };
 * ```
 */

// =============================================================================
// JSDOC TYPE DEFINITIONS
// =============================================================================

/**
 * @typedef {Object} NavigationItem
 * @description Represents a single navigation item that can be displayed in the sidebar
 * @property {string} id - Unique identifier for the navigation item
 * @property {string} label - Display label for the navigation item
 * @property {Function} [icon] - Optional Lucide icon component
 * @property {'section'|'page'|'divider'} type - Type of navigation item
 * @property {NavigationItem[]} [children] - Child navigation items for sections
 * @property {string} [description] - Optional description for tooltips
 * @property {*} [metadata] - Additional metadata
 * @property {Object} [badge] - Optional badge to display
 * @property {string|number} [badge.value] - Badge content
 * @property {'default'|'primary'|'secondary'|'destructive'} [badge.variant] - Badge variant
 * @property {string} [className] - Custom CSS classes
 * @property {boolean} [disabled] - Whether this item is disabled
 * @property {Function} [onClick] - Custom action handler
 */

/**
 * @typedef {Object} PageState
 * @description Manages the state for individual pages
 * @property {string} [selectedItem] - Currently selected item in the page
 * @property {Set<string>} [expandedSections] - Set of expanded section IDs
 * @property {Object} [filters] - Active filters applied to the page data
 * @property {string} [sortBy] - Current sort configuration
 * @property {'asc'|'desc'} [sortDirection] - Sort direction
 * @property {number} [currentPage] - Current page number for paginated data
 * @property {number} [pageSize] - Number of items per page
 * @property {string} [searchQuery] - Search query string
 * @property {'grid'|'list'|'cards'|'table'} [viewMode] - View mode
 * @property {*} [*] - Any additional page-specific state
 */

/**
 * @typedef {Object} PageOptions
 * @description Configuration options that control how a page behaves
 * @property {boolean} [requiresAuth] - Whether authentication is required
 * @property {boolean} [showInNavigation] - Whether to show in main navigation
 * @property {string} [navigationLabel] - Label to display in navigation
 * @property {Function} [navigationIcon] - Icon to display in navigation
 * @property {number} [navigationOrder] - Sort order for navigation items
 * @property {boolean} [preloadData] - Whether to preload data
 * @property {boolean} [cacheData] - Whether to cache the fetched data
 * @property {number} [cacheDuration] - Cache duration in milliseconds
 * @property {string[]} [permissions] - Required permissions
 * @property {boolean} [breadcrumb] - Whether to show breadcrumb
 * @property {'default'|'full'|'compact'|'minimal'} [layout] - Layout variant
 * @property {boolean} [openInNewTab] - Whether to open in new tab
 * @property {string} [routePath] - Custom route path
 * @property {boolean} [keepAlive] - Whether to keep alive when navigating away
 * @property {'fade'|'slide'|'none'} [transition] - Transition animation
 * @property {Object} [meta] - SEO meta tags
 * @property {string} [meta.title] - Page title
 * @property {string} [meta.description] - Page description
 * @property {string[]} [meta.keywords] - SEO keywords
 */

/**
 * @typedef {Function} NavigationTransformer
 * @description Function that transforms fetched data into navigation items
 * @param {*} data - The fetched data to transform
 * @returns {NavigationItem[]} Array of navigation items
 */

/**
 * @typedef {Function} DataFetcher
 * @description Async function that fetches data from an API
 * @param {AbortSignal} [signal] - Optional AbortSignal for cancelling
 * @returns {Promise<*>} Promise resolving to the fetched data
 */

/**
 * @typedef {Object} PageComponentProps
 * @description Props interface that all page components receive
 * @property {*} data - Fetched data for the page (null while loading)
 * @property {boolean} loading - Loading state indicator
 * @property {Error|null} error - Error object if data fetching failed
 * @property {PageState} pageState - Current page state
 * @property {Function} setPageState - Function to update page state
 * @property {Function} refresh - Function to refresh/refetch page data
 * @property {string} [activeItem] - Currently active/selected item
 * @property {Function} [onItemChange] - Callback when an item is selected
 * @property {boolean} [isActive] - Whether the page is currently visible
 * @property {string[]} [permissions] - User permissions for this page
 * @property {Object} [user] - Current user information
 */

/**
 * @typedef {Object} PageConfig
 * @description Defines all aspects of a page
 * @property {string} id - Unique identifier for the page
 * @property {React.Component|Function} component - React component to render
 * @property {DataFetcher} [fetchData] - Optional function to fetch data
 * @property {NavigationTransformer} [transformNavigation] - Optional navigation transformer
 * @property {PageOptions} [options] - Configuration options
 * @property {Function} [onMount] - Lifecycle hook called when page mounts
 * @property {Function} [onUnmount] - Lifecycle hook called when page unmounts
 * @property {Function} [onBeforeFetch] - Hook called before data fetch
 * @property {Function} [onAfterFetch] - Hook called after successful fetch
 * @property {Function} [onFetchError] - Hook called on fetch error
 * @property {React.Component} [errorComponent] - Custom error component
 * @property {React.Component} [loadingComponent] - Custom loading component
 * @property {Function} [canAccess] - Validation function for access
 */

/**
 * @typedef {'page-registered'|'page-unregistered'|'page-updated'|'registry-cleared'|'registry-initialized'} RegistryEventType
 * @description Types of events that can be emitted by the page registry
 */

/**
 * @typedef {Object} RegistryEvent
 * @description Event object emitted by the page registry
 * @property {RegistryEventType} type - Type of registry event
 * @property {string} [pageId] - ID of the affected page
 * @property {number} timestamp - Timestamp when event occurred
 * @property {*} [data] - Additional event data
 */

/**
 * @typedef {Object} RegistryStats
 * @description Statistics about the current state of the page registry
 * @property {number} totalPages - Total number of registered pages
 * @property {number} navigationPages - Number of pages shown in navigation
 * @property {number} authRequired - Number of pages requiring authentication
 * @property {number} withDataFetching - Number of pages with data fetching
 * @property {number} withNavigation - Number of pages with navigation transformation
 * @property {string[]} pageIds - List of all page IDs
 */

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validates a page configuration object
 * @param {*} config - Configuration to validate
 * @returns {boolean} True if valid
 */
export function validatePageConfig(config) {
  if (!config || typeof config !== 'object') return false;
  if (!config.id || typeof config.id !== 'string') return false;
  if (!config.component) return false;
  if (config.fetchData && typeof config.fetchData !== 'function') return false;
  if (config.transformNavigation && typeof config.transformNavigation !== 'function') return false;
  return true;
}

/**
 * Validates a navigation item
 * @param {*} item - Item to validate
 * @returns {boolean} True if valid
 */
export function validateNavigationItem(item) {
  if (!item || typeof item !== 'object') return false;
  if (!item.id || typeof item.id !== 'string') return false;
  if (!item.label || typeof item.label !== 'string') return false;
  if (!['section', 'page', 'divider'].includes(item.type)) return false;
  return true;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default page options
 * @type {PageOptions}
 */
export const DEFAULT_PAGE_OPTIONS = {
  requiresAuth: true,
  showInNavigation: true,
  cacheData: false,
  cacheDuration: 5 * 60 * 1000, // 5 minutes
  breadcrumb: true,
  layout: 'default',
  keepAlive: false,
  transition: 'fade'
};

/**
 * Navigation item types
 * @readonly
 * @enum {string}
 */
export const NAVIGATION_ITEM_TYPES = {
  SECTION: 'section',
  PAGE: 'page',
  DIVIDER: 'divider'
};

/**
 * Registry event types
 * @readonly
 * @enum {string}
 */
export const REGISTRY_EVENT_TYPES = {
  PAGE_REGISTERED: 'page-registered',
  PAGE_UNREGISTERED: 'page-unregistered',
  PAGE_UPDATED: 'page-updated',
  REGISTRY_CLEARED: 'registry-cleared',
  REGISTRY_INITIALIZED: 'registry-initialized'
};
