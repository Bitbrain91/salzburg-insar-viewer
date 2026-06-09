import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { applyUrlStateToStore } from "./lib/urlState";
import "./styles/index.css";

// Deep-Link-Parameter VOR dem ersten Render in den Store schreiben
// (P7-B-W2-T0): verhindert Area-fitBounds-/Selection-Reset-Races.
applyUrlStateToStore();

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
