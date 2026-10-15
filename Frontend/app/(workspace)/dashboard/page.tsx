"use client";

import Link from "next/link";
import { DashboardPage } from "@/components/pages/DashboardPage";

export default function DashboardRoute() {
  return <DashboardPage LinkComponent={Link} />;
}
