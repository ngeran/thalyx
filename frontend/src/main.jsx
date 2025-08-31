/**
 * main.jsx
 * 
 * @description
 * Entry point for the React application. Renders the root component with necessary providers
 * for theme and WebSocket connectivity. This file sets up the global context
 * required by various parts of the application, now supporting enhanced navigation via GlobalSiteNavigation.
 * 
 * @dependencies
 * - React: JavaScript library for building user interfaces.
 * - ReactDOM: Provides DOM-specific methods that can be used at the top-level of a web app.
 * - SiteOrchestrator: The main application component that manages layout and navigation (now with GlobalSiteNavigation).
 * - ThemeProvider: Context provider for managing the application's theme state.
 * - WebSocketProvider: Context provider for managing the application's WebSocket connection and real-time data.
 * - index.css: Global CSS styles for the application.
 * 
 * @how-to-use
 * 1. Ensure all necessary dependencies (React, ReactDOM, SiteOrchestrator, ThemeProvider, WebSocketProvider) are correctly imported.
 * 2. Wrap the root component (SiteOrchestrator) with `React.StrictMode` for identifying potential problems in an application.
 * 3. Wrap `SiteOrchestrator` with `ThemeProvider` to enable theme toggling across the app.
 * 4. Wrap `SiteOrchestrator` with `WebSocketProvider` to enable real-time communication and data updates throughout the app.
 * 5. Mount the entire structure to a DOM element with the ID 'root' (usually found in `index.html`).
 */

// =============================================================================
// IMPORTS
// =============================================================================
import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom" // <-- Crucial: Import BrowserRouter
import SiteOrchestratorWithProvider from "./SiteOrchestrator.jsx" // Your component that wraps SiteOrchestrator in ThemeProvider
import { WebSocketProvider } from "./contexts/WebSocketContext.jsx" // Your WebSocket context
import "./index.css"

// =============================================================================
// APPLICATION ROOT RENDERING
// =============================================================================
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/*
      BrowserRouter MUST be the highest-level component that wraps
      anything that uses react-router-dom hooks (useNavigate, useLocation, etc.)
      or components (Routes, Route, Link).
    */}
    <BrowserRouter>
      {/*
        WebSocketProvider needs to be outside or wrap SiteOrchestratorWithProvider
        because SiteOrchestrator directly uses useWebSocketContext.
        SiteOrchestratorWithProvider itself handles ThemeProvider internally.
      */}
      <WebSocketProvider>
        <SiteOrchestratorWithProvider />
      </WebSocketProvider>
    </BrowserRouter>
  </React.StrictMode>
)
