/**
 * @file settings.config.js
 * @description Configuration for the Settings page module.
 *              Handles settings navigation and section management.
 *
 * @key-features
 * - Settings navigation data fetching
 * - Direct navigation transformation (pass-through)
 * - Support for nested settings sections
 *
 * @dependencies
 * - @/pages/settings/SettingsPage: Settings page component
 *
 * @usage-guide
 * ```javascript
 * // Register in main application
 * import { settingsConfig } from '@/pages/settings/settings.config';
 * pageRegistry.register(settingsConfig);
 * ```
 */

import { Settings, User, Shield, Bell, Palette, Database } from 'lucide-react';
import SettingsPage from './SettingsPage';

// Icon mapping for settings sections
const SETTINGS_ICONS = {
  profile: User,
  security: Shield,
  notifications: Bell,
  appearance: Palette,
  database: Database,
  default: Settings
};

export const settingsConfig = {
  id: 'settings',
  component: SettingsPage,

  // Fetch settings navigation structure
  fetchData: async () => {
    const response = await fetch('/api/navigation/settings');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.navigation || data;
  },

  // Settings navigation is already in correct format, just enhance with icons
  transformNavigation: (data) => {
    if (!Array.isArray(data)) return [];

    return data.map(section => ({
      ...section,
      icon: SETTINGS_ICONS[section.id] || SETTINGS_ICONS.default,
      children: section.children?.map(child => ({
        ...child,
        icon: SETTINGS_ICONS[child.id] || SETTINGS_ICONS.default
      }))
    }));
  },

  options: {
    requiresAuth: true,
    showInNavigation: true,
    navigationLabel: 'Settings',
    navigationIcon: Settings,
    navigationOrder: 99, // Last in navigation
    preloadData: false,
    cacheData: true,
    cacheDuration: 15 * 60 * 1000, // 15 minutes
    breadcrumb: true,
    layout: 'full',
    isSettingsContext: true
  },

  // Lifecycle hooks
  onMount: () => {
    console.log('🚀 Settings page mounted');
  },

  onUnmount: () => {
    console.log('🔚 Settings page unmounted');
  },

  onAfterFetch: (data) => {
    console.log('✅ Settings navigation loaded:', {
      sections: data.length,
      totalItems: data.reduce((acc, section) => acc + (section.children?.length || 0), 0)
    });
  },

  onFetchError: (error) => {
    console.error('❌ Settings navigation fetch failed:', error);
  }
};

export default settingsConfig;
