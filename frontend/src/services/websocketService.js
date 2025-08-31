// frontend/src/services/websocketService.js

/**
 * WebSocket Service
 * 
 * Provides a robust, reusable WebSocket client with automatic reconnection,
 * message queuing, type-safe event handling, and comprehensive error management.
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Message queuing when disconnected
 * - Event-driven architecture with typed events
 * - Connection state management
 * - Heartbeat/ping-pong for connection health
 * - Subscription topic filtering
 * - Comprehensive logging and debugging
 * 
 * Usage:
 * ```javascript
 * import { WebSocketService } from './services/websocketService';
 * 
 * const ws = new WebSocketService({
 *   url: 'ws://localhost:3001/ws',
 *   topics: ['navigation', 'filesystem']
 * });
 * 
 * ws.on('navigation-updated', (data) => {
 *   console.log('Navigation updated:', data);
 * });
 * 
 * ws.connect();
 * ```
 */

// Global connection counter to prevent flooding
let globalConnectionCount = 0;
const MAX_GLOBAL_CONNECTIONS = 3;

// WebSocket connection states
export const WebSocketState = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected', 
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  RECONNECTING: 'reconnecting'
};

// Subscription topics
export const SubscriptionTopic = {
  NAVIGATION: 'navigation',
  FILESYSTEM: 'filesystem',
  ALL: 'all'
};

// Default configuration
const DEFAULT_CONFIG = {
  url: 'ws://127.0.0.1:3001/ws',
  reconnectInterval: 1000, // Start with 1 second
  maxReconnectInterval: 30000, // Max 30 seconds
  maxReconnectAttempts: 5, // Reduced from 10
  heartbeatInterval: 30000, // 30 seconds
  topics: [SubscriptionTopic.ALL],
  debug: false
};

export class WebSocketService {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ws = null;
    this.state = WebSocketState.DISCONNECTED;
    this.connectionId = null;
    this.connectedAt = null;
    this.reconnectAttempts = 0;
    this.messageQueue = [];
    this.eventHandlers = new Map();
    this.heartbeatTimer = null;
    this.reconnectTimer = null;
    this.stats = this.initializeStats();
    this.instanceId = Math.random().toString(36).substr(2, 9); // For debugging
    
    // Bind methods to ensure correct 'this' context
    this.onOpen = this.onOpen.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.onError = this.onError.bind(this);
    this.onClose = this.onClose.bind(this);
    
