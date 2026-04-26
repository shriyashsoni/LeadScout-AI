import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ConvexProvider, ConvexReactClient } from "convex/react";

// Use the .cloud URL for the client as it is the standard for Convex functions
const convexUrl = import.meta.env.VITE_CONVEX_URL || "https://gregarious-salmon-798.convex.cloud";
console.log("Connecting to Convex at:", convexUrl);

const convex = new ConvexReactClient(convexUrl);

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Failed to find root element");
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    </StrictMode>,
  )
}
