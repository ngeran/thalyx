// frontend/src/components/websocket/WebSocketStatus.jsx

/**
 * Enhanced WebSocket Status Component
 * 
 * A modern, compact WebSocket connection status indicator designed to integrate
 * seamlessly with navigation bars. Features a sleek design with subtle animations,
 * hover interactions, and optional detailed status information in a dropdown.
 * 
 * Key Features:
 * - Compact design suitable for navigation bars
 * - Real-time connection status with visual indicators
 * - Animated status transitions and pulse effects
 * - Hover dropdown with detailed information
 * - Connection controls and statistics
 * - Modern glassmorphism design aesthetics
 * - Responsive and accessible
 * 
 * Dependencies:
 * - React (useState, useEffect, useRef hooks)
 * - Lucide React icons for status indicators
 * - WebSocketContext for connection state management
 * - Tailwind CSS for styling
 * 
 * Props:
 * @param {string} variant - 'compact' | 'full' - Display variant
 * @param {boolean} showDropdown - Whether to show detailed info on hover
 * @param {boolean} showControls - Whether to show connect/disconnect buttons
 * @param {boolean} showStats - Whether to display connection statistics
 * @param {string} className - Additional CSS classes
 * 
 * Usage in Navigation Bar:
 * ```jsx
 * import WebSocketStatus from './components/websocket/WebSocketStatus';
 * 
 * function NavigationBar() {
 *   return (
 *     <nav className="flex items-center justify-between p-4">
 *       <div className="logo">MyApp</div>
 *       <div className="flex items-center space-x-4">
 *         <WebSocketStatus variant="compact" showDropdown={true} />
 *         <UserMenu />
 *       </div>
 *     </nav>
 *   );
 * }
 * ```
 * 
 * Usage as Standalone:
 * ```jsx
 * <WebSocketStatus 
 *   variant="full" 
 *   showControls={true} 
 *   showStats={true} 
 * />
 * ```
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Loader2, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Activity,
  Clock,
  MessageCircle,
  Zap,
  Signal
} from 'lucide-react';
import { useWebSocketContext } from '../../contexts/WebSocketContext';

// =============================================================================
// WEBSOCKET STATUS COMPONENT
// =============================================================================

const WebSocketStatus = ({ 
  variant = 'compact',
  showDropdown = true,
  showControls = false,
  showStats = true,
  className = ''
}) => {
  // ---------------------------------------------------------------------------
  // WEBSOCKET CONTEXT & STATE
  // ---------------------------------------------------------------------------
  
  const {
    connectionState,
    isConnected,
    isConnecting,
    isReconnecting,
    hasError,
    connectionId,
    error,
    connectionStats,
    lastMessage,
    notifications,
    connect,
    disconnect,
    debugInfo
  } = useWebSocketContext();

  // ---------------------------------------------------------------------------
  // COMPONENT STATE
  // ---------------------------------------------------------------------------
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // ---------------------------------------------------------------------------
  // OUTSIDE CLICK HANDLER
  // ---------------------------------------------------------------------------
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ---------------------------------------------------------------------------
  // STATUS CONFIGURATION
  // ---------------------------------------------------------------------------
  
  const getStatusConfig = () => {
    const configs = {
      connected: {
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        icon: CheckCircle,
        text: 'Connected',
        pulse: false,
        glowColor: 'shadow-emerald-200'
      },
      connecting: {
        color: 'text-amber-500',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        icon: Loader2,
        text: 'Connecting',
        pulse: true,
        spin: true,
        glowColor: 'shadow-amber-200'
      },
      reconnecting: {
        color: 'text-orange-500',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        icon: RefreshCw,
        text: 'Reconnecting',
        pulse: true,
        spin: true,
        glowColor: 'shadow-orange-200'
      },
      error: {
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: XCircle,
        text: 'Error',
        pulse: true,
        glowColor: 'shadow-red-200'
      },
      disconnected: {
        color: 'text-gray-400',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        icon: WifiOff,
        text: 'Disconnected',
        pulse: false,
        glowColor: 'shadow-gray-200'
      }
    };
    
    return configs[connectionState] || configs.disconnected;
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  // ---------------------------------------------------------------------------
  // CONNECTION QUALITY INDICATOR
  // ---------------------------------------------------------------------------
  
  const getConnectionQuality = () => {
    if (!isConnected || !connectionStats) return null;
    
    const { messagesReceived, messagesSent, connectedAt } = connectionStats;
    const totalMessages = (messagesReceived || 0) + (messagesSent || 0);
    const uptime = connectedAt ? Date.now() - new Date(connectedAt).getTime() : 0;
    const uptimeMinutes = Math.floor(uptime / 60000);
    
    if (totalMessages > 50 && uptimeMinutes > 10) return 'excellent';
    if (totalMessages > 20 && uptimeMinutes > 5) return 'good';
    if (totalMessages > 5) return 'fair';
    return 'new';
  };

  const connectionQuality = getConnectionQuality();

  // ---------------------------------------------------------------------------
  // COMPACT STATUS INDICATOR
  // ---------------------------------------------------------------------------
  
  const renderCompactIndicator = () => (
    <div 
      ref={buttonRef}
      className={`
        relative flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer
        transition-all duration-200 ease-in-out
        ${statusConfig.bgColor} ${statusConfig.borderColor} border
        ${statusConfig.pulse ? 'animate-pulse' : ''}
      `}
      onClick={() => showDropdown && setIsDropdownOpen(!isDropdownOpen)}
    >
      {/* Status Icon */}
      <div className={`${statusConfig.color} relative`}>
        <StatusIcon 
          className={`h-4 w-4 ${statusConfig.spin ? 'animate-spin' : ''}`} 
        />
        
        {/* Connection Quality Indicator */}
        {connectionQuality && isConnected && (
          <div 
            className={`
              absolute -top-1 -right-1 h-2 w-2 rounded-full
              ${connectionQuality === 'excellent' ? 'bg-emerald-400' :
                connectionQuality === 'good' ? 'bg-blue-400' :
                connectionQuality === 'fair' ? 'bg-yellow-400' : 'bg-gray-400'}
            `}
          />
        )}
      </div>

      {/* Status Text (hidden on very small screens) */}
      <span className={`text-sm font-medium ${statusConfig.color} hidden sm:block`}>
        {statusConfig.text}
      </span>

      {/* Message Count Badge */}
      {connectionStats && connectionStats.messagesReceived > 0 && (
        <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
          {connectionStats.messagesReceived > 99 ? '99+' : connectionStats.messagesReceived}
        </div>
      )}

      {/* Dropdown Arrow */}
      {showDropdown && (
        <div className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}>
          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      )}
    </div>
  );

  // ---------------------------------------------------------------------------
  // DETAILED DROPDOWN PANEL
  // ---------------------------------------------------------------------------
  
  const renderDropdownPanel = () => {
    if (!showDropdown || !isDropdownOpen) return null;

    return (
      <div 
        ref={dropdownRef}
        className={`
          absolute top-full mt-2 right-0 w-80 bg-white border border-gray-200 
          rounded-xl shadow-xl z-50 overflow-hidden
          transform transition-all duration-200 ease-out origin-top-right
          ${isDropdownOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
        `}
      >
        {/* Header */}
        <div className={`${statusConfig.bgColor} px-4 py-3 border-b border-gray-100`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <StatusIcon className={`h-5 w-5 ${statusConfig.color} ${statusConfig.spin ? 'animate-spin' : ''}`} />
              <div>
                <h3 className="font-semibold text-gray-900">{statusConfig.text}</h3>
                {connectionId && (
                  <p className="text-xs text-gray-500">ID: {connectionId.slice(0, 12)}...</p>
                )}
              </div>
            </div>
            
            {/* Connection Controls */}
            {showControls && (
              <div className="flex space-x-1">
                {isConnected ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      disconnect();
                    }}
                    className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                    title="Disconnect"
                  >
                    <WifiOff className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      connect();
                    }}
                    className="p-1.5 text-emerald-500 hover:bg-emerald-100 rounded-lg transition-colors"
                    title="Connect"
                  >
                    <Wifi className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {hasError && error && (
          <div className="p-4 bg-red-50 border-b border-red-100">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">Connection Error</p>
                <p className="text-xs text-red-600 mt-1">{error.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Connection Statistics */}
        {showStats && renderConnectionStats()}

        {/* Recent Activity */}
        {renderRecentActivity()}

        {/* Connection Quality */}
        {renderConnectionQuality()}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // CONNECTION STATISTICS SECTION
  // ---------------------------------------------------------------------------
  
  const renderConnectionStats = () => {
    if (!connectionStats) return null;

    const uptime = connectionStats.connectedAt 
      ? Date.now() - new Date(connectionStats.connectedAt).getTime()
      : 0;
    const uptimeString = formatUptime(uptime);

    return (
      <div className="p-4 border-b border-gray-100">
        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
          <Activity className="h-4 w-4 mr-2" />
          Connection Statistics
        </h4>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-medium">Messages</p>
                <p className="text-lg font-bold text-blue-800">
                  {(connectionStats.messagesReceived || 0) + (connectionStats.messagesSent || 0)}
                </p>
              </div>
              <MessageCircle className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 font-medium">Uptime</p>
                <p className="text-lg font-bold text-green-800">{uptimeString}</p>
              </div>
              <Clock className="h-5 w-5 text-green-500" />
            </div>
          </div>
        </div>
        
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Sent:</span>
            <span className="font-medium">{connectionStats.messagesSent || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Received:</span>
            <span className="font-medium">{connectionStats.messagesReceived || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Reconnects:</span>
            <span className="font-medium">{connectionStats.reconnectAttempts || 0}</span>
          </div>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // RECENT ACTIVITY SECTION
  // ---------------------------------------------------------------------------
  
  const renderRecentActivity = () => {
    const recentNotifications = notifications?.slice(-2) || [];
    
    if (!lastMessage && !recentNotifications.length) return null;

    return (
      <div className="p-4 border-b border-gray-100">
        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
          <Zap className="h-4 w-4 mr-2" />
          Recent Activity
        </h4>
        
        {/* Last Message */}
        {lastMessage && (
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-600">Latest Message</span>
              <span className="text-xs text-gray-400">
                {new Date(lastMessage.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className="text-sm text-gray-800">{lastMessage.type}</div>
          </div>
        )}
        
        {/* Recent Notifications */}
        {recentNotifications.map((notification) => (
          <div 
            key={notification.id}
            className={`
              p-2 rounded-lg mb-2 last:mb-0
              ${notification.level === 'error' ? 'bg-red-50 border border-red-100' :
                notification.level === 'success' ? 'bg-green-50 border border-green-100' :
                'bg-blue-50 border border-blue-100'}
            `}
          >
            <div className="flex items-center justify-between">
              <span className={`
                text-xs font-medium
                ${notification.level === 'error' ? 'text-red-700' :
                  notification.level === 'success' ? 'text-green-700' :
                  'text-blue-700'}
              `}>
                {notification.message}
              </span>
              <span className="text-xs text-gray-400">
                {notification.timestamp.toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // CONNECTION QUALITY SECTION
  // ---------------------------------------------------------------------------
  
  const renderConnectionQuality = () => {
    if (!isConnected) return null;

    const quality = getConnectionQuality();
    const qualityConfig = {
      excellent: { color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Excellent', bars: 4 },
      good: { color: 'text-blue-600', bg: 'bg-blue-100', label: 'Good', bars: 3 },
      fair: { color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Fair', bars: 2 },
      new: { color: 'text-gray-600', bg: 'bg-gray-100', label: 'New', bars: 1 }
    };

    const config = qualityConfig[quality] || qualityConfig.new;

    return (
      <div className="p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
          <Signal className="h-4 w-4 mr-2" />
          Connection Quality
        </h4>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
              {config.label}
            </div>
          </div>
          
          {/* Signal Strength Bars */}
          <div className="flex items-end space-x-1">
            {[1, 2, 3, 4].map((bar) => (
              <div
                key={bar}
                className={`
                  w-1 rounded-full transition-all duration-300
                  ${bar <= config.bars ? config.color.replace('text-', 'bg-') : 'bg-gray-200'}
                  ${bar === 1 ? 'h-2' : bar === 2 ? 'h-3' : bar === 3 ? 'h-4' : 'h-5'}
                `}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // FULL STATUS DISPLAY
  // ---------------------------------------------------------------------------
  
  const renderFullStatus = () => (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-6 w-96">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${statusConfig.bgColor}`}>
            <StatusIcon className={`h-6 w-6 ${statusConfig.color} ${statusConfig.spin ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">WebSocket Status</h2>
            <p className={`text-sm ${statusConfig.color}`}>{statusConfig.text}</p>
          </div>
        </div>
        
        {showControls && (
          <div className="flex space-x-2">
            {isConnected ? (
              <button
                onClick={disconnect}
                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={connect}
                className="px-3 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              >
                Connect
              </button>
            )}
          </div>
        )}
      </div>

      {/* Error Display */}
      {hasError && error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Connection Error</h4>
              <p className="text-sm text-red-600 mt-1">{error.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Statistics and Activity */}
      <div className="space-y-4">
        {showStats && renderConnectionStats()}
        {renderRecentActivity()}
        {renderConnectionQuality()}
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // UTILITY FUNCTIONS
  // ---------------------------------------------------------------------------
  
  function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  // ---------------------------------------------------------------------------
  // MAIN RENDER
  // ---------------------------------------------------------------------------
  
  return (
    <div className={`relative ${className}`}>
      {variant === 'compact' ? renderCompactIndicator() : renderFullStatus()}
      {variant === 'compact' && renderDropdownPanel()}
    </div>
  );
};

// =============================================================================
// EXPORT
// =============================================================================

export default WebSocketStatus;
