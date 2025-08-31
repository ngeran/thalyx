// frontend/src/types/websocket.ts

/**
 * WebSocket Types and Interfaces
 * 
 * Type-safe WebSocket message definitions that match the Rust backend
 */

export type ConnectionId = string;

export interface WsMessage {
  type: 'ConnectionEstablished' | 'Ping' | 'Pong' | 'NavigationUpdated' | 
        'SchemaReloaded' | 'FileChanged' | 'DataUpdate' | 'Error' | 'Custom';
  payload?: any;
}

export interface ConnectionEstablishedPayload {
  connection_id: ConnectionId;
}

export interface NavigationUpdatedPayload {
  schema: string;
  data: any;
}

export interface SchemaReloadedPayload {
  schema: string;
}

export interface FileChangedPayload {
  path: string;
  event_type: string;
}

export interface DataUpdatePayload {
  source: string;
  data: any;
  timestamp: string;
}

export interface ErrorPayload {
  message: string;
  code?: number;
}

export interface CustomPayload {
  event: string;
  data: any;
}

// WebSocket connection states
export enum WebSocketState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  RECONNECTING = 'reconnecting'
}

// Subscription topics (matching Rust enum)
export enum SubscriptionTopic {
  NAVIGATION = 'navigation',
  FILESYSTEM = 'filesystem', 
  ALL = 'all'
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  topics: SubscriptionTopic[];
}

export interface WebSocketStats {
  state: WebSocketState;
  connectionId: ConnectionId | null;
  connectedAt: Date | null;
  reconnectAttempts: number;
  lastMessage: Date | null;
  messagesSent: number;
  messagesReceived: number;
}
