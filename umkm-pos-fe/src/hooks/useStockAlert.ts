import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";

export interface LowStockProduct {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  min_stock: number;
  unit: string | null;
  category: { id: string; name: string } | null;
}

const fetchLowStock = (): Promise<LowStockProduct[]> =>
  axios.get("/stock/low").then((r) => r.data.data);

/**
 * useStockAlert
 * Polling GET /stock/low setiap 3 menit.
 * Aman dipakai di banyak komponen — React Query deduplicate request-nya otomatis.
 */
export function useStockAlert() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["stock-low"],
    queryFn: fetchLowStock,
    refetchInterval: 3 * 60 * 1000, // 3 menit
    refetchIntervalInBackground: false, // berhenti kalau tab tidak aktif
    staleTime: 60 * 1000, // anggap stale setelah 1 menit
  });

  return {
    lowStockProducts: data,
    lowStockCount: data.length,
    hasAlert: data.length > 0,
    isLoading,
  };
}
