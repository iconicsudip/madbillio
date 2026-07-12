"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Users,
  Wallet,
  LineChart,
  Landmark,
  Settings,
  Zap,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/invoices", label: "Invoices", icon: FileText },
  { href: "/dashboard/projects", label: "Projects", icon: Briefcase },
  { href: "/dashboard/clients", label: "Clients", icon: Users },
  { href: "/dashboard/payments", label: "Payments", icon: Wallet },
  { href: "/dashboard/analytics", label: "Analytics", icon: LineChart },
  { href: "/dashboard/pnl", label: "P&L Tracker", icon: Landmark },
];

function NavLink({
  href,
  label,
  Icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
  active: boolean;
  collapsed: boolean;
}) {
  const link = (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        collapsed ? "size-11 justify-center" : "h-11 w-full px-3",
        active && "bg-sidebar-accent text-sidebar-accent-foreground"
      )}
    >
      <Icon className="size-5 shrink-0" />
      {!collapsed && <span className="text-sm font-medium">{label}</span>}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export function Sidebar({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-sidebar-border bg-sidebar py-4 transition-[width] duration-200 ease-in-out md:flex print:hidden",
        collapsed ? "w-[68px] items-center" : "w-56 items-stretch px-3"
      )}
    >
      <Link
        href="/dashboard"
        className={cn(
          "mb-6 flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm",
          !collapsed && "ml-0"
        )}
      >
        <Zap className="size-5" fill="currentColor" />
      </Link>

      <nav
        className={cn(
          "flex flex-1 flex-col gap-1",
          collapsed && "items-center"
        )}
      >
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              Icon={item.icon}
              active={active}
              collapsed={collapsed}
            />
          );
        })}
      </nav>

      <div className={cn("flex flex-col gap-1", collapsed && "items-center")}>
        <NavLink
          href="/dashboard/settings"
          label="Settings"
          Icon={Settings}
          active={pathname.startsWith("/dashboard/settings")}
          collapsed={collapsed}
        />

        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={onToggleCollapsed}
                className={cn(
                  "flex items-center gap-3 rounded-xl text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed ? "size-11 justify-center" : "h-11 w-full px-3"
                )}
              />
            }
          >
            {collapsed ? (
              <ChevronsRight className="size-5 shrink-0" />
            ) : (
              <>
                <ChevronsLeft className="size-5 shrink-0" />
                <span className="text-sm font-medium">Collapse</span>
              </>
            )}
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">Expand</TooltipContent>}
        </Tooltip>
      </div>
    </aside>
  );
}
