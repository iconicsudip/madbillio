import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { UserMenu } from "@/components/layout/user-menu";

export function Topbar({
  user,
}: {
  user: { name: string; email: string };
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur md:px-6 print:hidden">
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Quick search..."
          className="bg-secondary/60 pl-9"
        />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Bell className="size-4.5" />
        </button>
        <UserMenu user={user} />
      </div>
    </header>
  );
}
