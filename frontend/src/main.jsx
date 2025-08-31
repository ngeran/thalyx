/**
 * main.jsx
 * 
 * @description
 * Entry point for the React application. Renders the root component with necessary providers
 * for dark mode and WebSocket connectivity. This file sets up the global context
 * required by various parts of the application.
 * 
 * @dependencies
 * - React: JavaScript library for building user interfaces.
 * - ReactDOM: Provides DOM-specific methods that can be used at the top-level of a web app.
 * - SiteOrchestrator: The main application component that manages layout and navigation.
 * - DarkModeProvider: Context provider for managing the application's dark mode state.
 * - WebSocketProvider: Context provider for managing the application's WebSocket connection and real-time data.
 * - index.css: Global CSS styles for the application.
 * 
 * @how-to-use
 * 1. Ensure all necessary dependencies (React, ReactDOM, SiteOrchestrator, DarkModeProvider, WebSocketProvider) are correctly imported.
 * 2. Wrap the root component (SiteOrchestrator) with `React.StrictMode` for identifying potential problems in an application.
 * 3. Wrap `SiteOrchestrator` with `DarkModeProvider` to enable theme toggling across the app.
 * 4. Wrap `SiteOrchestrator` with `WebSocketProvider` to enable real-time communication and data updates throughout the app.
 * 5. Mount the entire structure to a DOM element with the ID 'root' (usually found in `index.html`).
 */

// =============================================================================
// IMPORTS
// =============================================================================
import React from "react"
import ReactDOM from "react-dom/client"
import SiteOrchestrator from "./SiteOrchestrator.jsx"
import { ThemeProvider } from "./hooks/useTheme.jsx"  // <--- CHANGED: Using new unified theme system
import { WebSocketProvider } from "./contexts/WebSocketContext.jsx"
import "./index.css"

// =============================================================================
// APPLICATION ROOT RENDERING
// =============================================================================
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>  {/* <--- CHANGED: Using ThemeProvider instead of DarkModeProvider */}
      <WebSocketProvider>
        <SiteOrchestrator />
      </WebSocketProvider>
    </ThemeProvider>
  </React.StrictMode>
)
