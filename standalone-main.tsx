import React from "react";
import { createRoot } from "react-dom/client";
import DojoApp from "./legacy/App";
import ErrorBoundary from "./legacy/components/ErrorBoundary";
import "./app/globals.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing #root element");

createRoot(rootElement).render(
  <ErrorBoundary>
    <DojoApp />
  </ErrorBoundary>,
);
