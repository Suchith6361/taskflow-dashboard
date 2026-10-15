"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { SESSION_LOST_EVENT } from "@/services/apiClient";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    const clearUserData = () => queryClient.clear();
    window.addEventListener(SESSION_LOST_EVENT, clearUserData);
    return () => window.removeEventListener(SESSION_LOST_EVENT, clearUserData);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors position="bottom-right" />
    </QueryClientProvider>
  );
}
