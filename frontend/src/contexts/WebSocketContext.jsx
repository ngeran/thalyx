// frontend/src/contexts/WebSocketContext.jsx

/**
 * WebSocket Context Provider
 * 
 * Provides application-wide WebSocket connectivity with centralized
 * connection management, event handling, and state sharing.
 * 
 * Features:
 * - Global WebSocket connection for the entire app
 * - Centralized event handling and message distribution
 * - Connection status available to all components
 * - Automatic reconnection and error handling
 * - Development tools and debugging support
 * 
 * Usage:
 * ```jsx
 * import { WebSocketProvider, useWebSocketContext } from './contexts/WebSocketContext';
 * 
 * // App.jsx
 * function App() {
 *   return (
 *     <WebSocketProvider>
 *       <MyApplication />
 *     </WebSocketProvider>
 *   );
 * }
 * 
 * // Any component
 * function MyComponent() {
 *   const { 
 *     isConnected, 
 *     sendMessage, 
 *     subscribe,
 *     navigationData 
 *   } = useWebSocketContext();
 * 
 *   useEffect(() => {
 *     const unsubscribe = subscribe('navigation-updated', (data) => {
 *       console.log('Navigation updated:', data);
 *     });
 *     return unsubscribe;
 *   }, [subscribe]);
 * 
 *   return <div>Connected: {isConnected ? 'Yes' : 'No'}</div>;
 * }
 * ```
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

// =============================================================================
// CONTEXT CREATION
// =============================================================================

const WebSocketContext = createContext(null);

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

// Action types for state management
const ActionTypes = {
  SET_NAVIGATION_DATA: 'SET_NAVIGATION_DATA',
  SET_LAST_UPDATE: 'SET_LAST_UPDATE',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  SET_FILE_CHANGES: 'SET_FILE_CHANGES',
  SET_DATA_UPDATES: 'SET_DATA_UPDATES',
  SET_CONNECTION_HISTORY: 'SET_CONNECTION_HISTORY'
};

// Initial state
const initialState = {
  navigationData: null,
  lastUpdate: null,
  notifications: [],
  fileChanges: [],
  dataUpdates: new Map(),
  connectionHistory: []
};

// State reducer
function websocketReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_NAVIGATION_DATA:
      return {
        ...state,
        navigationData: action.payload,
        lastUpdate: new Date()
      };
      
    case ActionTypes.SET_LAST_UPDATE:
      return {
        ...state,
        lastUpdate: action.payload
      };
      
    case ActionTypes.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [
          ...state.notifications,
          {
            id: Date.now() + Math.random(),
            timestamp: new Date(),
            ...action.payload
          }
        ].slice(-10) // Keep only last 10 notifications
      };
      
    case ActionTypes.REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(
          notification => notification.id !== action.payload
        )
      };
      
    case ActionTypes.SET_FILE_CHANGES:
      return {
        ...state,
        fileChanges: [
          ...state.fileChanges,
          {
            timestamp: new Date(),
            ...action.payload
          }
        ].slice(-20) // Keep only last 20 file changes
      };
      
    case ActionTypes.SET_DATA_UPDATES:
      const newDataUpdates = new Map(state.dataUpdates);
      newDataUpdates.set(action.payload.source, {
        data: action.payload.data,
        timestamp: new Date(action.payload.timestamp)
      });
      return {
        ...state,
        dataUpdates: newDataUpdates
      };
      
    case ActionTypes.SET_CONNECTION_HISTORY:
      return {
        ...state,
        connectionHistory: [
          ...state.connectionHistory,
          {
            timestamp: new Date(),
            ...action.payload
          }
        ].slice(-50) // Keep only last 50 connection events
      };
      
    default:
      return state;
  }
}

// =============================================================================
// WEBSOCKET PROVIDER COMPONENT
// =============================================================================

export function WebSocketProvider({ 
  children, 
  config = {},
  onNavigationUpdate,
  onFileChange,
  onDataUpdate,
  onConnectionChange 
}) {
  const [state, dispatch] = useReducer(websocketReducer, initialState);
  
  // Default WebSocket configuration
  const defaultConfig = {
    url: 'ws://localhost:3001/ws',
    topics: ['navigation', 'filesystem', 'all'],
    autoConnect: true,
    debug: process.env.NODE_ENV === 'development',
    ...config
  };
  
  const {
    connectionState,
    isConnected,
    isConnecting,
    isReconnecting,
    hasError,
    connectionId,
    error,
    connect,
    disconnect,
    sendMessage,
    subscribe,
    connectionStats,
    lastMessage
  } = useWebSocket(defaultConfig);

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  // Handle navigation updates
  useEffect(() => {
    const unsubscribe = subscribe('navigation-updated', (data) => {
      dispatch({
        type: ActionTypes.SET_NAVIGATION_DATA,
        payload: data.data
      });
      
      dispatch({
        type: ActionTypes.ADD_NOTIFICATION,
        payload: {
          type: 'navigation-update',
          message: `Navigation schema "${data.schema}" updated`,
          level: 'info'
        }
      });
      
      // Call external handler if provided
      onNavigationUpdate?.(data);
    });
    
    return unsubscribe;
  }, [subscribe, onNavigationUpdate]);

  // Handle schema reload events
  useEffect(() => {
    const unsubscribe = subscribe('schema-reloaded', (data) => {
      dispatch({
        type: ActionTypes.ADD_NOTIFICATION,
        payload: {
          type: 'schema-reload',
          message: `Schema "${data.schema}" reloaded`,
          level: 'success'
        }
      });
    });
    
    return unsubscribe;
  }, [subscribe]);

  // Handle file change events
  useEffect(() => {
    const unsubscribe = subscribe('file-changed', (data) => {
      dispatch({
        type: ActionTypes.SET_FILE_CHANGES,
        payload: data
      });
      
      dispatch({
        type: ActionTypes.ADD_NOTIFICATION,
        payload: {
          type: 'file-change',
          message: `File ${data.event_type}: ${data.path}`,
          level: 'info'
        }
      });
      
      // Call external handler if provided
      onFileChange?.(data);
    });
    
    return unsubscribe;
  }, [subscribe, onFileChange]);

  // Handle data updates
  useEffect(() => {
    const unsubscribe = subscribe('data-update', (data) => {
      dispatch({
        type: ActionTypes.SET_DATA_UPDATES,
        payload: data
      });
      
      // Call external handler if provided
      onDataUpdate?.(data);
    });
    
    return unsubscribe;
  }, [subscribe, onDataUpdate]);

  // Handle connection state changes
  useEffect(() => {
    dispatch({
      type: ActionTypes.SET_CONNECTION_HISTORY,
      payload: {
        state: connectionState,
        connectionId,
        error: error?.message
      }
    });
    
    // Call external handler if provided
    onConnectionChange?.(connectionState, connectionId, error);
  }, [connectionState, connectionId, error, onConnectionChange]);

  // Handle server errors
  useEffect(() => {
    const unsubscribe = subscribe('server-error', (errorData) => {
      dispatch({
        type: ActionTypes.ADD_NOTIFICATION,
        payload: {
          type: 'server-error',
          message: errorData.message,
          level: 'error'
        }
      });
    });
    
    return unsubscribe;
  }, [subscribe]);

  // ==========================================================================
  // UTILITY FUNCTIONS
  // ==========================================================================

  const addNotification = useCallback((notification) => {
    dispatch({
      type: ActionTypes.ADD_NOTIFICATION,
      payload: notification
    });
  }, []);

  const removeNotification = useCallback((id) => {
    dispatch({
      type: ActionTypes.REMOVE_NOTIFICATION,
      payload: id
    });
  }, []);

  const clearNotifications = useCallback(() => {
    dispatch({
      type: ActionTypes.SET_NAVIGATION_DATA,
      payload: { notifications: [] }
    });
  }, []);

  const getDataUpdate = useCallback((source) => {
    return state.dataUpdates.get(source) || null;
  }, [state.dataUpdates]);

  const sendCustomMessage = useCallback((event, data) => {
    sendMessage({
      type: 'Custom',
      payload: { event, data }
    });
  }, [sendMessage]);

  // ==========================================================================
  // CONTEXT VALUE
  // ==========================================================================

  const contextValue = {
    // Connection state
    connectionState,
    isConnected,
    isConnecting,
    isReconnecting,
    hasError,
    connectionId,
    error,
    connectionStats,
    lastMessage,
    
    // Connection management
    connect,
    disconnect,
    
    // Messaging
    sendMessage,
    sendCustomMessage,
    subscribe,
    
    // Application state
    navigationData: state.navigationData,
    lastUpdate: state.lastUpdate,
    notifications: state.notifications,
    fileChanges: state.fileChanges,
    dataUpdates: state.dataUpdates,
    connectionHistory: state.connectionHistory,
    
    // Utility functions
    addNotification,
    removeNotification,
    clearNotifications,
    getDataUpdate,
    
    // Development helpers
    getState: () => state,
    debugInfo: {
      config: defaultConfig,
      messageQueue: connectionStats?.messageQueueSize || 0,
      reconnectAttempts: connectionStats?.reconnectAttempts || 0
    }
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

// =============================================================================
// HOOK FOR CONSUMING CONTEXT
// =============================================================================

/**
 * Hook to consume WebSocket context
 * @returns {Object} WebSocket context value
 * @throws {Error} If used outside of WebSocketProvider
 */
