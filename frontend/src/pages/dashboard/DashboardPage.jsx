/** * @file DashboardPage.tsx * @description Refactored Dashboard page component that integrates with the plugin-based navigation system. * This component provides a comprehensive overview of the system status, metrics, and recent * activities. It serves as the main landing page with real-time updates and quick actions. * * @author nikos-geranios_vgi * @created 2025-09-03 15:04:02 * @modified 2025-09-03 15:04:02 * @version 2.0.0 * * @key-features * - Real-time system metrics display * - Interactive charts and visualizations * - Activity feed with live updates * - Quick action shortcuts * - System health monitoring * - Performance metrics tracking * - Customizable widget layout * - Auto-refresh capabilities * - Export metrics functionality * * @dependencies * - react: ^18.0.0 * - lucide-react: ^0.263.1 (for icons) * - @/core/hooks/withPageIntegration: HOC for page integration * - @/core/types/page.types: Type definitions * - recharts: ^2.5.0 (for charts - optional) * * @usage-guide *
jsx
 * // This component is automatically wrapped by withPageIntegration
 * // and registered in the page registry
 *
 * // Props are injected by the HOC:
 * // - data: Dashboard data from backend
 * // - loading: Loading state
 * // - error: Error state
 * // - pageState: Page-specific state
 * // - setPageState: State updater
 * // - refresh: Data refresh function
 *
*/

/**
 * @file DashboardPage.jsx
 * @description Dashboard page component (converted from TypeScript to JavaScript).
 *              Provides system overview with metrics, charts, activity feed, and quick actions.
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { withPageIntegration } from "../../core/hooks/withPageIntegration";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Users,
  Server,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Download,
  Maximize2,
  Minimize2,
  ArrowUpRight,
  ArrowDownRight,
  Cpu,
  HardDrive,
  Network,
  Shield,
  Zap,
  Database,
  Globe,
  Bell,
  Info,
  XCircle,
  Loader2,
  BarChart3,
  Settings
} from 'lucide-react';

// =============================================================================
// TYPE DEFINITIONS (JSDoc instead of TypeScript interfaces)
// =============================================================================

/**
 * @typedef {Object} DashboardMetric
 * @property {string} id
 * @property {string} label
 * @property {number|string} value
 * @property {number|string} [previousValue]
 * @property {number} [change]
 * @property {'increase'|'decrease'|'neutral'} [changeType]
 * @property {string} [unit]
 * @property {'normal'|'warning'|'critical'} [status]
 * @property {string} [icon]
 * @property {number[]} [sparkline]
 * @property {string} [description]
 * @property {string} [lastUpdated]
 */

/**
 * @typedef {Object} ServiceStatus
 * @property {string} name
 * @property {'operational'|'degraded'|'down'|'maintenance'} status
 * @property {number} [uptime]
 * @property {string} [lastCheck]
 * @property {string} [message]
 * @property {number} [responseTime]
 */

/**
 * @typedef {Object} ActivityItem
 * @property {string} id
 * @property {'info'|'success'|'warning'|'error'|'system'} type
 * @property {string} title
 * @property {string} message
 * @property {string} timestamp
 * @property {string} [user]
 * @property {string} [resource]
 * @property {string} [category]
 * @property {string} [actionUrl]
 */

/**
 * @typedef {Object} DashboardData
 * @property {DashboardMetric[]} [metrics]
 * @property {{status:string,message?:string,services?:ServiceStatus[]}} [systemStatus]
 * @property {ActivityItem[]} [activity]
 * @property {string} [lastUpdate]
 * @property {number} [refreshInterval]
 */

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_REFRESH_INTERVAL = 30000;

