"use client";

import { ToastProvider } from "./Toast";
import type { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
