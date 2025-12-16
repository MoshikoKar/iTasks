"use client";

import { ReactNode } from "react";
import { ErrorBoundary } from "./ErrorBoundary";

export function ClientWrapper({ children }: { children: ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
