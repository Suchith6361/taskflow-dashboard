"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/authService";

const schema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .max(254, "Email must be at most 254 characters"),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .max(72, "Password must be at most 72 characters")
    .refine(
      (value) => new TextEncoder().encode(value).length <= 72,
      "Password must be at most 72 UTF-8 bytes",
    ),
});

export function LoginPage({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  const err = form.formState.errors;

  const submit = form.handleSubmit(async (v) => {
    setError(null);
    try {
      await authService.login(v.email, v.password);
      onAuthenticated();
    } catch (e) {
      setError((e as Error).message);
    }
  });

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your TaskFlow workspace">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
          {err.email && <p className="text-xs text-destructive">{err.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...form.register("password")}
          />
          {err.password && <p className="text-xs text-destructive">{err.password.message}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          No account?{" "}
          <a href="/register" className="font-medium text-primary hover:underline">
            Create one
          </a>
        </p>
      </form>
    </AuthLayout>
  );
}
