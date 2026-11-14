import React, { useState } from "react";
import { Pressable, RefreshControl, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { Screen, Row } from "@/components/screens";
import { AppText, Card, useColors } from "@/components/ui";
import { useDashboard, useSettings } from "@/hooks/useAppData";
import { addMonths, monthKey } from "@/utils/dates";
import { formatMoney } from "@/utils/money";
import { useAppStore } from "@/store/appStore";
import { SpendingDonut } from "@/components/SpendingDonut";
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
          <AppText style={{ fontSize: 12, color: c.textSecondary }}>
            OVERVIEW
          </AppText>
          <AppText style={{ fontSize: 27, fontFamily: "Inter_700Bold" }}>
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
      <Card style={{ backgroundColor: c.primary, borderWidth: 0, gap: 14 }}>
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
        <AppText
          adjustsFontSizeToFit
          numberOfLines={1}
          style={{ color: "#fff", fontSize: 38, fontFamily: "Inter_700Bold" }}
        >
          {money(
            Number(s.data?.opening_balance_minor ?? 0) +
              (q.data?.balanceMinor ?? 0),
          )}
        </AppText>
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
      </Card>
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
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["expense", "income"] as const).map((type) => (
          <Pressable
            key={type}
            accessibilityRole="button"
            onPress={() => setBreakdownType(type)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 13,
              borderRadius: 18,
              backgroundColor:
                breakdownType === type ? c.primarySoft : c.surface,
            }}
          >
            <AppText
              style={{
                color: breakdownType === type ? c.primary : c.textSecondary,
              }}
            >
              {type === "expense" ? "Expenses" : "Income"}
            </AppText>
          </Pressable>
        ))}
      </View>
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
      {q.data?.budgets
        .filter((b) => b.categoryId === null)
        .map((b) => (
          <Card key={b.id} style={{ gap: 10 }}>
            <Row>
              <AppText>
                Spent {money(b.spentMinor)} of {money(b.amountMinor)}
              </AppText>
              <AppText
                style={{
                  color: b.spentMinor > b.amountMinor ? c.expense : c.primary,
                }}
              >
                {Math.min(
                  100,
                  Math.round((b.spentMinor / b.amountMinor) * 100),
                )}
                %
              </AppText>
            </Row>
            <View
              style={{
                height: 9,
                borderRadius: 8,
                backgroundColor: c.surfaceMuted,
              }}
            >
              <View
                style={{
                  height: 9,
                  borderRadius: 8,
                  width: `${Math.min(100, (b.spentMinor / b.amountMinor) * 100)}%`,
                  backgroundColor:
                    b.spentMinor > b.amountMinor ? c.expense : c.primary,
                }}
              />
            </View>
          </Card>
        ))}
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
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 14,
                    backgroundColor: `${t.categoryColor}22`,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name={t.categoryIcon as never}
                    size={20}
                    color={t.categoryColor}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={{ fontFamily: "Inter_600SemiBold" }}>
                    {t.categoryName}
                  </AppText>
                  <AppText style={{ fontSize: 12, color: c.textSecondary }}>
                    {t.note || t.date}
                  </AppText>
                </View>
                <AppText
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    color: t.type === "income" ? c.income : c.textPrimary,
                  }}
                >
                  {t.type === "income" ? "+" : "−"}
                  {money(t.amountMinor)}
                </AppText>
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
