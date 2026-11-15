import React, { useMemo, useState } from "react";
import { Alert, Pressable, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { format, subDays } from "date-fns";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import { Screen, Row } from "@/components/screens";
import { ActionButton, AppText, Card, useColors } from "@/components/ui";
import {
  useCategories,
  useFrequentCategories,
  useSettings,
  useTransactionMutations,
} from "@/hooks/useAppData";
import { parseToMinor } from "@/utils/money";
import { toDayKey } from "@/utils/dates";
import { useSQLiteContext } from "expo-sqlite";
import { transactionRepo } from "@/services/database/repositories/transactionRepo";
import type { Db, Transaction } from "@/types/domain";
import { useQuery } from "@tanstack/react-query";
export default function TransactionScreen() {
  const c = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const db = useSQLiteContext() as unknown as Db;
  const settings = useSettings();
  const decimals = Number(settings.data?.currency_decimals ?? 2);
  const currency = settings.data?.currency_code ?? "USD";
  const edit = useQuery({
    queryKey: ["transaction", id],
    queryFn: () => transactionRepo.getById(db, Number(id)),
    enabled: !!id,
  });
  const [type, setType] = useState<"expense" | "income">(
    edit.data?.type ?? "expense",
  );
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>(
    edit.data?.categoryId,
  );
  const [date, setDate] = useState(toDayKey(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [note, setNote] = useState("");
  const categories = useCategories(type, Boolean(id));
  const frequent = useFrequentCategories(type);
  const mutations = useTransactionMutations();
  React.useEffect(() => {
    if (edit.data) {
      setType(edit.data.type);
      setCategoryId(edit.data.categoryId);
      setAmount(String(edit.data.amountMinor / 10 ** decimals));
      setDate(edit.data.date);
      setNote(edit.data.note ?? "");
    }
  }, [edit.data, decimals]);
  const cleanAmount = useMemo(() => amount.replace(",", "."), [amount]);
  const add = (key: string) => {
    if (key === "del") {
      setAmount((x) => x.slice(0, -1));
      return;
    }
    if (key === "clear") {
      setAmount("");
      return;
    }
    const next = amount + key;
    if (
      next.length > 13 ||
      (/^\d+\.\d+$/.test(next) && next.split(".")[1].length >= decimals)
    )
      return;
    setAmount(next);
  };
  const save = async () => {
    try {
      if (!categoryId) throw new Error("Choose a category");
      const amountMinor = parseToMinor(cleanAmount, decimals);
      const input = { type, amountMinor, categoryId, note, date };
      if (id) await mutations.update.mutateAsync({ id: Number(id), input });
      else await mutations.create.mutateAsync(input);
      if (settings.data?.haptics_enabled !== "0") {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      }
      router.back();
    } catch (e) {
      Alert.alert(
        "Check your transaction",
        e instanceof Error ? e.message : "Could not save transaction",
      );
    }
  };
  const remove = () =>
    Alert.alert(
      "Delete transaction?",
      "You can restore it from the confirmation.",
      [
        { text: "Cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (id) {
              const removed = await mutations.remove.mutateAsync(Number(id));
              Alert.alert("Deleted", "Transaction removed.", [
                {
                  text: "Undo",
                  onPress: () =>
                    mutations.restore.mutate(removed as Transaction),
                },
                { text: "Done" },
              ]);
              router.back();
            }
          },
        },
      ],
    );
  return (
    <Screen contentContainerStyle={{ gap: 16 }}>
      <Row>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={25} color={c.textPrimary} />
        </Pressable>
        <AppText style={{ fontSize: 20, fontFamily: "Inter_600SemiBold" }}>
          {id ? "Edit transaction" : "New transaction"}
        </AppText>
        {id ? (
          <Pressable
            onPress={remove}
            accessibilityRole="button"
            accessibilityLabel="Delete"
          >
            <Ionicons name="trash-outline" size={22} color={c.expense} />
          </Pressable>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </Row>
      <View
        style={{
          flexDirection: "row",
          backgroundColor: c.surfaceMuted,
          borderRadius: 24,
          padding: 4,
        }}
      >
        {(["expense", "income"] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => {
              setType(t);
              setCategoryId(undefined);
            }}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 20,
              backgroundColor: type === t ? c.surface : "transparent",
              alignItems: "center",
            }}
          >
            <AppText
              style={{
                color:
                  type === t
                    ? t === "expense"
                      ? c.expense
                      : c.income
                    : c.textSecondary,
                fontFamily: "Inter_600SemiBold",
              }}
            >
              {t === "expense" ? "Expense" : "Income"}
            </AppText>
          </Pressable>
        ))}
      </View>
      <AppText style={{ fontFamily: "Inter_600SemiBold" }}>Frequent</AppText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {frequent.data?.map((cat) => (
          <Pressable
            key={cat.id}
            accessibilityRole="button"
            accessibilityLabel={`Frequent ${cat.name}`}
            onPress={() => {
              setCategoryId(cat.id);
              if (settings.data?.haptics_enabled !== "0")
                void Haptics.selectionAsync();
            }}
            style={{
              padding: 8,
              borderRadius: 18,
              backgroundColor:
                categoryId === cat.id ? c.primarySoft : c.surface,
            }}
          >
            <AppText
              style={{
                color: categoryId === cat.id ? c.primary : c.textSecondary,
              }}
            >
              {cat.name}
            </AppText>
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/categories")}
          style={{ padding: 8, borderRadius: 18, backgroundColor: c.surface }}
        >
          <AppText style={{ color: c.primary }}>+ New</AppText>
        </Pressable>
      </View>
      <AppText style={{ fontFamily: "Inter_600SemiBold" }}>
        Choose a category
      </AppText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 9 }}>
        {categories.data?.map((cat) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={cat.name}
            key={cat.id}
            onPress={() => {
              setCategoryId(cat.id);
              if (settings.data?.haptics_enabled !== "0")
                void Haptics.selectionAsync();
            }}
            style={{
              width: "23%",
              alignItems: "center",
              padding: 6,
              borderWidth: categoryId === cat.id ? 2 : 1,
              borderColor: categoryId === cat.id ? c.primary : c.border,
              borderRadius: 14,
            }}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                backgroundColor: `${cat.color}24`,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name={cat.icon as never} size={22} color={cat.color} />
            </View>
            <AppText numberOfLines={1} style={{ fontSize: 11, marginTop: 4 }}>
              {cat.name}
            </AppText>
          </Pressable>
        ))}
      </View>
      <Row style={{ gap: 8 }}>
        {[toDayKey(new Date()), toDayKey(subDays(new Date(), 1))].map(
          (d, i) => (
            <Pressable
              key={d}
              onPress={() => setDate(d)}
              style={{
                padding: 10,
                borderRadius: 18,
                backgroundColor: date === d ? c.primarySoft : c.surface,
                borderWidth: 1,
                borderColor: c.border,
              }}
            >
              <AppText
                style={{ color: date === d ? c.primary : c.textSecondary }}
              >
                {i === 0 ? "Today" : "Yesterday"}
              </AppText>
            </Pressable>
          ),
        )}
        <Pressable
          onPress={() => setShowDatePicker(true)}
          style={{
            padding: 10,
            borderRadius: 18,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
          }}
        >
          <AppText style={{ color: c.primary }}>
            {date === toDayKey(new Date()) ||
            date === toDayKey(subDays(new Date(), 1))
              ? "Pick date"
              : format(new Date(`${date}T12:00:00`), "EEE, d MMM")}
          </AppText>
        </Pressable>
      </Row>
      {showDatePicker && (
        <DateTimePicker
          value={new Date(`${date}T12:00:00`)}
          mode="date"
          display="default"
          onChange={(_, value) => {
            setShowDatePicker(false);
            if (value) setDate(toDayKey(value));
          }}
        />
      )}
      <TextInput
        value={note}
        onChangeText={setNote}
        maxLength={280}
        placeholder="Add a note (optional)"
        placeholderTextColor={c.textTertiary}
        style={{
          padding: 14,
          color: c.textPrimary,
          backgroundColor: c.surface,
          borderRadius: 14,
        }}
      />
      <View style={{ alignItems: "center", paddingVertical: 4 }}>
        <AppText
          accessibilityLabel={`Amount ${amount || "0"} ${currency}`}
          style={{
            fontSize: 44,
            lineHeight: 56,
            fontFamily: "Inter_700Bold",
            fontVariant: ["tabular-nums"],
            color: type === "expense" ? c.expense : c.income,
          }}
        >
          {amount || "0"}{" "}
          <AppText style={{ fontSize: 20, color: c.textSecondary }}>
            {currency}
          </AppText>
        </AppText>
      </View>
      <Card style={{ gap: 8 }}>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-around",
            gap: 8,
          }}
        >
          {[
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            ...(decimals ? ["."] : []),
            "0",
            "del",
          ].map((k) => (
            <Pressable
              key={k}
              accessibilityRole="button"
              accessibilityLabel={k === "del" ? "Delete digit" : k}
              onPress={() => add(k)}
              onPressIn={() => {
                if (settings.data?.haptics_enabled !== "0")
                  void Haptics.selectionAsync();
              }}
              style={({ pressed }) => [{
                width: "28%",
                height: 42,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 12,
                backgroundColor: pressed ? c.primarySoft : c.surfaceMuted,
                opacity: pressed ? 0.82 : 1,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              }]}
            >
              <AppText style={{ fontSize: 20 }}>
                {k === "del" ? "⌫" : k}
              </AppText>
            </Pressable>
          ))}
        </View>
      </Card>
      <ActionButton
        title={id ? "Save changes" : `Add ${type}`}
        onPress={save}
        loading={mutations.create.isPending || mutations.update.isPending}
      />
    </Screen>
  );
}
