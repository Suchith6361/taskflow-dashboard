import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "TaskFlow — Project management" },
      { name: "description", content: "Plan projects, track tasks and ship on time with TaskFlow." },
      { property: "og:title", content: "TaskFlow — Project management" },
      { property: "og:description", content: "Plan projects, track tasks and ship on time with TaskFlow." },
    ],
  }),
});
