const CURRENCY_LOCALE: Record<string, string> = {
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  IDR: "id-ID",
  AUD: "en-AU",
  SGD: "en-SG",
};

export function formatCurrency(amount: number, currency = "INR") {
  const locale = CURRENCY_LOCALE[currency] ?? "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "IDR" ? 0 : 2,
  }).format(amount || 0);
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateInput(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

export function monthLabel(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "2-digit",
  }).format(d);
}

export const CURRENCIES = [
  { code: "INR", label: "Indian Rupee", flag: "🇮🇳" },
  { code: "USD", label: "US Dollar", flag: "🇺🇸" },
  { code: "EUR", label: "Euro", flag: "🇪🇺" },
  { code: "GBP", label: "British Pound", flag: "🇬🇧" },
  { code: "IDR", label: "Indonesian Rupiah", flag: "🇮🇩" },
  { code: "AUD", label: "Australian Dollar", flag: "🇦🇺" },
  { code: "SGD", label: "Singapore Dollar", flag: "🇸🇬" },
];

export function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
