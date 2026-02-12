import { Sidebar } from "./sidebar";
import { Header } from "./header";

interface AppShellProps {
  children: React.ReactNode;
  breadcrumb?: {
    parent: string;
    current: string;
  };
}

export function AppShell({ children, breadcrumb }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="ml-64 flex-1 flex flex-col">
        <Header breadcrumb={breadcrumb} />
        <div className="flex-1 p-8">{children}</div>
      </main>
    </div>
  );
}
