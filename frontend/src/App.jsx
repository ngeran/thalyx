import React from 'react';
import SiteOrchestrator from './SiteOrchestrator';
import { WebSocketProvider } from './contexts/WebSocketContext';
import './App.css';

function App() {
  return (
    <WebSocketProvider>
      <SiteOrchestrator />
    </WebSocketProvider>
  );
}

export default App;
