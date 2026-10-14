import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/authService";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — TaskFlow" },
      { name: "description", content: "Create a TaskFlow account to manage projects and tasks." },
      { property: "og:title", content: "Create account — TaskFlow" },
      { property: "og:description", content: "Create a TaskFlow account to manage projects and tasks." },
    ],
  }),
  component: Register,
});

const schema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
    email: z.string().trim().email("Enter a valid email"),
    password: z.string().min(8, "At least 8 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" });

function Register() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { name: "", email: "", password: "", confirm: "" } });
  const err = form.formState.errors;

  const submit = form.handleSubmit(async (v) => {
    setError(null);
    try {
      await authService.register(v.name, v.email, v.password);
      navigate({ to: "/dashboard" });
    } catch (e) {
      setError((e as Error).message);
    }
  });

  const field = (id: "name" | "email" | "password" | "confirm", label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} {...form.register(id)} />
      {err[id] && <p className="text-xs text-destructive">{err[id]?.message}</p>}
    </div>
  );

  return (
    <AuthLayout title="Create your account" subtitle="Start organizing your work with TaskFlow">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        {field("name", "Full name")}
        {field("email", "Email", "email")}
        {field("password", "Password", "password")}
        {field("confirm", "Confirm password", "password")}
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Creating account…" : "Create account"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