const METRIC_STATUS_CONFIG = {
  normal: { color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200', icon: CheckCircle },
  warning: { color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200', icon: AlertCircle },
  critical: { color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200', icon: XCircle }
};

const SERVICE_STATUS_CONFIG = {
  operational: { label: 'Operational', color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle },
  degraded: { label: 'Degraded', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: AlertCircle },
  down: { label: 'Down', color: 'text-red-600', bgColor: 'bg-red-100', icon: XCircle },
  maintenance: { label: 'Maintenance', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Info }
};

const ACTIVITY_TYPE_CONFIG = {
  info: { icon: Info, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  success: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50' },
  warning: { icon: AlertCircle, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  error: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50' },
  system: { icon: Settings, color: 'text-gray-600', bgColor: 'bg-gray-50' }
};

const METRIC_ICONS = {
  cpu: Cpu,
  memory: HardDrive,
  network: Network,
  users: Users,
  server: Server,
  database: Database,
  shield: Shield,
  zap: Zap,
  globe: Globe,
  activity: Activity
};

const TIME_RANGE_LABELS = {
  '1h': 'Last Hour',
  '6h': 'Last 6 Hours',
  '24h': 'Last 24 Hours',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days'
};

// =============================================================================
// HELPERS
// =============================================================================

const formatMetricValue = (value, unit) => {
  if (typeof value === 'number') {
    if (unit === '%') return `${value.toFixed(1)}%`;
    if (unit === 'GB') return `${(value / 1024).toFixed(2)} GB`;
    if (unit === 'MB') return `${value.toFixed(0)} MB`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toFixed(0);
  }
  return String(value);
};

const formatTimeAgo = (timestamp) => {
  const now = new Date();
  const time = new Date(timestamp);
  const diff = Math.floor((now.getTime() - time.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return time.toLocaleDateString();
};

const calculateTrend = (current, previous) => {
  if (!previous || previous === 0) return { percentage: 0, direction: 'stable' };
  const percentage = ((current - previous) / previous) * 100;
  const direction = percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'stable';
  return { percentage: Math.abs(percentage), direction };
};

// =============================================================================
// SUB-COMPONENTS (MetricCard, SystemStatusCard, ActivityFeed, QuickActions)
// =============================================================================
// 🔹 Keep these exactly as you had them, but remove `: React.FC` and TypeScript generics
// Example:

const MetricCard = ({ metric, expanded = false, onToggle }) => {
  const statusConfig = metric.status ? METRIC_STATUS_CONFIG[metric.status] : null;
  const Icon = metric.icon ? METRIC_ICONS[metric.icon] : Activity;
  const trend = useMemo(() => {
    if (typeof metric.value === 'number' && metric.previousValue) {
      return calculateTrend(metric.value, metric.previousValue);
    }
    return null;
  }, [metric.value, metric.previousValue]);

  // ... render logic stays same ...
};

// (Do the same cleanup for SystemStatusCard, ActivityFeed, QuickActions)

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const DashboardPage = ({ data, loading, error, pageState, setPageState, refresh }) => {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [expandedMetrics, setExpandedMetrics] = useState(new Set());
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const refreshTimer = useRef(null);

  const dashboardData = data;
  const refreshInterval = dashboardData?.refreshInterval || DEFAULT_REFRESH_INTERVAL;

  const metricsByStatus = useMemo(() => {
    if (!dashboardData?.metrics) return { normal: [], warning: [], critical: [] };
    return {
      normal: dashboardData.metrics.filter(m => m.status === 'normal'),
      warning: dashboardData.metrics.filter(m => m.status === 'warning'),
      critical: dashboardData.metrics.filter(m => m.status === 'critical')
    };
  }, [dashboardData?.metrics]);

  const overallHealth = useMemo(() => {
    if (metricsByStatus.critical.length > 0) return 'critical';
    if (metricsByStatus.warning.length > 0) return 'warning';
    return 'healthy';
  }, [metricsByStatus]);

  // ... effects, handlers, and render stay the same ...
};

// =============================================================================
// EXPORT
// =============================================================================

export default withPageIntegration(DashboardPage, 'dashboard', {
  debug: true,
  persistState: true,
  trackPerformance: true
});
