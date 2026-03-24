import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Gabungkan class Tailwind dengan aman */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format angka ke Rupiah */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format angka singkat: 1.500.000 → 1,5 Jt */
export function formatShort(amount: number): string {
  if (amount >= 1_000_000_000)
    return `${(amount / 1_000_000_000).toFixed(1)} M`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} Jt`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)} Rb`;
  return amount.toString();
}

/** Format tanggal ke "22 Mar 2026" */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

/** Format tanggal + jam: "22 Mar 2026, 14:30" */
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

/** Ambil inisial nama: "Budi Santoso" → "BS" */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

/** Warna badge berdasarkan status order */
export function getOrderStatusColor(status: string): string {
  const map: Record<string, string> = {
    completed: "badge-success",
    pending: "badge-warning",
    cancelled: "badge-danger",
    refunded: "badge-gray",
  };
  return map[status] ?? "badge-gray";
}

/** Label status order dalam bahasa Indonesia */
export function getOrderStatusLabel(status: string): string {
  const map: Record<string, string> = {
    completed: "Selesai",
    pending: "Pending",
    cancelled: "Dibatalkan",
    refunded: "Direfund",
  };
  return map[status] ?? status;
}

/** Label metode pembayaran */
export function getPaymentLabel(method: string): string {
  const map: Record<string, string> = {
    cash: "Tunai",
    qris: "QRIS",
    card: "Kartu",
    transfer: "Transfer",
    mixed: "Campuran",
  };
  return map[method] ?? method;
}

/** Ekstrak pesan error dari response Axios */
export function getAxiosErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const res = (error as any).response;
    return res?.data?.message ?? "Terjadi kesalahan.";
  }
  return "Terjadi kesalahan.";
}

/** Ekstrak validation errors dari response 422 */
export function getValidationErrors(error: unknown): Record<string, string> {
  if (typeof error === "object" && error !== null && "response" in error) {
    const errors = (error as any).response?.data?.errors ?? {};
    return Object.fromEntries(
      Object.entries(errors).map(([key, val]) => [key, (val as string[])[0]]),
    );
  }
  return {};
}
