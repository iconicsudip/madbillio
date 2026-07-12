import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Zap } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-secondary/40 px-6 text-center">
      <span className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <Zap className="size-6" fill="currentColor" />
      </span>
      <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-balance">
        Invoices, payments, and profit — in one clean workspace.
      </h1>
      <p className="mt-4 max-w-md text-muted-foreground text-balance">
        Create polished invoices, track project payments, and see your P&amp;L
        update in real time.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Button render={<Link href="/register" />} size="lg">
          Get started <ArrowRight className="size-4" />
        </Button>
        <Button render={<Link href="/login" />} size="lg" variant="outline">
          Sign in
        </Button>
      </div>
    </div>
  );
}
