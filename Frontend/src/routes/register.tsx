import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RegisterPage } from "@/components/pages/RegisterPage";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Create account - TaskFlow" }] }),
  component: RegisterRoute,
});

function RegisterRoute() {
  const navigate = useNavigate();
  return <RegisterPage onAuthenticated={() => navigate({ to: "/dashboard" })} />;
}
