import React, { useState } from "react";
import { Alert, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/screens";
import { ActionButton, AppText, Card, useColors } from "@/components/ui";
import { useSetSetting } from "@/hooks/useAppData";
import { currencyDecimals, parseToMinor } from "@/utils/money";
export default function Onboarding() {
  const c = useColors();
  const [currency, setCurrency] = useState("USD");
  const [opening, setOpening] = useState("0");
  const save = useSetSetting();
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center", gap: 22 }}>
        <AppText style={{ fontSize: 34, lineHeight: 44, paddingVertical: 5, fontFamily: "Inter_700Bold" }}>
          Money, made clear.
        </AppText>
        <AppText style={{ color: c.textSecondary }}>
          Your finances stay private on this device. Start with your currency
          and current balance.
        </AppText>
        <Card style={{ gap: 14 }}>
          <AppText style={{ fontFamily: "Inter_600SemiBold" }}>
            Currency
          </AppText>
          <TextInput
            value={currency}
            onChangeText={setCurrency}
            autoCapitalize="characters"
            maxLength={3}
            style={{
              color: c.textPrimary,
              fontSize: 18,
              borderBottomWidth: 1,
              borderColor: c.border,
              paddingVertical: 8,
            }}
          />
          <AppText style={{ fontFamily: "Inter_600SemiBold" }}>
            Opening balance
          </AppText>
          <TextInput
            value={opening}
            onChangeText={setOpening}
            keyboardType="decimal-pad"
            style={{
              color: c.textPrimary,
              fontSize: 18,
              borderBottomWidth: 1,
              borderColor: c.border,
              paddingVertical: 8,
            }}
          />
        </Card>
        <ActionButton
          title="Get started"
          loading={save.isPending}
          onPress={async () => {
            try {
              const code = currency.toUpperCase() || "USD";
              const decimals = currencyDecimals(code);
              const minor = /^0+(?:[.,]0*)?$/.test(opening.trim())
                ? 0
                : parseToMinor(opening, decimals);
              await save.mutateAsync({ key: "currency_code", value: code });
              await save.mutateAsync({
                key: "currency_decimals",
                value: String(decimals),
              });
              await save.mutateAsync({
                key: "opening_balance_minor",
                value: String(minor),
              });
              await save.mutateAsync({ key: "onboarding_done", value: "1" });
              router.replace("/(tabs)");
            } catch (e) {
              Alert.alert(
                "Could not save setup",
                e instanceof Error ? e.message : String(e),
              );
            }
          }}
        />
        <ActionButton
          title="Use defaults"
          secondary
          onPress={async () => {
            await save.mutateAsync({ key: "onboarding_done", value: "1" });
            router.replace("/(tabs)");
          }}
        />
      </View>
    </Screen>
  );
}
