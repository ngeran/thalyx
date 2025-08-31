// frontend/src/hooks/useWebSocket.js

/**
 * useWebSocket Hook
 * 
 * React hook that provides a declarative interface to the WebSocketService.
 * Manages connection lifecycle, provides connection state, and offers
 * convenient methods for sending messages and handling events.
 * 
 * Features:
 * - Automatic connection management with component lifecycle
 * - React state integration for connection status
 * - Event subscription with automatic cleanup
 * - Message sending with queueing support
 * - Connection statistics and debugging
 * 
 * Usage:
 * ```jsx
 * import { useWebSocket } from './hooks/useWebSocket';
 * 
 * function MyComponent() {
 *   const {
 *     isConnected,
 *     connectionState,
 *     sendMessage,
 *     lastMessage,
 *     connectionStats
 *   } = useWebSocket({
 *     url: 'ws://localhost:3001/ws',
 *     topics: ['navigation'],
 *     autoConnect: true
 *   });
 * 
 *   useEffect(() => {
 *     // Handle navigation updates
 *     const unsubscribe = subscribe('navigation-updated', (data) => {
 *       console.log('Navigation updated:', data);
 *     });
 *     return unsubscribe;
 *   }, []);
 * 
 *   return (
 *     <div>
 *       <p>Status: {connectionState}</p>
 *       <button onClick={() => sendMessage({ event: 'test', data: 'hello' })}>
 *         Send Test Message
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { WebSocketService, WebSocketState } from '../services/websocketService';

// Default configuration for the WebSocket hook
const DEFAULT_HOOK_CONFIG = {
  url: 'ws://127.0.0.1:3001/ws',
  topics: ['all'],
  autoConnect: true,
  autoReconnect: true,
  debug: false,
  reconnectInterval: 1000,
  maxReconnectAttempts: 5, // Reduced from 10
  heartbeatInterval: 30000
};

/**
 * useWebSocket Hook
 * 
 * @param {Object} config - Configuration object
 * @param {string} config.url - WebSocket server URL
 * @param {string[]} config.topics - Subscription topics
 * @param {boolean} config.autoConnect - Auto connect on mount
 * @param {boolean} config.autoReconnect - Enable automatic reconnection
 * @param {boolean} config.debug - Enable debug logging
 * @param {number} config.reconnectInterval - Base reconnection interval
 * @param {number} config.maxReconnectAttempts - Maximum reconnection attempts
 * @param {number} config.heartbeatInterval - Heartbeat interval
 * @returns {Object} WebSocket hook interface
 */
