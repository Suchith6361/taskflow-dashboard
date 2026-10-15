import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LoginPage } from "@/components/pages/LoginPage";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in - TaskFlow" }] }),
  component: LoginRoute,
});

function LoginRoute() {
  const navigate = useNavigate();
  return <LoginPage onAuthenticated={() => navigate({ to: "/dashboard" })} />;
}
