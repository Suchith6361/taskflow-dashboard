"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/NextAppSidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { authService } from "@/services/authService";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export default function WorkspaceLayout({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [checked, setChecked] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    authService
      .restoreSession()
      .then((restored) => {
        if (!active) return;
        setChecked(true);
        if (!restored) router.replace("/login");
        else setSessionError(null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setSessionError(error instanceof Error ? error.message : "Unable to verify your session.");
        setChecked(true);
      });
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (checked && !user) router.replace("/login");
  }, [checked, pathname, router, user]);

  const retrySession = () => {
    setChecked(false);
    setSessionError(null);
    void authService
      .restoreSession()
      .then((restored) => {
        setChecked(true);
        if (!restored) router.replace("/login");
      })
      .catch((error: unknown) => {
        setSessionError(error instanceof Error ? error.message : "Unable to verify your session.");
        setChecked(true);
      });
  };

  if (sessionError) {
    return (
      <main
        className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background"
        role="alert"
      >
        <p className="text-sm text-destructive">{sessionError}</p>
        <Button variant="outline" onClick={retrySession}>
          Retry
        </Button>
      </main>
    );
  }
  if (!checked || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background" role="status">
        <p className="text-sm text-muted-foreground">Checking your session...</p>
      </main>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="bg-background">
          <header className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
