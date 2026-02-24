import type { ReactNode } from "react";

import { GlobalQuickAction } from "@/components/layout/global-quick-action";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-app text-ink">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <Header />
          <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-28 lg:pb-8">
            {children}
          </main>
        </div>
      </div>
      <GlobalQuickAction />
      <MobileNav />
    </div>
  );
}
