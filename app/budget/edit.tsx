import React, { useEffect, useState } from "react";
import { Alert, Pressable, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useQueryClient } from "@tanstack/react-query";
import { Screen, Row } from "@/components/screens";
import { ActionButton, AppText, useColors } from "@/components/ui";
import {
  useBudgets,
  useCategories,
  useRemoveBudget,
  useSetBudget,
  useSettings,
} from "@/hooks/useAppData";
import { parseToMinor } from "@/utils/money";
import { addMonths } from "@/utils/dates";
import type { Db } from "@/types/domain";
import { budgetRepo } from "@/services/database/repositories/budgetRepo";

export default function BudgetEditor() {
  const c = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{
    month?: string;
    categoryId?: string;
    budgetId?: string;
  }>();
  const month = params.month ?? new Date().toISOString().slice(0, 7);
  const editing = Boolean(params.budgetId);
  const categories = useCategories("expense");
  const budgets = useBudgets(month);
  const settings = useSettings();
  const db = useSQLiteContext() as unknown as Db;
  const queryClient = useQueryClient();
  const decimals = Number(settings.data?.currency_decimals ?? 2);
  const [categoryId, setCategoryId] = useState<number | null>(
    params.categoryId === "overall"
      ? null
      : params.categoryId
        ? Number(params.categoryId)
        : null,
  );
  const [amount, setAmount] = useState("");
  const [threshold, setThreshold] = useState(80);
  const save = useSetBudget();
  const remove = useRemoveBudget();
  const current = budgets.data?.find(
    (budget) => budget.id === Number(params.budgetId),
  );

  useEffect(() => {
    if (current) {
      setAmount(String(current.amountMinor / 10 ** decimals));
      setCategoryId(current.categoryId);
      setThreshold(current.alertThresholdPct);
    }
  }, [current, decimals]);

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
      <AppText style={{ fontFamily: "Inter_600SemiBold" }}>
        Alert at {threshold}%
      </AppText>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {[50, 60, 70, 80, 90, 100].map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityLabel={`Alert at ${value}%`}
            onPress={() => setThreshold(value)}
            style={{
              padding: 9,
              borderRadius: 18,
              backgroundColor: threshold === value ? c.primary : c.surface,
            }}
          >
            <AppText
              style={{
                color: threshold === value ? c.onPrimary : c.textPrimary,
              }}
            >
              {value}
            </AppText>
          </Pressable>
        ))}
      </View>
      <ActionButton
        title="Save budget"
        loading={save.isPending}
        onPress={async () => {
          try {
            const amountMinor = parseToMinor(amount, decimals);
            await save.mutateAsync({
              categoryId,
              month,
              amountMinor,
              alertThresholdPct: threshold,
            });
            const spent = current?.spentMinor ?? 0;
            if (spent >= amountMinor)
              Alert.alert(
                "Budget exceeded",
                "Spending for this budget is already over the limit.",
              );
            else if (spent >= (amountMinor * threshold) / 100)
              Alert.alert(
                "Budget alert",
                `${threshold}% of this budget has been used.`,
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
                  onPress: async () => {
                    await budgetRepo.copyMonth(db, addMonths(month, -1), month);
                    await queryClient.invalidateQueries({
                      queryKey: ["budgets", month],
                    });
                  },
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
