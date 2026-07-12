import { getInvoice } from "@/actions/invoices";
import { listClients } from "@/actions/clients";
import { listProjects } from "@/actions/projects";
import { listPaymentDetails } from "@/actions/payment-details";
import { requireUserId, getBusinessProfile } from "@/lib/session";
import { InvoiceForm } from "@/components/invoices/invoice-form";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireUserId();
  const [invoice, clients, projects, profile, paymentDetails] =
    await Promise.all([
      getInvoice(id),
      listClients(),
      listProjects(),
      getBusinessProfile(userId),
      listPaymentDetails(),
    ]);

  return (
    <InvoiceForm
      clients={clients}
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      profile={profile}
      paymentDetails={paymentDetails}
      initialInvoice={{
        id: invoice.id,
        clientId: invoice.clientId,
        projectId: invoice.projectId,
        invoiceNumber: invoice.invoiceNumber,
        currency: invoice.currency,
        issuedDate: invoice.issuedDate,
        dueDate: invoice.dueDate,
        taxRate: invoice.taxRate,
        notes: invoice.notes,
        items: invoice.items,
      }}
    />
  );
}
