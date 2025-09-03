/**
 * @file dashboard.config.js
 * @description Configuration for the Dashboard page module.
 *              Defines data fetching, navigation transformation, and page options.
 *
 * @key-features
 * - Dashboard data fetching from API
 * - Static navigation configuration
 * - Page options and metadata
 *
 * @dependencies
 * - @/pages/dashboard/DashboardPage: Dashboard page component
 *
 * @usage-guide
 * ```javascript
 * // Register in main application
 * import { dashboardConfig } from '@/pages/dashboard/dashboard.config';
 * pageRegistry.register(dashboardConfig);
 * ```
 */

import { Home } from 'lucide-react';
import DashboardPage from './DashboardPage';

export const dashboardConfig = {
  id: 'dashboard',
  component: DashboardPage,

  // Data fetching for dashboard metrics and widgets
  fetchData: async () => {
    const response = await fetch('/api/dashboard');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },

  // Dashboard has static navigation (no dynamic transformation needed)
  transformNavigation: (data) => {
    // Dashboard typically has static navigation
    return [
      {
        id: 'dashboard-overview',
        label: 'Overview',
        icon: Home,
        type: 'page'
      },
      {
        id: 'dashboard-metrics',
        label: 'Metrics',
        icon: Home,
        type: 'page'
      },
      {
        id: 'dashboard-widgets',
        label: 'Widgets',
        icon: Home,
        type: 'page'
      }
    ];
  },

  options: {
    requiresAuth: true,
    showInNavigation: true,
    navigationLabel: 'Dashboard',
    navigationIcon: Home,
    navigationOrder: 0,
    preloadData: true,
    cacheData: true,
    cacheDuration: 30000, // 30 seconds
    breadcrumb: true,
    layout: 'default'
  },

  // Lifecycle hooks
  onMount: () => {
    console.log('🚀 Dashboard page mounted');
  },

  onUnmount: () => {
    console.log('🔚 Dashboard page unmounted');
  },

  onAfterFetch: (data) => {
    console.log('✅ Dashboard data loaded:', data);
  },

  onFetchError: (error) => {
    console.error('❌ Dashboard data fetch failed:', error);
  }
};

export default dashboardConfig;
