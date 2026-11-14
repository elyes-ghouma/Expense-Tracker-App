import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
import type { Db, TransactionFilter } from "@/types/domain";
import { settingsRepo } from "@/services/database/repositories/settingsRepo";
import { categoryRepo } from "@/services/database/repositories/categoryRepo";
import { transactionRepo } from "@/services/database/repositories/transactionRepo";
import { budgetRepo } from "@/services/database/repositories/budgetRepo";
import { categoryService } from "@/services/domain/categoryService";
import { subDays } from "date-fns";
import { toDayKey } from "@/utils/dates";
import {
  transactionService,
  type TransactionInput,
} from "@/services/domain/transactionService";
import { analyticsService } from "@/services/domain/analyticsService";
import { budgetService } from "@/services/domain/budgetService";
const useDb = () => useSQLiteContext() as unknown as Db;
export function useSettings() {
  const db = useDb();
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => settingsRepo.getAll(db),
  });
}
export function useCategories(
  type?: "expense" | "income",
  includeArchived = false,
) {
  const db = useDb();
  return useQuery({
    queryKey: ["categories", type, includeArchived],
    queryFn: () => categoryRepo.list(db, { type, includeArchived }),
  });
}
export function useFrequentCategories(type: "expense" | "income") {
  const db = useDb();
  return useQuery({
    queryKey: ["categories", "frequent", type],
    queryFn: () =>
      categoryRepo.getFrequent(db, type, toDayKey(subDays(new Date(), 90)), 4),
  });
}
export function useTransactions(filter: TransactionFilter = {}) {
  const db = useDb();
  return useInfiniteQuery({
    queryKey: ["transactions", filter],
    initialPageParam: undefined as { date: string; id: number } | undefined,
    queryFn: ({ pageParam }) => transactionRepo.list(db, filter, pageParam, 30),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}
export function useTxSummary(filter: TransactionFilter = {}) {
  const db = useDb();
  return useQuery({
    queryKey: ["txSummary", filter],
    queryFn: () => transactionRepo.summary(db, filter),
  });
}
export function useDashboard(month: string) {
  const db = useDb();
  return useQuery({
    queryKey: ["dashboard", month],
    queryFn: () => analyticsService.dashboard(db, month),
  });
}
export function useAnalytics(month: string, count = 6) {
  const db = useDb();
  return useQuery({
    queryKey: ["analytics", month, count],
    queryFn: async () => {
      const [trend, comparison, insights, dashboard] = await Promise.all([
        analyticsService.trend(db, month, count),
        analyticsService.comparison(db, month),
        analyticsService.insights(db, month),
        analyticsService.dashboard(db, month),
      ]);
      return {
        trend,
        comparison,
        insights,
        breakdown: dashboard.breakdown,
        totals: dashboard,
      };
    },
  });
}
export function useBudgets(month: string) {
  const db = useDb();
  return useQuery({
    queryKey: ["budgets", month],
    queryFn: () => budgetService.ensureMonth(db, month),
  });
}
export function useTransactionMutations() {
  const db = useDb();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries();
  return {
    create: useMutation({
      mutationFn: (x: TransactionInput) => transactionService.create(db, x),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: (x: { id: number; input: TransactionInput }) =>
        transactionService.update(db, x.id, x.input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: number) => transactionService.remove(db, id),
      onSuccess: invalidate,
    }),
    restore: useMutation({
      mutationFn: transactionService.restore.bind(null, db),
      onSuccess: invalidate,
    }),
  };
}
export function useSetBudget() {
  const db = useDb();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (x: {
      categoryId: number | null;
      month: string;
      amountMinor: number;
      alertThresholdPct: number;
    }) => budgetService.setBudget(db, x),
    onSuccess: () => qc.invalidateQueries(),
  });
}
export function useRemoveBudget() {
  const db = useDb();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => budgetService.removeBudget(db, id),
    onSuccess: () => qc.invalidateQueries(),
  });
}
export function useSetSetting() {
  const db = useDb();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (x: { key: string; value: string }) =>
      settingsRepo.set(db, x.key, x.value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}
export function useCategoryCreate() {
  const db = useDb();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (x: {
      name: string;
      type: "expense" | "income";
      icon: string;
      color: string;
    }) => categoryService.create(db, x),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}
export function useCategoryArchive() {
  const db = useDb();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => categoryService.archiveOrDelete(db, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}
export { budgetRepo, transactionRepo };
