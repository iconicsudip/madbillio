"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteProject } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function DeleteProjectButton({
  id,
  iconOnly = false,
  redirectAfterDelete,
}: {
  id: string;
  iconOnly?: boolean;
  redirectAfterDelete?: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          iconOnly ? (
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            />
          ) : (
            <Button variant="outline" className="text-destructive hover:text-destructive" />
          )
        }
      >
        {iconOnly ? <Trash2 className="size-4" /> : <>
          <Trash2 /> Delete
        </>}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this project?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the project record. Invoices already created will be
            kept but unlinked from this project. This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await deleteProject(id);
                toast.success("Project deleted");
                if (redirectAfterDelete) router.push(redirectAfterDelete);
                else router.refresh();
              })
            }
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
