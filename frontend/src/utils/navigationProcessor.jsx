/**
 * Navigation Processor Utilities
 * 
 * Utility functions for processing and transforming navigation data from the backend
 * into formats suitable for UI components. Includes icon mapping, component mapping,
 * and data transformation functions.
 * 
 * Dependencies:
 * - Lucide React icons
 * - React components for page rendering
 * 
 * How to Use:
 * 1. Import the required functions: processNavigationData, flattenNavigationForTopNav, getSidebarItems
 * 2. Pass raw navigation data from useNavigation hook to processNavigationData
 * 3. Use flattenNavigationForTopNav to prepare data for top navigation bar
 * 4. Use getSidebarItems to generate sidebar menu items based on active page
 * 
 * Example:
 * const processedNav = processNavigationData(rawNavigationData)
 * const topNavItems = flattenNavigationForTopNav(processedNav)
 * const sidebarItems = getSidebarItems(processedNav, activePageId)
 */

import React from "react";
import { 
  Home, Package, FileUp, BarChart3, Settings, 
  LayoutDashboard, Microscope, Cpu 
} from "lucide-react"

// =============================================================================
// COMPONENT MAPPING CONFIGURATION
// =============================================================================

/**
 * componentMap - Maps page IDs to React components
 * Extend this mapping as new page components are created
 * Placeholder components are used until actual implementations are available
 */
export const componentMap = {
  // Dashboard pages
  home: () => React.createElement('div', { className: 'p-6' }, 
    React.createElement('h2', { className: 'text-2xl font-bold mb-4' }, 'Home'),
    React.createElement('p', null, 'Home content will be displayed here.')
  ),
  dashboard: () => React.createElement('div', { className: 'p-6' }, 
    React.createElement('h2', { className: 'text-2xl font-bold mb-4' }, 'Dashboard'),
    React.createElement('p', null, 'Dashboard content will be displayed here.')
  ),
  analytics: () => React.createElement('div', { className: 'p-6' }, 
    React.createElement('h2', { className: 'text-2xl font-bold mb-4' }, 'Analytics'),
    React.createElement('p', null, 'Analytics content will be displayed here.')
  ),
  reports: () => React.createElement('div', { className: 'p-6' }, 
    React.createElement('h2', { className: 'text-2xl font-bold mb-4' }, 'Reports'),
    React.createElement('p', null, 'Reports content will be displayed here.')
  ),
  
  // Device management pages
  devices: () => React.createElement('div', { className: 'p-6' }, 
    React.createElement('h2', { className: 'text-2xl font-bold mb-4' }, 'Devices'),
    React.createElement('p', null, 'Devices content will be displayed here.')
  ),
  "device-list": () => React.createElement('div', { className: 'p-6' }, 
    React.createElement('h2', { className: 'text-2xl font-bold mb-4' }, 'All Devices'),
    React.createElement('p', null, 'Device list content will be displayed here.')
  ),
  "device-groups": () => React.createElement('div', { className: 'p-6' }, 
    React.createElement('h2', { className: 'text-2xl font-bold mb-4' }, 'Device Groups'),
    React.createElement('p', null, 'Device groups content will be displayed here.')
  ),
  "device-monitoring": () => React.createElement('div', { className: 'p-6' }, 
    React.createElement('h2', { className: 'text-2xl font-bold mb-4' }, 'Device Monitoring'),
    React.createElement('p', null, 'Device monitoring content will be displayed here.')
  ),
  
  // Lab management pages
  lab: () => React.createElement('div', { className: 'p-6' }, 
    React.createElement('h2', { className: 'text-2xl font-bold mb-4' }, 'Lab Management'),
    React.createElement('p', null, 'Lab management content will be displayed here.')
  ),
  experiments: () => React.createElement('div', { className: 'p-6' }, 
    React.createElement('h2', { className: 'text-2xl font-bold mb-4' }, 'Experiments'),
    React.createElement('p', null, 'Experiments content will be displayed here.')
  ),
  protocols: () => React.createElement('div', { className: 'p-6' }, 
    React.createElement('h2', { className: 'text-2xl font-bold mb-4' }, 'Protocols'),
    React.createElement('p', null, 'Protocols content will be displayed here.')
  ),
  samples: () => React.createElement('div', { className: 'p-6' }, 
    React.createElement('h2', { className: 'text-2xl font-bold mb-4' }, 'Samples'),
    React.createElement('p', null, 'Samples content will be displayed here.')
  ),
  
  // Settings pages
  settings: () => React.createElement('div', { className: 'p-6' }, 
    React.createElement('h2', { className: 'text-2xl font-bold mb-4' }, 'Settings'),
    React.createElement('p', null, 'Settings content will be displayed here.')
  ),
  "user-settings": () => React.createElement('div', { className: 'p-6' }, 
    React.createElement('h2', { className: 'text-2xl font-bold mb-4' }, 'User Preferences'),
    React.createElement('p', null, 'User settings content will be displayed here.')
  ),
  "system-settings": () => React.createElement('div', { className: 'p-6' }, 
    React.createElement('h2', { className: 'text-2xl font-bold mb-4' }, 'System Settings'),
    React.createElement('p', null, 'System settings content will be displayed here.')
  ),
}

