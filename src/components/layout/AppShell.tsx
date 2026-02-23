import { ReactNode } from "react";

interface AppShellProps {
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
  sidebarOpen: boolean;
  onDismissSidebar: () => void;
}

export function AppShell({
  sidebar,
  header,
  children,
  sidebarOpen,
  onDismissSidebar,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onDismissSidebar}
        />
      )}

      {sidebar}

      <div className="lg:pl-72">
        {header}
        <main className="px-4 pb-8 pt-6 sm:px-6 lg:px-8">
          <div className="app-shell-container">{children}</div>
        </main>
      </div>
    </div>
  );
}
