"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/authService";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(authService.currentUser() ? "/dashboard" : "/login");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6" role="status">
      <p className="text-sm text-muted-foreground">Opening your TaskFlow workspace...</p>
    </main>
  );
}
