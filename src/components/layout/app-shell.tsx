"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const COOKIE_KEY = "sidebar-collapsed";

export function AppShell({
  user,
  defaultCollapsed,
  children,
}: {
  user: { name: string; email: string };
  defaultCollapsed: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      document.cookie = `${COOKIE_KEY}=${next}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding-left] duration-200 ease-in-out",
          collapsed ? "md:pl-[68px]" : "md:pl-56"
        )}
      >
        <Topbar user={user} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
