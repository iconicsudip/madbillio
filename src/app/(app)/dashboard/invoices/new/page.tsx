import { listClients } from "@/actions/clients";
import { listProjects } from "@/actions/projects";
import { listPaymentDetails } from "@/actions/payment-details";
import { requireUserId, getBusinessProfile } from "@/lib/session";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { generateInvoiceNumber } from "@/lib/invoice-number";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const { projectId } = await searchParams;
  const userId = await requireUserId();
  const [clients, projects, profile, paymentDetails] = await Promise.all([
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
      defaultProjectId={projectId}
      newInvoiceNumber={generateInvoiceNumber()}
    />
  );
}
