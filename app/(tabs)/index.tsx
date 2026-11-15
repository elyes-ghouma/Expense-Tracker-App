import React, { useState } from "react";
import { Pressable, RefreshControl, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { Screen, Row } from "@/components/screens";
import { AppText, Card, MoneyText, ProgressBar, SegmentedControl, CategoryBadge, useColors } from "@/components/ui";
import { useDashboard, useSettings } from "@/hooks/useAppData";
import { addMonths, monthKey } from "@/utils/dates";
import { formatMoney } from "@/utils/money";
import { useAppStore } from "@/store/appStore";
import { SpendingDonut } from "@/components/SpendingDonut";
import { LinearGradient } from "expo-linear-gradient";
import { budgetService } from "@/services/domain/budgetService";
export default function Dashboard() {
  const c = useColors();
  const router = useRouter();
  const [month, setMonth] = useState(monthKey(new Date()));
  const [hide, setHide] = useState(false);
  const [breakdownType, setBreakdownType] = useState<"expense" | "income">(
    "expense",
  );
  const privacy = useAppStore((s) => s.privacy);
  const q = useDashboard(month);
  const s = useSettings();
  const cur = s.data?.currency_code ?? "USD";
  const decimals = Number(s.data?.currency_decimals ?? 2);
  const money = (n: number) =>
    hide || privacy
      ? "••••••"
      : formatMoney(n, { currency: cur, locale: "en", decimals });
  const breakdown =
    breakdownType === "expense"
      ? (q.data?.breakdown ?? [])
      : (q.data?.incomeBreakdown ?? []);
  const breakdownTotal =
    breakdownType === "expense"
      ? (q.data?.expenseMinor ?? 0)
      : (q.data?.incomeMinor ?? 0);
  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={q.isRefetching}
          onRefresh={() => q.refetch()}
        />
      }
    >
      <Row>
        <View>
          <AppText variant="eyebrow" style={{ color: c.textSecondary }}>
            Overview
          </AppText>
          <AppText variant="titleLarge">
            Your money
          </AppText>
        </View>
        <Row style={{ gap: 12 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            onPress={() => setMonth(addMonths(month, -1))}
          >
            <Ionicons name="chevron-back" size={22} color={c.textPrimary} />
          </Pressable>
          <AppText style={{ fontFamily: "Inter_600SemiBold" }}>
            {format(new Date(`${month}-01T12:00:00`), "MMM yyyy")}
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next month"
            disabled={month >= monthKey(new Date())}
            onPress={() => setMonth(addMonths(month, 1))}
          >
            <Ionicons
              name="chevron-forward"
              size={22}
              color={
                month >= monthKey(new Date()) ? c.textTertiary : c.textPrimary
              }
            />
          </Pressable>
        </Row>
      </Row>
      <LinearGradient colors={[c.gradientStart, c.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ minHeight: 190, padding: 24, borderRadius: 24, gap: 16 }}>
        <Row>
          <AppText style={{ color: "#E8E9FF" }}>Total balance</AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Toggle hidden balances"
            onPress={() => setHide(!hide)}
          >
            <Ionicons
              name={hide || privacy ? "eye-off" : "eye-outline"}
              size={22}
              color="#fff"
            />
          </Pressable>
        </Row>
        <MoneyText
          adjustsFontSizeToFit
          numberOfLines={1}
          style={{ color: "#fff", fontSize: 38, lineHeight: 50, paddingVertical: 3, fontFamily: "Inter_700Bold" }}
        >
          {money(
            Number(s.data?.opening_balance_minor ?? 0) +
              (q.data?.balanceMinor ?? 0),
          )}
        </MoneyText>
        <Row>
          <View>
            <AppText style={{ color: "#DDDFFF", fontSize: 12 }}>
              Income this month
            </AppText>
            <AppText style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>
              +{money(q.data?.incomeMinor ?? 0)}
            </AppText>
          </View>
          <View>
            <AppText style={{ color: "#DDDFFF", fontSize: 12 }}>
              Spent this month
            </AppText>
            <AppText style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>
              −{money(q.data?.expenseMinor ?? 0)}
            </AppText>
          </View>
        </Row>
      </LinearGradient>
      <Row>
        <AppText style={{ fontSize: 19, fontFamily: "Inter_600SemiBold" }}>
          {breakdownType === "expense"
            ? "Spending by category"
            : "Income by category"}
        </AppText>
        <AppText style={{ color: c.textSecondary }}>
          {money(breakdownTotal)}
        </AppText>
      </Row>
      <SegmentedControl value={breakdownType} onChange={setBreakdownType} options={[{ value: "expense", label: "Expenses" }, { value: "income", label: "Income" }]} accessibilityLabel="Category totals" />
      <Card style={{ gap: 13 }}>
        <Row style={{ gap: 10, justifyContent: "flex-start" }}>
          <SpendingDonut
            items={breakdown.slice(0, 5)}
            center={money(breakdownTotal)}
          />
          <View style={{ flex: 1, gap: 13 }}>
            {breakdown.slice(0, 5).map((item) => (
              <Pressable
                key={item.category_id}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/history",
                    params: {
                      categoryId: String(item.category_id),
                      type: breakdownType,
                    },
                  })
                }
              >
                <Row style={{ gap: 8 }}>
                  <View
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 5,
                      backgroundColor: item.color,
                    }}
                  />
                  <AppText numberOfLines={1} style={{ flex: 1, fontSize: 13 }}>
                    {item.name}
                  </AppText>
                  <AppText style={{ fontSize: 12, color: c.textSecondary }}>
                    {Math.round((item.total / (breakdownTotal || 1)) * 100)}%
                  </AppText>
                </Row>
              </Pressable>
            ))}
          </View>
        </Row>
        {!breakdown.length && (
          <AppText style={{ color: c.textSecondary }}>
            Your transactions will appear here.
          </AppText>
        )}
      </Card>
      <Row>
        <AppText style={{ fontSize: 19, fontFamily: "Inter_600SemiBold" }}>
          Monthly budget
        </AppText>
        <Pressable
          onPress={() =>
            router.push({ pathname: "/budget/edit", params: { month } })
          }
        >
          <AppText style={{ color: c.primary }}>Set budget</AppText>
        </Pressable>
      </Row>
      {q.data?.budgets.filter((b) => b.categoryId === null).map((b) => {
        const alertMinor = budgetService.alertThresholdMinor(b);
        const ratio = b.spentMinor / b.amountMinor;
        const reached = b.spentMinor >= alertMinor;
        const over = b.spentMinor >= b.amountMinor;
        const statusColor = over ? c.expense : reached ? c.warning : c.primary;
        return <Card key={b.id} style={{ gap: 12 }}>
          <Row>
            <View style={{ gap: 3 }}><AppText variant="titleSmall">Monthly limit</AppText><AppText variant="caption" style={{ color: c.textSecondary }}>{money(b.spentMinor)} of {money(b.amountMinor)}</AppText></View>
            <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: over ? c.expenseSoft : reached ? c.warningSoft : c.primarySoft }}><AppText variant="captionStrong" style={{ color: statusColor }}>{over ? "Over limit" : reached ? "Alert reached" : `${Math.round(ratio * 100)}% used`}</AppText></View>
          </Row>
          <ProgressBar progress={ratio * 100} color={statusColor} />
          <Row><AppText variant="caption" style={{ color: c.textSecondary }}>{money(Math.max(0, b.amountMinor - b.spentMinor))} remaining</AppText><AppText variant="footnote" style={{ color: reached ? statusColor : c.textTertiary }}>Alert at {money(alertMinor)}</AppText></Row>
        </Card>;
      })}
      <Row>
        <AppText style={{ fontSize: 19, fontFamily: "Inter_600SemiBold" }}>
          Recent transactions
        </AppText>
        <Pressable onPress={() => router.push("/(tabs)/history")}>
          <AppText style={{ color: c.primary }}>See all</AppText>
        </Pressable>
      </Row>
      <Card style={{ gap: 16 }}>
        {q.data?.recent.length ? (
          q.data.recent.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => router.push(`/transaction/${t.id}`)}
            >
              <Row style={{ gap: 10 }}>
                <CategoryBadge icon={t.categoryIcon} color={t.categoryColor} />
                <View style={{ flex: 1 }}>
                  <AppText style={{ fontFamily: "Inter_600SemiBold" }}>
                    {t.categoryName}
                  </AppText>
                  <AppText style={{ fontSize: 12, color: c.textSecondary }}>
                    {t.note || t.date}
                  </AppText>
                </View>
                <MoneyText
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    color: t.type === "income" ? c.income : c.textPrimary,
                  }}
                >
                  {t.type === "income" ? "+" : "−"}
                  {money(t.amountMinor)}
                </MoneyText>
              </Row>
            </Pressable>
          ))
        ) : (
          <AppText style={{ color: c.textSecondary }}>
            Add your first transaction to get started.
          </AppText>
        )}
      </Card>
    </Screen>
  );
}
