import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen, Row } from "@/components/screens";
import { ActionButton, AppText, Card, CategoryBadge, MoneyText, SegmentedControl, useColors } from "@/components/ui";
import {
  useCategories,
  useSettings,
  useTransactions,
  useTxSummary,
} from "@/hooks/useAppData";
import { formatMoney } from "@/utils/money";
import { addDays, subDays } from "date-fns";
import { monthKey, monthRange, toDayKey } from "@/utils/dates";

export default function History() {
  const c = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{
    categoryId?: string;
    type?: string;
    at?: string;
  }>();
  const settings = useSettings();
  const currency = settings.data?.currency_code ?? "USD";
  const decimals = Number(settings.data?.currency_decimals ?? 2);
  const [type, setType] = useState<"all" | "expense" | "income">(
    params.type === "expense" || params.type === "income" ? params.type : "all",
  );
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selected, setSelected] = useState(
    params.categoryId ? Number(params.categoryId) : undefined,
  );
  const [period, setPeriod] = useState<"month" | "30days" | "all">("month");
  // The tab stays mounted, so apply filters again whenever the dashboard
  // links here with new params (`at` changes on every tap).
  useEffect(() => {
    if (params.type === "expense" || params.type === "income")
      setType(params.type);
    if (params.categoryId) setSelected(Number(params.categoryId));
  }, [params.categoryId, params.type, params.at]);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const categories = useCategories(type === "all" ? undefined : type);
  const [monthFrom, monthTo] = monthRange(monthKey(new Date()));
  const dateFrom =
    period === "month"
      ? monthFrom
      : period === "30days"
        ? toDayKey(subDays(new Date(), 29))
        : undefined;
  const dateTo =
    period === "all"
      ? undefined
      : period === "month"
        ? monthTo
        : toDayKey(addDays(new Date(), 1));
  const filter = {
    type: type === "all" ? undefined : type,
    categoryIds: selected ? [selected] : undefined,
    search: debouncedSearch || undefined,
    dateFrom,
    dateTo,
  };
  const q = useTransactions(filter);
  const total = useTxSummary(filter);
  const items = q.data?.pages.flatMap((page) => page.items) ?? [];
  const money = (minor: number) =>
    formatMoney(minor, { currency, locale: "en", decimals });

  return (
    <Screen>
      <AppText style={{ fontSize: 28, fontFamily: "Inter_700Bold" }}>
        Transactions
      </AppText>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search notes or categories"
        placeholderTextColor={c.textTertiary}
        accessibilityLabel="Search transactions"
        style={{
          backgroundColor: c.surface,
          padding: 14,
          borderRadius: 14,
          color: c.textPrimary,
        }}
      />
      <SegmentedControl value={type} onChange={setType} accessibilityLabel="Transaction type" options={[{ value: "all", label: "All" }, { value: "expense", label: "Expenses" }, { value: "income", label: "Income" }]} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}><SegmentedControl value={period} onChange={setPeriod} accessibilityLabel="Transaction period" options={[{ value: "month", label: "Month" }, { value: "30days", label: "30 days" }, { value: "all", label: "All time" }]} /></View>
        {(selected || search || type !== "all" || period !== "month") && (
          <Pressable
            onPress={() => {
              setSelected(undefined);
              setSearch("");
              setType("all");
              setPeriod("month");
            }}
          >
            <AppText style={{ padding: 8, color: c.primary }}>Clear</AppText>
          </Pressable>
        )}
      </View>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <Pressable
          onPress={() => setSelected(undefined)}
          style={{
            padding: 8,
            borderRadius: 18,
            backgroundColor: !selected ? c.primarySoft : c.surface,
          }}
        >
          <AppText>All categories</AppText>
        </Pressable>
        {categories.data?.map((category) => (
          <Pressable
            key={category.id}
            onPress={() =>
              setSelected(selected === category.id ? undefined : category.id)
            }
            style={{
              padding: 8,
              borderRadius: 18,
              backgroundColor:
                selected === category.id ? c.primarySoft : c.surface,
            }}
          >
            <AppText>{category.name}</AppText>
          </Pressable>
        ))}
      </View>
      <Card>
        <Row>
          <AppText>{total.data?.count ?? 0} results</AppText>
          <AppText style={{ color: c.income }}>
            +{money(total.data?.incomeMinor ?? 0)}
          </AppText>
          <AppText style={{ color: c.expense }}>
            −{money(total.data?.expenseMinor ?? 0)}
          </AppText>
        </Row>
      </Card>
      {q.isError && (
        <Card>
          <AppText style={{ color: c.expense }}>
            Could not load transactions.
          </AppText>
          <Pressable onPress={() => q.refetch()}>
            <AppText style={{ color: c.primary }}>Retry</AppText>
          </Pressable>
        </Card>
      )}
      {items.map((tx) => (
        <Pressable
          key={tx.id}
          accessibilityRole="button"
          accessibilityLabel={`${tx.type}, ${money(tx.amountMinor)}, ${tx.categoryName}, ${tx.date}${tx.note ? `, note: ${tx.note}` : ""}`}
          onPress={() => router.push(`/transaction/${tx.id}`)}
        >
          <Card style={{ padding: 14 }}>
            <Row style={{ gap: 12 }}>
              <CategoryBadge icon={tx.categoryIcon} color={tx.categoryColor} />
              <View style={{ flex: 1 }}>
                <AppText style={{ fontFamily: "Inter_600SemiBold" }}>
                  {tx.categoryName}
                </AppText>
                <AppText style={{ fontSize: 12, color: c.textSecondary }}>
                  {tx.note || tx.date}
                </AppText>
              </View>
              <MoneyText
                style={{
                  fontFamily: "Inter_600SemiBold",
                  color: tx.type === "income" ? c.income : c.textPrimary,
                }}
              >
                {tx.type === "income" ? "+" : "−"}
                {money(tx.amountMinor)}
              </MoneyText>
            </Row>
          </Card>
        </Pressable>
      ))}
      {q.isPending && <ActivityIndicator color={c.primary} />}
      {!q.isPending && !items.length && !q.isError && (
        <AppText
          style={{ color: c.textSecondary, textAlign: "center", padding: 24 }}
        >
          No matching transactions. Try clearing your filters or add a
          transaction.
        </AppText>
      )}
      {q.hasNextPage && (
        <ActionButton
          title={q.isFetchingNextPage ? "Loading…" : "Load more"}
          secondary
          loading={q.isFetchingNextPage}
          onPress={() => q.fetchNextPage()}
        />
      )}
    </Screen>
  );
}
