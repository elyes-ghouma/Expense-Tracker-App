import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { AppText, Card, useColors } from "@/components/ui";
import { useAnalytics, useSettings } from "@/hooks/useAppData";
import { formatMoney } from "@/utils/money";
import type { MonthKey } from "@/types/domain";
export function AnalyticsPanel({ month }: { month: MonthKey }) {
  const c = useColors();
  const [period, setPeriod] = useState(6);
  const q = useAnalytics(month, period);
  const settings = useSettings();
  const money = (minor: number) =>
    formatMoney(minor, {
      currency: settings.data?.currency_code ?? "USD",
      locale: "en",
      decimals: Number(settings.data?.currency_decimals ?? 2),
    });
  const max = Math.max(
    1,
    ...(q.data?.trend ?? []).flatMap((x) => [x.income, x.expense]),
  );
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[3, 6, 12].map((n) => (
          <Pressable
            key={n}
            onPress={() => setPeriod(n)}
            style={{
              padding: 9,
              borderRadius: 18,
              backgroundColor: period === n ? c.primarySoft : c.surface,
            }}
          >
            <AppText
              style={{ color: period === n ? c.primary : c.textSecondary }}
            >
              {n}M
            </AppText>
          </Pressable>
        ))}
      </View>
      <Card style={{ gap: 14 }}>
        <AppText style={{ fontSize: 18, fontFamily: "Inter_600SemiBold" }}>
          Monthly trend
        </AppText>
        {q.data?.trend.map((t) => (
          <View key={t.month} style={{ gap: 5 }}>
            <AppText style={{ fontSize: 12, color: c.textSecondary }}>
              {t.month}
            </AppText>
            <View
              style={{
                height: 8,
                borderRadius: 6,
                backgroundColor: c.surfaceMuted,
              }}
            >
              <View
                style={{
                  height: 8,
                  borderRadius: 6,
                  width: `${Math.max(2, (t.expense / max) * 100)}%`,
                  backgroundColor: c.expense,
                }}
              />
            </View>
            <View
              style={{
                height: 8,
                borderRadius: 6,
                backgroundColor: c.surfaceMuted,
              }}
            >
              <View
                style={{
                  height: 8,
                  borderRadius: 6,
                  width: `${Math.max(2, (t.income / max) * 100)}%`,
                  backgroundColor: c.income,
                }}
              />
            </View>
            <AppText style={{ fontSize: 11, color: c.textTertiary }}>
              Spent {money(t.expense)} · Income {money(t.income)}
            </AppText>
          </View>
        ))}
        {!q.data?.trend.length && (
          <AppText style={{ color: c.textSecondary }}>
            No activity in this period yet.
          </AppText>
        )}
      </Card>
      <Card style={{ gap: 10 }}>
        <AppText style={{ fontSize: 18, fontFamily: "Inter_600SemiBold" }}>
          Month comparison
        </AppText>
        <AppText>
          Spent {money(q.data?.comparison.current ?? 0)} this month
        </AppText>
        <AppText
          style={{
            color: (q.data?.comparison.delta ?? 0) > 0 ? c.expense : c.income,
          }}
        >
          {(q.data?.comparison.delta ?? 0) > 0 ? "↑" : "↓"}{" "}
          {money(Math.abs(q.data?.comparison.delta ?? 0))} vs previous month
        </AppText>
      </Card>
      <Card style={{ gap: 10 }}>
        <AppText style={{ fontSize: 18, fontFamily: "Inter_600SemiBold" }}>
          Category share
        </AppText>
        {q.data?.breakdown.slice(0, 5).map((x, i) => (
          <View
            key={x.category_id}
            style={{ flexDirection: "row", gap: 10, alignItems: "center" }}
          >
            <AppText style={{ color: c.textSecondary, width: 20 }}>
              {i + 1}
            </AppText>
            <View
              style={{
                width: 9,
                height: 9,
                borderRadius: 5,
                backgroundColor: x.color,
              }}
            />
            <AppText style={{ flex: 1 }}>{x.name}</AppText>
            <AppText>{money(x.total)}</AppText>
          </View>
        ))}
        {!q.data?.breakdown.length && (
          <AppText style={{ color: c.textSecondary }}>
            No spending recorded this month.
          </AppText>
        )}
      </Card>
      <Card style={{ gap: 10 }}>
        <AppText style={{ fontSize: 18, fontFamily: "Inter_600SemiBold" }}>
          Daily spending
        </AppText>
        {q.data?.insights.daily.slice(-7).map((d) => (
          <View
            key={d.day}
            style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
          >
            <AppText
              style={{ width: 40, fontSize: 12, color: c.textSecondary }}
            >
              {d.day.slice(-2)}
            </AppText>
            <View
              style={{
                height: 8,
                flex: 1,
                borderRadius: 6,
                backgroundColor: c.surfaceMuted,
              }}
            >
              <View
                style={{
                  height: 8,
                  width: `${Math.max(2, (d.total / Math.max(1, ...q.data.insights.daily.map((x) => x.total))) * 100)}%`,
                  backgroundColor: c.expense,
                  borderRadius: 6,
                }}
              />
            </View>
            <AppText style={{ fontSize: 12 }}>{money(d.total)}</AppText>
          </View>
        ))}
        <AppText style={{ color: c.textSecondary }}>
          Daily average: {money(q.data?.insights.averageDailySpend ?? 0)}
        </AppText>
        <AppText style={{ color: c.textSecondary }}>
          Highest spend day:{" "}
          {q.data?.insights.topSpendDay?.day ?? "No activity"}
        </AppText>
      </Card>
    </View>
  );
}