// =============================================================================
// ICON MAPPING CONFIGURATION
// =============================================================================

/**
 * iconMap - Maps icon names from backend to Lucide React components
 * Provides fallback to Home icon for unknown values
 */
export const iconMap = {
  home: Home,
  dashboard: LayoutDashboard,
  device: Cpu,
  lab: Microscope,
  settings: Settings,
  chart: BarChart3,
  report: FileUp,
  // Fallback icons
  package: Package,
  fileUp: FileUp,
  barChart3: BarChart3,
}

// =============================================================================
// NAVIGATION PROCESSING FUNCTIONS
// =============================================================================

/**
 * processNavigationData - Transforms raw navigation data from backend into UI-ready format
 * @param {Object} data - Raw navigation data from backend API
 * @returns {Array} Processed navigation items with components and icons
 */
export const processNavigationData = (data) => {
  if (!data || !data.items) return []
  
  return data.items.map(item => ({
    id: item.id,
    label: item.label,
    icon: iconMap[item.icon] || Home, // Fallback to Home icon
    url: item.url,
    metadata: item.metadata,
    component: componentMap[item.id] || createFallbackComponent(item.label),
    children: item.children ? processChildItems(item.children) : null
  }))
}

/**
 * processChildItems - Processes child navigation items recursively
 * @param {Array} children - Array of child navigation items
 * @returns {Array} Processed child items
 */
const processChildItems = (children) => {
  return children.map(child => ({
    id: child.id,
    label: child.label,
    icon: iconMap[child.icon] || Home,
    url: child.url,
    metadata: child.metadata,
    component: componentMap[child.id] || createFallbackComponent(child.label),
  }))
}

/**
 * createFallbackComponent - Creates a fallback component for missing page mappings
 * @param {string} label - Page label for the fallback component
 * @returns {React.Component} Fallback React component
 */
const createFallbackComponent = (label) => {
  return () => React.createElement('div', { className: 'p-6' }, 
    React.createElement('h2', { className: 'text-2xl font-bold mb-4' }, label),
    React.createElement('p', null, `${label} content will be displayed here.`)
  )
}

/**
 * flattenNavigationForTopNav - Flattens hierarchical navigation for top navigation bar
 * @param {Array} navigationData - Processed navigation data
 * @returns {Array} Flat array of navigation items for top nav
 */
export const flattenNavigationForTopNav = (navigationData) => {
  if (!navigationData) return []
  
  return navigationData.reduce((flattened, item) => {
    // Add the main navigation item
    flattened.push({
      id: item.id,
      label: item.label,
      icon: item.icon,
      component: item.component,
      isParent: true
    })
    
    // Add children items with parent reference
    if (item.children) {
      item.children.forEach(child => {
        flattened.push({
          id: child.id,
          label: child.label,
          icon: child.icon,
          component: child.component,
          parentId: item.id,
          isChild: true
        })
      })
    }
    
    return flattened
  }, [])
}

/**
 * getSidebarItems - Generates sidebar menu items based on active page context
 * @param {Array} navigationData - Processed navigation data
 * @param {string} activePageId - ID of the currently active page
 * @returns {Array} Array of sidebar item objects
 */
export const getSidebarItems = (navigationData, activePageId) => {
  if (!navigationData) return getDefaultSidebarItems()
  
  // Check if active page is a child item and find its parent
  const parentItem = navigationData.find(item => 
    item.children && item.children.some(child => child.id === activePageId)
  )
  
  // Return child items if active page is a child of a parent item
  if (parentItem && parentItem.children) {
    return parentItem.children.map(child => ({
      icon: child.icon,
      label: child.label,
      action: () => console.log(`Navigating to ${child.label}`),
      id: child.id
    }))
  }
  
  // Return default sidebar items for top-level pages without children
  return getDefaultSidebarItems()
}

/**
 * getDefaultSidebarItems - Provides default sidebar items for pages without specific sidebar content
 * @returns {Array} Default sidebar items array
 */
const getDefaultSidebarItems = () => {
  return [
    { icon: Home, label: "Overview", action: () => console.log("Overview") },
    { icon: BarChart3, label: "Analytics", action: () => console.log("Analytics") },
    { icon: Settings, label: "Quick Settings", action: () => console.log("Quick Settings") },
  ]
}