export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  
  if (!context) {
    throw new Error(
      'useWebSocketContext must be used within a WebSocketProvider. ' +
      'Make sure to wrap your component tree with <WebSocketProvider>.'
    );
  }
  
  return context;
}

// =============================================================================
// SPECIALIZED HOOKS
// =============================================================================

/**
 * Hook for components that only need connection status
 */
export function useWebSocketConnection() {
  const { 
    connectionState, 
    isConnected, 
    isConnecting, 
    isReconnecting, 
    hasError, 
    error, 
    connectionId,
    connect,
    disconnect 
  } = useWebSocketContext();
  
  return {
    connectionState,
    isConnected,
    isConnecting,
    isReconnecting,
    hasError,
    error,
    connectionId,
    connect,
    disconnect
  };
}

/**
 * Hook for components that need navigation data
 */
export function useWebSocketNavigation() {
  const { 
    navigationData, 
    lastUpdate, 
    isConnected,
    subscribe 
  } = useWebSocketContext();
  
  return {
    navigationData,
    lastUpdate,
    isConnected,
    subscribe
  };
}

/**
 * Hook for components that need real-time notifications
 */
export function useWebSocketNotifications() {
  const { 
    notifications, 
    addNotification, 
    removeNotification, 
    clearNotifications 
  } = useWebSocketContext();
  
  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications
  };
}
