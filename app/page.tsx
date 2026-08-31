"use client";

import DojoApp from "../legacy/App";
import ErrorBoundary from "../legacy/components/ErrorBoundary";

export default function Home() {
  return (
    <ErrorBoundary>
      <DojoApp />
    </ErrorBoundary>
  );
}
