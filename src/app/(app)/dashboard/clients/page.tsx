import { Users, Pencil } from "lucide-react";
import { listClientsWithStats } from "@/actions/clients";
import { requireUserId, getBusinessProfile } from "@/lib/session";
import { formatCurrency, initials } from "@/lib/format";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { DeleteClientButton } from "@/components/clients/delete-client-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ClientsPage() {
  const userId = await requireUserId();
  const [clients, profile] = await Promise.all([
    listClientsWithStats(),
    getBusinessProfile(userId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">
            Everyone you bill, in one place.
          </p>
        </div>
        <ClientFormDialog />
      </div>

      <Card>
        <CardContent className="p-0">
          {clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <Users className="size-5" />
              </span>
              <p className="text-sm text-muted-foreground">
                No clients yet. Add your first client to start invoicing.
              </p>
              <ClientFormDialog />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead>Invoices</TableHead>
                  <TableHead className="text-right">Collected</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => {
                  const collected = client.invoices.reduce(
                    (sum, inv) => sum + inv.amountPaid,
                    0
                  );
                  return (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-8">
                            <AvatarFallback className="text-xs">
                              {initials(client.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{client.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div>{client.email}</div>
                        {client.phone && <div>{client.phone}</div>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {client._count.projects}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {client._count.invoices}
                      </TableCell>
                      <TableCell className="text-right font-medium text-success">
                        {formatCurrency(collected, profile.defaultCurrency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <ClientFormDialog
                            key={client.updatedAt.toISOString()}
                            client={client}
                            trigger={
                              <button
                                type="button"
                                className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                              >
                                <Pencil className="size-4" />
                              </button>
                            }
                          />
                          <DeleteClientButton id={client.id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