export function useWebSocket(config = {}) {
  const hookConfig = { ...DEFAULT_HOOK_CONFIG, ...config };
  const wsRef = useRef(null);
  const eventHandlersRef = useRef(new Map());
  
  // React state for connection management
  const [connectionState, setConnectionState] = useState(WebSocketState.DISCONNECTED);
  const [connectionId, setConnectionId] = useState(null);
  const [lastMessage, setLastMessage] = useState(null);
  const [connectionStats, setConnectionStats] = useState(null);
  const [error, setError] = useState(null);

  // Derived states
  const isConnected = connectionState === WebSocketState.CONNECTED;
  const isConnecting = connectionState === WebSocketState.CONNECTING;
  const isReconnecting = connectionState === WebSocketState.RECONNECTING;
  const hasError = connectionState === WebSocketState.ERROR;

  /**
   * Initialize WebSocket service
   */
  const initializeWebSocket = useCallback(() => {
    if (wsRef.current) {
      // Prevent duplicate initialization if already in progress
      if (wsRef.current.state === WebSocketState.CONNECTING || 
          wsRef.current.state === WebSocketState.CONNECTED ||
          wsRef.current.state === WebSocketState.RECONNECTING) {
        console.log('WebSocket already in progress - returning existing instance');
        return wsRef.current;
      }
    }

    wsRef.current = new WebSocketService(hookConfig);
    
    // Set up core event handlers
    wsRef.current.on('state-changed', ({ newState }) => {
      setConnectionState(newState);
    });

    wsRef.current.on('connection-established', ({ connection_id }) => {
      setConnectionId(connection_id);
      setError(null);
    });

    wsRef.current.on('message', (message) => {
      setLastMessage({
        ...message,
        timestamp: new Date()
      });
    });

    wsRef.current.on('error', (errorData) => {
      setError(errorData);
    });

    wsRef.current.on('disconnected', () => {
      setConnectionId(null);
    });

    // Update stats periodically
    const statsInterval = setInterval(() => {
      if (wsRef.current) {
        setConnectionStats(wsRef.current.getStats());
      }
    }, 1000);

    // Store cleanup function
    wsRef.current._statsInterval = statsInterval;

    return wsRef.current;
  }, [hookConfig]);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    const ws = initializeWebSocket();
    
    // Additional connection state validation
    if (ws.state === WebSocketState.CONNECTING || 
        ws.state === WebSocketState.CONNECTED ||
        ws.state === WebSocketState.RECONNECTING) {
      console.log('WebSocket already in progress - skipping connect()');
      return;
    }
    
    ws.connect();
  }, [initializeWebSocket]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.disconnect();
    }
  }, []);

  /**
   * Send message to WebSocket server
   */
  const sendMessage = useCallback((message) => {
    if (wsRef.current) {
      wsRef.current.send(message);
    } else {
      console.warn('WebSocket not initialized. Call connect() first.');
    }
  }, []);

  /**
   * Subscribe to WebSocket events
   */
  const subscribe = useCallback((event, handler) => {
    const ws = initializeWebSocket();
    ws.on(event, handler);
    
    // Track handler for cleanup
    if (!eventHandlersRef.current.has(event)) {
      eventHandlersRef.current.set(event, []);
    }
    eventHandlersRef.current.get(event).push(handler);
    
    // Return unsubscribe function
    return () => {
      ws.off(event, handler);
      const handlers = eventHandlersRef.current.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }, [initializeWebSocket]);

  /**
   * Unsubscribe from WebSocket events
   */
  const unsubscribe = useCallback((event, handler) => {
    if (wsRef.current) {
      wsRef.current.off(event, handler);
    }
  }, []);

  /**
   * Get current WebSocket instance (for advanced usage)
   */
  const getWebSocketInstance = useCallback(() => {
    return wsRef.current;
  }, []);

  // Effect for auto-connection
  useEffect(() => {
    if (hookConfig.autoConnect) {
      // Add slight delay to prevent rapid connection attempts during component mounts
      const connectTimeout = setTimeout(() => {
        connect();
      }, 100);
      
      return () => clearTimeout(connectTimeout);
    }

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        // Clear stats interval
        if (wsRef.current._statsInterval) {
          clearInterval(wsRef.current._statsInterval);
        }
        
        // Clean up all event handlers
        eventHandlersRef.current.forEach((handlers, event) => {
          handlers.forEach(handler => {
            wsRef.current.off(event, handler);
          });
        });
        eventHandlersRef.current.clear();
        
        // Disconnect
        wsRef.current.disconnect();
        wsRef.current = null;
      }
    };
  }, [hookConfig.autoConnect, connect]);

  // Effect for handling page visibility changes
  useEffect(() => {
    if (!hookConfig.autoReconnect) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && hasError) {
        // Attempt to reconnect when page becomes visible after an error
        setTimeout(() => {
          if (wsRef.current && connectionState === WebSocketState.ERROR) {
            connect();
          }
        }, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hookConfig.autoReconnect, hasError, connectionState, connect]);

  return {
    // Connection state
    connectionState,
    isConnected,
    isConnecting,
    isReconnecting,
    hasError,
    connectionId,
    error,
    
    // Connection management
    connect,
    disconnect,
    
    // Message handling
    sendMessage,
    lastMessage,
    
    // Event handling
    subscribe,
    unsubscribe,
    
    // Statistics and debugging
    connectionStats,
    getWebSocketInstance,
    
    // Convenience methods
    sendCustomMessage: useCallback((event, data) => {
      sendMessage({ 
        type: 'Custom', 
        payload: { event, data } 
      });
    }, [sendMessage]),
    
    // Connection status helpers
    canSendMessages: isConnected,
    shouldShowReconnecting: isReconnecting,
    shouldShowError: hasError
  };
}

/**
 * useWebSocketEvent Hook
 * 
 * Simplified hook for subscribing to a single WebSocket event.
 * Useful for components that only need to listen to specific events.
 * 
 * @param {string} event - Event name to subscribe to
 * @param {Function} handler - Event handler function
 * @param {Object} config - WebSocket configuration
 * @returns {Object} Basic WebSocket interface
 */
export function useWebSocketEvent(event, handler, config = {}) {
  const { subscribe, isConnected, connectionState, error } = useWebSocket(config);
  
  useEffect(() => {
    if (!handler || typeof handler !== 'function') return;
    
    const unsubscribe = subscribe(event, handler);
    return unsubscribe;
  }, [event, handler, subscribe]);
  
  return {
    isConnected,
    connectionState,
    error
  };
}

/**
 * useWebSocketBroadcast Hook
 * 
 * Hook specifically for broadcasting messages to all connected clients.
 * Useful for admin interfaces or debugging tools.
 * 
 * @param {Object} config - WebSocket configuration
 * @returns {Object} Broadcast interface
 */
export function useWebSocketBroadcast(config = {}) {
  const { sendMessage, isConnected, connectionState, error } = useWebSocket(config);
  
  const broadcast = useCallback((event, data, topic = 'all') => {
    if (!isConnected) {
      console.warn('Cannot broadcast: WebSocket not connected');
      return false;
    }
    
    sendMessage({
      type: 'Custom',
      payload: {
        event: 'broadcast_request',
        data: {
          target_event: event,
          target_data: data,
          topic: topic
        }
      }
    });
    
    return true;
  }, [sendMessage, isConnected]);
  
  return {
    broadcast,
    isConnected,
    connectionState,
    error,
    canBroadcast: isConnected
  };
}
