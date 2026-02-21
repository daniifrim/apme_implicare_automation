import { AppShell } from "@/components/layout/app-shell";
import { Agentation } from "agentation";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppShell>{children}</AppShell>
      {/* Agentation - Visual feedback tool for AI agents */}
      {/* Only shows in development mode */}
      {process.env.NODE_ENV === "development" && <Agentation />}
    </>
  );
}