    this.log(`WebSocket instance created: ${this.instanceId}`);
  }

  /**
   * Initialize connection statistics
   */
  initializeStats() {
    return {
      connectionId: null,
      connectedAt: null,
      reconnectAttempts: 0,
      lastMessage: null,
      messagesSent: 0,
      messagesReceived: 0,
      totalConnections: 0
    };
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    // Global connection limit to prevent flooding
    if (globalConnectionCount >= MAX_GLOBAL_CONNECTIONS) {
      this.log('Global connection limit reached - skipping connection');
      return;
    }

    if (this.state === WebSocketState.CONNECTING || this.state === WebSocketState.CONNECTED) {
      this.log('Already connected or connecting - skipping duplicate connection');
      return;
    }
    
    // Add connection timeout
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.log('Max reconnection attempts reached - giving up');
      return;
    }

    globalConnectionCount++;
    this.setState(WebSocketState.CONNECTING);
    this.log('Connecting to WebSocket...', this.config.url);

    try {
      // Build WebSocket URL with query parameters
      const url = new URL(this.config.url);
      if (this.config.topics && this.config.topics.length > 0) {
        url.searchParams.set('topics', this.config.topics.join(','));
      }

      this.ws = new WebSocket(url.toString());
      this.ws.onopen = this.onOpen;
      this.ws.onmessage = this.onMessage;
      this.ws.onerror = this.onError;
      this.ws.onclose = this.onClose;
    } catch (error) {
      globalConnectionCount = Math.max(0, globalConnectionCount - 1);
      this.log('Failed to create WebSocket connection:', error);
      this.setState(WebSocketState.ERROR);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    this.log('Disconnecting WebSocket...');
    this.clearTimers();
    
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close(1000, 'Client disconnecting');
      }
      this.ws = null;
    }
    
    globalConnectionCount = Math.max(0, globalConnectionCount - 1);
    this.setState(WebSocketState.DISCONNECTED);
    this.connectionId = null;
    this.connectedAt = null;
  }

  /**
   * Send a message to the server
   */
  send(message) {
    const wsMessage = {
      type: message.type || 'Custom',
      payload: message.payload || message
    };

    if (this.state === WebSocketState.CONNECTED && this.ws) {
      try {
        this.ws.send(JSON.stringify(wsMessage));
        this.stats.messagesSent++;
        this.log('Sent message:', wsMessage);
      } catch (error) {
        this.log('Failed to send message:', error);
        this.queueMessage(wsMessage);
      }
    } else {
      this.log('WebSocket not connected, queuing message:', wsMessage);
      this.queueMessage(wsMessage);
    }
  }

  /**
   * Queue message for sending when connection is restored
   */
  queueMessage(message) {
    this.messageQueue.push(message);
    // Limit queue size to prevent memory issues
    if (this.messageQueue.length > 100) {
      this.messageQueue.shift(); // Remove oldest message
    }
  }

  /**
   * Send all queued messages
   */
  sendQueuedMessages() {
    if (this.messageQueue.length === 0) return;
    
    this.log(`Sending ${this.messageQueue.length} queued messages`);
    const messages = [...this.messageQueue];
    this.messageQueue = [];
    
    messages.forEach(message => {
      try {
        this.ws.send(JSON.stringify(message));
        this.stats.messagesSent++;
      } catch (error) {
        this.log('Failed to send queued message:', error);
        this.queueMessage(message); // Re-queue if failed
      }
    });
  }

  /**
   * Add event listener
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
    
    this.log(`Added event listener for: ${event}`);
  }

  /**
   * Remove event listener
   */
  off(event, handler) {
    if (!this.eventHandlers.has(event)) return;
    
    const handlers = this.eventHandlers.get(event);
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      this.log(`Removed event listener for: ${event}`);
    }
  }

  /**
   * Emit event to all listeners
   */
  emit(event, data) {
    if (!this.eventHandlers.has(event)) return;
    
    this.eventHandlers.get(event).forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        this.log(`Error in event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Get current connection statistics
   */
  getStats() {
    return {
      ...this.stats,
      state: this.state,
      messageQueueSize: this.messageQueue.length
    };
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Handle WebSocket open event
   */
  onOpen(event) {
    this.log('WebSocket connected');
    this.setState(WebSocketState.CONNECTED);
    this.connectedAt = new Date();
    this.stats.connectedAt = this.connectedAt;
    this.stats.totalConnections++;
    this.reconnectAttempts = 0;
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Send any queued messages
    this.sendQueuedMessages();
    
    // Emit connection event
    this.emit('connected', { timestamp: this.connectedAt });
  }

  /**
   * Handle WebSocket message event
   */
  onMessage(event) {
    this.stats.messagesReceived++;
    this.stats.lastMessage = new Date();
    
    try {
      const message = JSON.parse(event.data);
      this.log('Received message:', message);
      
      // Handle specific message types
      this.handleMessage(message);
      
      // Emit generic message event
      this.emit('message', message);
    } catch (error) {
      this.log('Failed to parse WebSocket message:', error);
      this.emit('error', { type: 'parse_error', message: error.message });
    }
  }

  /**
   * Handle WebSocket error event
   */
  onError(event) {
    this.log('WebSocket error:', event);
    this.setState(WebSocketState.ERROR);
    this.emit('error', { type: 'connection_error', event });
  }

  /**
   * Handle WebSocket close event
   */
  onClose(event) {
    this.log('WebSocket closed:', event.code, event.reason);
    this.clearTimers();
    
    globalConnectionCount = Math.max(0, globalConnectionCount - 1);
    
    if (event.code === 1000) {
      // Normal closure
      this.setState(WebSocketState.DISCONNECTED);
      this.emit('disconnected', { code: event.code, reason: event.reason });
    } else {
      // Unexpected closure - attempt to reconnect
      this.setState(WebSocketState.ERROR);
      this.emit('error', { 
        type: 'connection_closed', 
        code: event.code, 
        reason: event.reason 
      });
      this.scheduleReconnect();
    }
  }

  /**
   * Handle specific message types
   */
  handleMessage(message) {
    switch (message.type) {
      case 'ConnectionEstablished':
        this.connectionId = message.payload.connection_id;
        this.stats.connectionId = this.connectionId;
        this.emit('connection-established', message.payload);
        break;
        
      case 'Ping':
        // Respond to server ping
        this.send({ type: 'Pong' });
        break;
        
      case 'Pong':
        // Server responded to our ping
        this.emit('pong', { timestamp: new Date() });
        break;
        
      case 'NavigationUpdated':
        this.emit('navigation-updated', message.payload);
        break;
        
      case 'SchemaReloaded':
        this.emit('schema-reloaded', message.payload);
        break;
        
      case 'FileChanged':
        this.emit('file-changed', message.payload);
        break;
        
      case 'DataUpdate':
        this.emit('data-update', message.payload);
        break;
        
      case 'Error':
        this.emit('server-error', message.payload);
        break;
        
      case 'Custom':
        this.emit(message.payload.event, message.payload.data);
        break;
        
      default:
        this.log('Unknown message type:', message.type);
        this.emit('unknown-message', message);
    }
  }

  /**
   * Set connection state and emit state change event
   */
  setState(newState) {
    const oldState = this.state;
    this.state = newState;
    this.log(`State changed: ${oldState} -> ${newState}`);
    this.emit('state-changed', { oldState, newState });
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.log('Max reconnection attempts reached');
      this.setState(WebSocketState.ERROR);
      this.emit('max-reconnects-exceeded', { attempts: this.reconnectAttempts });
      return;
    }

    this.setState(WebSocketState.RECONNECTING);
    this.reconnectAttempts++;
    
    // Enhanced exponential backoff with jitter and limits
    const baseDelay = Math.min(
      this.config.reconnectInterval * Math.pow(1.8, this.reconnectAttempts),
      this.config.maxReconnectInterval
    );
    
    const jitter = baseDelay * 0.3 * Math.random(); // 30% jitter
    const finalDelay = Math.max(1000, baseDelay + jitter); // Minimum 1 second
    
    this.log(`Reconnecting in ${Math.round(finalDelay)}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.log(`Reconnection attempt ${this.reconnectAttempts}`);
      this.connect();
    }, finalDelay);

    this.emit('reconnecting', { 
      attempt: this.reconnectAttempts, 
      delay: finalDelay 
    });
  }

  /**
   * Start heartbeat timer
   */
  startHeartbeat() {
    this.clearHeartbeat();
    
    if (this.config.heartbeatInterval > 0) {
      this.heartbeatTimer = setInterval(() => {
        if (this.state === WebSocketState.CONNECTED) {
          this.send({ type: 'Ping' });
        }
      }, this.config.heartbeatInterval);
    }
  }

  /**
   * Clear all timers
   */
  clearTimers() {
    this.clearHeartbeat();
    this.clearReconnectTimer();
  }

  /**
   * Clear heartbeat timer
   */
  clearHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Clear reconnect timer
   */
  clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Debug logging
   */
  log(...args) {
    if (this.config.debug) {
      console.log('[WebSocket]', `[${this.instanceId}]`, ...args);
    }
  }
}
