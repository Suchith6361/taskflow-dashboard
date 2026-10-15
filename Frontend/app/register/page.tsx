"use client";

import { useRouter } from "next/navigation";
import { RegisterPage } from "@/components/pages/RegisterPage";

export default function RegisterRoute() {
  const router = useRouter();
  return <RegisterPage onAuthenticated={() => router.push("/dashboard")} />;
}
