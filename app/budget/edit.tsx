import React, { useEffect, useState } from "react";
import { Alert, Pressable, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen, Row } from "@/components/screens";
import { ActionButton, AppText, SegmentedControl, useColors } from "@/components/ui";
import * as Haptics from "expo-haptics";
import {
  useBudgets,
  useCopyBudgets,
  useCategories,
  useRemoveBudget,
  useSetBudget,
  useSettings,
} from "@/hooks/useAppData";
import { formatMoney, parseToMinor } from "@/utils/money";
import { addMonths, monthKey } from "@/utils/dates";

export default function BudgetEditor() {
  const c = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{
    month?: string;
    categoryId?: string;
    budgetId?: string;
  }>();
  const month = params.month ?? monthKey(new Date());
  const editing = Boolean(params.budgetId);
  const categories = useCategories("expense");
  const budgets = useBudgets(month);
  const settings = useSettings();
  const decimals = Number(settings.data?.currency_decimals ?? 2);
  const currency = settings.data?.currency_code ?? "USD";
  const [categoryId, setCategoryId] = useState<number | null>(
    params.categoryId === "overall"
      ? null
      : params.categoryId
        ? Number(params.categoryId)
        : null,
  );
  const [amount, setAmount] = useState("");
  const [alertMode, setAlertMode] = useState<"percent" | "cash">("percent");
  const [alertValue, setAlertValue] = useState("80");
  const save = useSetBudget();
  const remove = useRemoveBudget();
  const copy = useCopyBudgets();
  const current = budgets.data?.find(
    (budget) => budget.id === Number(params.budgetId),
  );

  useEffect(() => {
    if (current) {
      setAmount(String(current.amountMinor / 10 ** decimals));
      setCategoryId(current.categoryId);
      const mode = current.alertThresholdMode ?? "percent";
      setAlertMode(mode);
      setAlertValue(
        mode === "cash"
          ? String((current.alertThresholdValue ?? 0) / 10 ** decimals)
          : String(current.alertThresholdValue ?? current.alertThresholdPct),
      );
    }
  }, [current, decimals]);

  let amountMinor: number | null = null;
  let alertThresholdMinor: number | null = null;
  let numericAlertValue: number | null = null;
  try {
    amountMinor = parseToMinor(amount, decimals);
    numericAlertValue = alertMode === "percent"
      ? Number(alertValue)
      : parseToMinor(alertValue, decimals);
    if (numericAlertValue > 0 && Number.isFinite(numericAlertValue)) {
      alertThresholdMinor = alertMode === "percent"
        ? Math.round((amountMinor * numericAlertValue) / 100)
        : numericAlertValue;
    }
  } catch {
    // Keep the preview hidden until both fields contain valid input.
  }

  return (
    <Screen>
      <Row>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.back()}
        >
          <AppText style={{ fontSize: 24 }}>×</AppText>
        </Pressable>
        <AppText style={{ fontSize: 20, fontFamily: "Inter_600SemiBold" }}>
          {editing ? "Edit budget" : "Set a budget"}
        </AppText>
        <View style={{ width: 20 }} />
      </Row>
      <AppText style={{ color: c.textSecondary }}>
        Monthly limit for {month}
      </AppText>
      {!editing && (
        <>
          <AppText style={{ fontFamily: "Inter_600SemiBold" }}>
            Budget type
          </AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Pressable
              onPress={() => setCategoryId(null)}
              style={{
                padding: 10,
                borderRadius: 16,
                backgroundColor:
                  categoryId === null ? c.primarySoft : c.surface,
              }}
            >
              <AppText>Overall</AppText>
            </Pressable>
            {categories.data
              ?.filter(
                (category) =>
                  !budgets.data?.some(
                    (budget) => budget.categoryId === category.id,
                  ),
              )
              .map((category) => (
                <Pressable
                  key={category.id}
                  onPress={() => setCategoryId(category.id)}
                  style={{
                    padding: 10,
                    borderRadius: 16,
                    backgroundColor:
                      categoryId === category.id ? c.primarySoft : c.surface,
                  }}
                >
                  <AppText>{category.name}</AppText>
                </Pressable>
              ))}
          </View>
        </>
      )}
      <TextInput
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="Monthly limit"
        accessibilityLabel="Monthly limit"
        placeholderTextColor={c.textTertiary}
        style={{
          fontSize: 28,
          padding: 16,
          color: c.textPrimary,
          backgroundColor: c.surface,
          borderRadius: 14,
        }}
      />
      <AppText style={{ fontFamily: "Inter_600SemiBold" }}>Alert threshold</AppText>
      <SegmentedControl value={alertMode} accessibilityLabel="Alert limit type" options={[{ value: "percent", label: "Percent (%)" }, { value: "cash", label: "Cash Amount" }]} onChange={(mode) => {
              if (settings.data?.haptics_enabled !== "0") void Haptics.selectionAsync();
              if (alertMode === mode) return;
              if (amountMinor && amountMinor > 0 && numericAlertValue) {
                if (mode === "cash") {
                  const nextMinor = Math.round((amountMinor * Number(alertValue)) / 100);
                  setAlertValue(String(nextMinor / 10 ** decimals));
                } else {
                  const nextPercent = Math.round((parseToMinor(alertValue, decimals) / amountMinor) * 100);
                  setAlertValue(String(Math.max(1, Math.min(100, nextPercent))));
                }
              }
              setAlertMode(mode);
            }} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <TextInput
          value={alertValue}
          onChangeText={setAlertValue}
          keyboardType="decimal-pad"
          placeholder={alertMode === "percent" ? "80" : "Alert amount"}
          accessibilityLabel="Alert threshold value"
          placeholderTextColor={c.textTertiary}
          style={{
            flex: 1,
            fontSize: 20,
            padding: 14,
            color: c.textPrimary,
            backgroundColor: c.surface,
            borderRadius: 14,
          }}
        />
        <AppText style={{ color: c.textSecondary }}>
          {alertMode === "percent" ? "%" : currency}
        </AppText>
      </View>
      {alertMode === "percent" && (
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {[50, 60, 70, 80, 90, 100].map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityLabel={`Set alert to ${value}%`}
              onPress={() => setAlertValue(String(value))}
              style={{
                padding: 9,
                borderRadius: 18,
                backgroundColor: alertValue === String(value) ? c.primary : c.surface,
              }}
            >
              <AppText style={{ color: alertValue === String(value) ? c.onPrimary : c.textPrimary }}>
                {value}
              </AppText>
            </Pressable>
          ))}
        </View>
      )}
      {alertThresholdMinor !== null && amountMinor !== null && (
        <AppText accessibilityLabel={`Alert preview ${formatMoney(alertThresholdMinor, { currency, locale: "en", decimals })}`} style={{ color: c.textSecondary }}>
          {alertMode === "percent" ? `= ${formatMoney(alertThresholdMinor, { currency, locale: "en", decimals })} at ${alertValue}%` : `Alert when spending reaches ${formatMoney(alertThresholdMinor, { currency, locale: "en", decimals })}`}
        </AppText>
      )}
      <ActionButton
        title="Save budget"
        loading={save.isPending}
        onPress={async () => {
          try {
            const amountMinor = parseToMinor(amount, decimals);
            const thresholdValue = alertMode === "percent"
              ? Number(alertValue)
              : parseToMinor(alertValue, decimals);
            if (!Number.isInteger(thresholdValue) || thresholdValue < 1 || (alertMode === "percent" && thresholdValue > 100))
              throw new Error(alertMode === "percent" ? "Enter a whole percentage from 1 to 100" : "Enter a valid cash amount");
            await save.mutateAsync({
              categoryId,
              month,
              amountMinor,
              alertThresholdPct: alertMode === "percent"
                ? thresholdValue
                : Math.max(1, Math.round((thresholdValue / amountMinor) * 100)),
              alertThresholdMode: alertMode,
              alertThresholdValue: thresholdValue,
            });
            const spent = current?.spentMinor ?? 0;
            if (spent >= amountMinor)
              Alert.alert(
                "Budget exceeded",
                "Spending for this budget is already over the limit.",
              );
            else if (spent >= (alertThresholdMinor ?? 0))
              Alert.alert(
                "Budget alert",
                alertMode === "percent"
                  ? `${alertValue}% of this budget has been used.`
                  : `${formatMoney(alertThresholdMinor ?? 0, { currency, locale: "en", decimals })} alert amount reached.`,
              );
            router.back();
          } catch (error) {
            Alert.alert(
              "Could not save budget",
              error instanceof Error ? error.message : String(error),
            );
          }
        }}
      />
      {current && (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            Alert.alert(
              "Remove budget?",
              "This removes the limit for this month.",
              [
                { text: "Cancel" },
                {
                  text: "Remove",
                  style: "destructive",
                  onPress: async () => {
                    await remove.mutateAsync(current.id);
                    router.back();
                  },
                },
              ],
            )
          }
        >
          <AppText style={{ color: c.expense, textAlign: "center" }}>
            Remove budget
          </AppText>
        </Pressable>
      )}
      {!editing && (
        <Pressable
          onPress={() =>
            Alert.alert(
              "Copy previous month?",
              "Copy budget limits from the previous month.",
              [
                { text: "Cancel" },
                {
                  text: "Copy",
                  onPress: () =>
                    copy.mutate(
                      { from: addMonths(month, -1), to: month },
                      {
                        onError: (error) =>
                          Alert.alert("Could not copy budgets", error.message),
                      },
                    ),
                },
              ],
            )
          }
        >
          <AppText style={{ textAlign: "center", color: c.primary }}>
            Copy last month
          </AppText>
        </Pressable>
      )}
    </Screen>
  );
}
