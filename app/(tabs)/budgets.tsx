import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { format } from "date-fns";
import { ActionButton, AppText, Card, useColors } from "@/components/ui";
import { Screen, Row } from "@/components/screens";
import { AnalyticsPanel } from "@/components/AnalyticsPanel";
import { useBudgets, useSettings } from "@/hooks/useAppData";
import { addMonths, monthKey } from "@/utils/dates";
import { formatMoney } from "@/utils/money";

export default function Budgets() {
  const c = useColors();
  const router = useRouter();
  const [month, setMonth] = useState(monthKey(new Date()));
  const [view, setView] = useState<"budgets" | "analytics">("budgets");
  const q = useBudgets(month);
  const settings = useSettings();
  const currency = settings.data?.currency_code ?? "USD";
  const decimals = Number(settings.data?.currency_decimals ?? 2);
  const money = (minor: number) =>
    formatMoney(minor, { currency, locale: "en", decimals });
  const overall = q.data?.find((b) => b.categoryId === null);
  const categories = q.data?.filter((b) => b.categoryId !== null) ?? [];
  const editBudget = (categoryId?: number | null, budgetId?: number) =>
    router.push({
      pathname: "/budget/edit",
      params: {
        month,
        categoryId: categoryId === null ? "overall" : String(categoryId ?? ""),
        ...(budgetId ? { budgetId: String(budgetId) } : {}),
      },
    });

  return (
    <Screen>
      <Row>
        <AppText style={{ fontSize: 27, fontFamily: "Inter_700Bold" }}>
          Plan
        </AppText>
        <Row style={{ gap: 12 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            onPress={() => setMonth(addMonths(month, -1))}
          >
            <AppText>‹</AppText>
          </Pressable>
          <AppText>
            {format(new Date(`${month}-01T12:00:00`), "MMM yyyy")}
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next month"
            onPress={() => setMonth(addMonths(month, 1))}
            disabled={month >= monthKey(new Date())}
          >
            <AppText
              style={{
                color:
                  month >= monthKey(new Date())
                    ? c.textTertiary
                    : c.textPrimary,
              }}
            >
              ›
            </AppText>
          </Pressable>
        </Row>
      </Row>
      <View
        style={{
          flexDirection: "row",
          padding: 4,
          borderRadius: 24,
          backgroundColor: c.surfaceMuted,
        }}
      >
        {(["budgets", "analytics"] as const).map((item) => (
          <Pressable
            key={item}
            onPress={() => setView(item)}
            style={{
              flex: 1,
              padding: 11,
              alignItems: "center",
              borderRadius: 20,
              backgroundColor: view === item ? c.surface : "transparent",
            }}
          >
            <AppText>{item === "budgets" ? "Budgets" : "Analytics"}</AppText>
          </Pressable>
        ))}
      </View>
      {view === "analytics" ? (
        <AnalyticsPanel month={month} />
      ) : (
        <>
          <AppText style={{ fontSize: 19, fontFamily: "Inter_600SemiBold" }}>
            Monthly budgets
          </AppText>
          {overall ? (
            <Pressable onPress={() => editBudget(null, overall.id)}>
              <Card style={{ gap: 12 }}>
                <Row>
                  <AppText
                    style={{ fontSize: 17, fontFamily: "Inter_600SemiBold" }}
                  >
                    Overall
                  </AppText>
                  <AppText
                    style={{
                      color:
                        overall.spentMinor > overall.amountMinor
                          ? c.expense
                          : c.primary,
                    }}
                  >
                    {Math.round(
                      (overall.spentMinor / overall.amountMinor) * 100,
                    )}
                    %
                  </AppText>
                </Row>
                <AppText>
                  Spent {money(overall.spentMinor)} of{" "}
                  {money(overall.amountMinor)}
                </AppText>
                <View
                  style={{
                    height: 10,
                    borderRadius: 10,
                    backgroundColor: c.surfaceMuted,
                  }}
                >
                  <View
                    style={{
                      width: `${Math.min(100, (overall.spentMinor / overall.amountMinor) * 100)}%`,
                      height: 10,
                      borderRadius: 10,
                      backgroundColor:
                        overall.spentMinor > overall.amountMinor
                          ? c.expense
                          : c.primary,
                    }}
                  />
                </View>
                <AppText style={{ color: c.textSecondary }}>
                  {money(Math.max(0, overall.amountMinor - overall.spentMinor))}{" "}
                  remaining
                </AppText>
              </Card>
            </Pressable>
          ) : (
            <Card style={{ gap: 10 }}>
              <AppText
                style={{ fontSize: 18, fontFamily: "Inter_600SemiBold" }}
              >
                Plan your month
              </AppText>
              <AppText style={{ color: c.textSecondary }}>
                Set a monthly limit and keep your spending on track.
              </AppText>
              <ActionButton
                title="Create overall budget"
                onPress={() => editBudget(null)}
              />
            </Card>
          )}
          {categories.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => editBudget(b.categoryId, b.id)}
            >
              <Card style={{ gap: 10 }}>
                <Row>
                  <AppText style={{ fontFamily: "Inter_600SemiBold" }}>
                    {b.categoryName}
                  </AppText>
                  <AppText
                    style={{
                      color:
                        b.spentMinor / b.amountMinor >= 1
                          ? c.expense
                          : b.spentMinor / b.amountMinor >=
                              b.alertThresholdPct / 100
                            ? c.warning
                            : c.primary,
                    }}
                  >
                    {Math.round((b.spentMinor / b.amountMinor) * 100)}%
                  </AppText>
                </Row>
                <AppText>
                  {money(b.spentMinor)} / {money(b.amountMinor)}
                </AppText>
                <View
                  style={{
                    height: 8,
                    borderRadius: 8,
                    backgroundColor: c.surfaceMuted,
                  }}
                >
                  <View
                    style={{
                      width: `${Math.min(100, (b.spentMinor / b.amountMinor) * 100)}%`,
                      height: 8,
                      borderRadius: 8,
                      backgroundColor:
                        b.spentMinor / b.amountMinor > 1
                          ? c.expense
                          : b.spentMinor / b.amountMinor >=
                              b.alertThresholdPct / 100
                            ? c.warning
                            : c.primary,
                    }}
                  />
                </View>
              </Card>
            </Pressable>
          ))}
          <ActionButton
            title="Add a category budget"
            secondary
            onPress={() => editBudget()}
          />
        </>
      )}
    </Screen>
  );
}
