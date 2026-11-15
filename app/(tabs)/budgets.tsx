import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { format } from "date-fns";
import { ActionButton, AppText, Card, ProgressBar, SegmentedControl, useColors } from "@/components/ui";
import { Screen, Row } from "@/components/screens";
import { AnalyticsPanel } from "@/components/AnalyticsPanel";
import { useBudgets, useSettings } from "@/hooks/useAppData";
import { addMonths, monthKey } from "@/utils/dates";
import { formatMoney } from "@/utils/money";
import { budgetService } from "@/services/domain/budgetService";

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
      <SegmentedControl value={view} onChange={setView} options={[{ value: "budgets", label: "Budgets" }, { value: "analytics", label: "Analytics" }]} accessibilityLabel="Plan view" />
      {view === "analytics" ? (
        <AnalyticsPanel month={month} />
      ) : (
        <>
          <AppText style={{ fontSize: 19, fontFamily: "Inter_600SemiBold" }}>
            Monthly budgets
          </AppText>
          {overall ? (
            <Pressable onPress={() => editBudget(null, overall.id)}>
              {(() => {
                const alertMinor = budgetService.alertThresholdMinor(overall);
                const exceeded = overall.spentMinor >= overall.amountMinor;
                const reached = overall.spentMinor >= alertMinor;
                const alertColor = exceeded ? c.expense : reached ? c.warning : c.primary;
                return (
              <Card style={{ gap: 12 }}>
                <Row>
                  <AppText
                    style={{ fontSize: 17, fontFamily: "Inter_600SemiBold" }}
                  >
                    Overall
                  </AppText>
                  <AppText style={{ color: alertColor }}>{exceeded ? "Over limit" : reached ? "Alert reached" : `${Math.round((overall.spentMinor / overall.amountMinor) * 100)}% used`}</AppText>
                </Row>
                <AppText>
                  Spent {money(overall.spentMinor)} of{" "}
                  {money(overall.amountMinor)}
                </AppText>
                <ProgressBar progress={(overall.spentMinor / overall.amountMinor) * 100} color={alertColor} />
                <AppText style={{ color: c.textSecondary }}>
                  {money(Math.max(0, overall.amountMinor - overall.spentMinor))}{" "}
                  remaining
                </AppText>
                <AppText variant="footnote" style={{ color: reached ? alertColor : c.textTertiary }}>Alert at {money(alertMinor)}</AppText>
              </Card>
                );
              })()}
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
                          : b.spentMinor >= budgetService.alertThresholdMinor(b)
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
                          : b.spentMinor >= budgetService.alertThresholdMinor(b)
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
