export function generateInvoiceNumber() {
  const rand = Math.floor(Math.random() * 1_000_000_000)
    .toString()
    .padStart(9, "0");
  const suffix = Date.now().toString().slice(-3);
  return `INV-${rand}${suffix}`;
}
