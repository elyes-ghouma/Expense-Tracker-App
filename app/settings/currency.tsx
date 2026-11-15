import React, { useEffect, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Row } from "@/components/screens";
import { ActionButton, AppText, Card, useColors } from "@/components/ui";
import { useChangeCurrency, useSettings } from "@/hooks/useAppData";
import { useAppStore } from "@/store/appStore";

const currencies = ["USD", "EUR", "GBP", "TND", "CAD", "JPY"] as const;
export default function CurrencyPicker() {
  const c = useColors();
  const router = useRouter();
  const settings = useSettings();
  const { change: save, willRound } = useChangeCurrency();
  const [currency, setCurrency] = useState("USD");
  useEffect(() => setCurrency(settings.data?.currency_code ?? "USD"), [settings.data?.currency_code]);
  const change = (value: string) => setCurrency(value);
  const apply = async () => {
    try {
      useAppStore.getState().set(await save.mutateAsync(currency));
      router.back();
    } catch (error) {
      Alert.alert(
        "Could not change currency",
        error instanceof Error ? error.message : String(error),
      );
    }
  };
  return <Screen contentContainerStyle={{ paddingTop: 12 }}>
    <Row>
      <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()}><Ionicons name="close" size={24} color={c.textPrimary} /></Pressable>
      <AppText variant="titleSmall">Display currency</AppText>
      <View style={{ width: 24 }} />
    </Row>
    <AppText style={{ color: c.textSecondary }}>Choose how amounts appear throughout Pocketwise. Existing amounts keep their numbers; no exchange rate is applied.</AppText>
    <Card style={{ gap: 10 }}>
      {currencies.map((item) => <Pressable key={item} accessibilityRole="radio" accessibilityState={{ selected: item === currency }} onPress={() => change(item)} style={{ paddingVertical: 12 }}><Row><AppText variant="bodyStrong">{item}</AppText><Ionicons name={item === currency ? "radio-button-on" : "radio-button-off"} size={21} color={item === currency ? c.primary : c.textTertiary} /></Row></Pressable>)}
    </Card>
    <ActionButton title="Save currency" loading={save.isPending} disabled={currency === (settings.data?.currency_code ?? "USD")} onPress={async () => {
      if (await willRound(currency))
        Alert.alert(
          "Round existing amounts?",
          `${currency} uses fewer decimal places, so your existing amounts will be rounded. This cannot be undone.`,
          [{ text: "Cancel" }, { text: "Change currency", onPress: apply }],
        );
      else await apply();
    }} />
  </Screen>;
}
