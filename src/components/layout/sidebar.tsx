"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Briefcase,
  FolderOpen,
  Users,
  Wallet,
  LineChart,
  Landmark,
  Settings,
  Zap,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type SubItem = {
  label: string;
  href: string;
  icon?: typeof LayoutDashboard;
};

type NavGroup = {
  sectionTitle: string;
  items: Array<{
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
    badge?: string;
    subItems?: SubItem[];
  }>;
};

const NAV_GROUPS: NavGroup[] = [
  {
    sectionTitle: "Overview",
    items: [
      { href: "/dashboard", label: "Home", icon: LayoutDashboard },
    ],
  },
  {
    sectionTitle: "Billing & Revenue",
    items: [
      {
        href: "/dashboard/invoices",
        label: "Invoices",
        icon: FileText,
      },
      {
        href: "/dashboard/payments",
        label: "Payments",
        icon: Wallet,
      },
    ],
  },
  {
    sectionTitle: "Management",
    items: [
      {
        href: "/dashboard/projects",
        label: "Projects",
        icon: Briefcase,
      },
      {
        href: "/dashboard/clients",
        label: "Clients",
        icon: Users,
      },
      {
        href: "/dashboard/employees",
        label: "Employees",
        icon: Users,
      },
      {
        href: "/dashboard/folders",
        label: "Folders",
        icon: FolderOpen,
      },
    ],
  },
  {
    sectionTitle: "Financial Intelligence",
    items: [
      { href: "/dashboard/analytics", label: "Analytics", icon: LineChart, badge: "AI" },
      { href: "/dashboard/pnl", label: "P&L Tracker", icon: Landmark },
    ],
  },
];

export function Sidebar({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const pathname = usePathname();
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(() => {
    if (pathname.startsWith("/dashboard/invoices")) return "/dashboard/invoices";
    if (pathname.startsWith("/dashboard/projects")) return "/dashboard/projects";
    return null;
  });

  function toggleSubmenu(href: string) {
    setOpenSubmenu((prev) => (prev === href ? null : href));
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-sidebar-border bg-sidebar py-4 transition-[width] duration-200 ease-in-out md:flex print:hidden",
        collapsed ? "w-[68px] items-center" : "w-60 items-stretch px-3"
      )}
    >
      {/* Brand Header */}
      <Link
        href="/dashboard"
        className={cn(
          "mb-5 flex items-center gap-3 px-1 transition-opacity",
          collapsed ? "justify-center px-0" : "px-2"
        )}
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md shrink-0">
          <Zap className="size-5" fill="currentColor" />
        </span>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
              Madbillio
            </span>
            <span className="rounded-md bg-primary/20 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary">
              PRO
            </span>
          </div>
        )}
      </Link>

      {/* Navigation Menu */}
      <nav className="flex-1 space-y-4 overflow-y-auto pr-0.5 scrollbar-none">
        {NAV_GROUPS.map((group, idx) => (
          <div key={idx} className="space-y-1">
            {!collapsed && (
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                {group.sectionTitle}
              </p>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              const hasSub = item.subItems && item.subItems.length > 0;
              const isSubOpen = openSubmenu === item.href;

              const mainContent = (
                <div
                  className={cn(
                    "flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all cursor-pointer",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                    collapsed && "size-11 justify-center px-0"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="size-5 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </div>
                  {!collapsed && (
                    <div className="flex items-center gap-1.5">
                      {item.badge && (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary flex items-center gap-0.5">
                          <Sparkles className="h-2.5 w-2.5" />
                          {item.badge}
                        </span>
                      )}
                      {hasSub && (
                        <ChevronDown
                          className={cn(
                            "size-4 shrink-0 opacity-60 transition-transform duration-200",
                            isSubOpen && "rotate-180"
                          )}
                        />
                      )}
                    </div>
                  )}
                </div>
              );

              return (
                <div key={item.href} className="space-y-1">
                  {hasSub && !collapsed ? (
                    <div onClick={() => toggleSubmenu(item.href)}>
                      {mainContent}
                    </div>
                  ) : (
                    <Link href={item.href}>
                      {collapsed ? (
                        <Tooltip>
                          <TooltipTrigger render={mainContent} />
                          <TooltipContent side="right">{item.label}</TooltipContent>
                        </Tooltip>
                      ) : (
                        mainContent
                      )}
                    </Link>
                  )}

                  {/* Submenu Accordion */}
                  {hasSub && !collapsed && isSubOpen && (
                    <div className="ml-5 space-y-1 border-l border-sidebar-border/60 pl-3 pt-1">
                      {item.subItems!.map((sub) => {
                        const subActive = pathname === sub.href;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={cn(
                              "block rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                              subActive
                                ? "bg-primary/15 text-primary font-semibold"
                                : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                            )}
                          >
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer Navigation */}
      <div className={cn("mt-auto space-y-1 pt-2 border-t border-sidebar-border/50", collapsed && "items-center")}>
        <Link href="/dashboard/settings">
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              pathname.startsWith("/dashboard/settings") && "bg-sidebar-accent text-sidebar-accent-foreground font-semibold",
              collapsed && "size-11 justify-center px-0"
            )}
          >
            <Settings className="size-5 shrink-0" />
            {!collapsed && <span>Settings</span>}
          </div>
        </Link>

        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={onToggleCollapsed}
                className={cn(
                  "flex items-center gap-3 rounded-xl text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed ? "size-11 justify-center" : "h-10 w-full px-3"
                )}
              >
                {collapsed ? (
                  <ChevronsRight className="size-5 shrink-0" />
                ) : (
                  <>
                    <ChevronsLeft className="size-5 shrink-0" />
                    <span className="text-sm font-medium">Collapse</span>
                  </>
                )}
              </button>
            }
          />
          {collapsed && <TooltipContent side="right">Expand</TooltipContent>}
        </Tooltip>
      </div>
    </aside>
  );
}
