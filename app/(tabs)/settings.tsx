import React, { useEffect, useState } from "react";
import { Alert, Pressable, Switch, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSQLiteContext, type SQLiteDatabase } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Row } from "@/components/screens";
import { AppText, Card, SegmentedControl, useColors } from "@/components/ui";
import { useSetSetting, useSettings } from "@/hooks/useAppData";
import { useAppStore } from "@/store/appStore";
import { exportService } from "@/services/domain/exportService";
import { parseToMinor } from "@/utils/money";
import type { Db } from "@/types/domain";

export default function Settings() {
  const c = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const settings = useSettings();
  const updateSetting = useSetSetting();
  const db = useSQLiteContext() as unknown as Db;
  const store = useAppStore();
  const [opening, setOpening] = useState("0");
  const decimals = Number(settings.data?.currency_decimals ?? 2);
  const setSetting = (key: string, value: string) =>
    updateSetting.mutate({ key, value });
  useEffect(() => {
    if (settings.data)
      setOpening(
        String(
          Number(settings.data.opening_balance_minor ?? 0) / 10 ** decimals,
        ),
      );
  }, [settings.data, decimals]);

  const reset = () =>
    Alert.alert(
      "Delete all data?",
      "This permanently clears transactions, budgets and custom categories.",
      [
        { text: "Cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await exportService.resetAll(db);
            await queryClient.clear();
            router.replace("/onboarding");
          },
        },
      ],
    );
  const restore = () =>
    Alert.alert(
      "Restore backup?",
      "Choose a Pocketwise database backup. This replaces all data on this device.",
      [
        { text: "Cancel" },
        {
          text: "Choose backup",
          onPress: async () => {
            try {
              const restored = await exportService.restoreDatabase(db);
              if (restored) {
                await queryClient.clear();
                Alert.alert(
                  "Restore complete",
                  "Your backup has been restored.",
                );
              }
            } catch (error) {
              Alert.alert(
                "Restore failed",
                error instanceof Error ? error.message : String(error),
              );
            }
          },
        },
      ],
    );

  return (
    <Screen>
      <AppText style={{ fontSize: 28, fontFamily: "Inter_700Bold" }}>
        Settings
      </AppText>
      <AppText variant="eyebrow" style={{ color: c.textSecondary }}>Appearance</AppText>
      <Card style={{ gap: 16 }}>
        <Row>
          <AppText>Theme</AppText>
          <View style={{ width: "72%" }}><SegmentedControl value={store.themeMode} options={[{ value: "system", label: "System" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} accessibilityLabel="Color theme" onChange={(mode) => { store.set({ themeMode: mode }); setSetting("theme_mode", mode); }} /></View>
        </Row>
        <Row>
          <AppText>Hide balances</AppText>
          <Switch
            value={store.privacy}
            onValueChange={(value) => {
              store.set({ privacy: value });
              setSetting("privacy_mode", value ? "1" : "0");
            }}
            trackColor={{ true: c.primary }}
          />
        </Row>
        <Row>
          <AppText>Haptic feedback</AppText>
          <Switch
            value={settings.data?.haptics_enabled !== "0"}
            onValueChange={(value) =>
              setSetting("haptics_enabled", value ? "1" : "0")
            }
            trackColor={{ true: c.primary }}
          />
        </Row>
        <Row>
          <AppText>Budget alerts</AppText>
          <Switch
            value={settings.data?.budget_alerts_enabled !== "0"}
            onValueChange={(value) =>
              setSetting("budget_alerts_enabled", value ? "1" : "0")
            }
            trackColor={{ true: c.primary }}
          />
        </Row>
      </Card>
      <AppText variant="eyebrow" style={{ color: c.textSecondary }}>Currency</AppText>
      <Card style={{ gap: 12 }}>
        <Row>
          <AppText>Currency code</AppText>
          <AppText style={{ fontFamily: "Inter_600SemiBold" }}>
            {settings.data?.currency_code ?? "USD"}
          </AppText>
        </Row>
        <Pressable accessibilityRole="button" onPress={() => router.push("/settings/currency" as never)}><Row><AppText style={{ color: c.primary }}>Choose currency</AppText><Ionicons name="chevron-forward" size={18} color={c.primary} /></Row></Pressable>
      </Card>
      <AppText
        style={{
          fontSize: 12,
          color: c.textSecondary,
          fontFamily: "Inter_600SemiBold",
        }}
      >
        OPENING BALANCE
      </AppText>
      <Card style={{ gap: 12 }}>
        <AppText style={{ color: c.textSecondary }}>
          Used to calculate your current balance.
        </AppText>
        <TextInput
          value={opening}
          onChangeText={setOpening}
          keyboardType="decimal-pad"
          accessibilityLabel="Opening balance"
          style={{
            padding: 13,
            borderRadius: 12,
            color: c.textPrimary,
            backgroundColor: c.surfaceMuted,
          }}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            try {
              const minor = /^0+(?:[.,]0*)?$/.test(opening.trim())
                ? 0
                : parseToMinor(opening, decimals);
              store.set({ openingBalance: minor });
              setSetting("opening_balance_minor", String(minor));
            } catch (error) {
              Alert.alert(
                "Invalid balance",
                error instanceof Error ? error.message : String(error),
              );
            }
          }}
        >
          <AppText style={{ color: c.primary }}>Save opening balance</AppText>
        </Pressable>
      </Card>
      <AppText
        style={{
          fontSize: 12,
          color: c.textSecondary,
          fontFamily: "Inter_600SemiBold",
        }}
      >
        MANAGE
      </AppText>
      <Pressable onPress={() => router.push("/categories")}>
        <Card>
          <Row>
            <AppText>Categories</AppText>
            <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />
          </Row>
        </Card>
      </Pressable>
      <AppText
        style={{
          fontSize: 12,
          color: c.textSecondary,
          fontFamily: "Inter_600SemiBold",
        }}
      >
        YOUR DATA
      </AppText>
      <Pressable
        onPress={async () => {
          try {
            const uri = await exportService.exportCsv(db);
            Alert.alert("CSV ready", `Saved ${uri}`);
          } catch (error) {
            Alert.alert("Export failed", String(error));
          }
        }}
      >
        <Card>
          <Row>
            <AppText>Export transactions to CSV</AppText>
            <Ionicons name="download-outline" size={20} color={c.primary} />
          </Row>
        </Card>
      </Pressable>
      <Pressable
        onPress={async () => {
          try {
            await exportService.backupDatabase(db as unknown as SQLiteDatabase);
          } catch (error) {
            Alert.alert(
              "Backup failed",
              error instanceof Error ? error.message : String(error),
            );
          }
        }}
      >
        <Card>
          <Row>
            <AppText>Backup database</AppText>
            <Ionicons name="archive-outline" size={20} color={c.primary} />
          </Row>
        </Card>
      </Pressable>
      <Pressable onPress={restore}>
        <Card>
          <Row>
            <AppText>Restore database</AppText>
            <Ionicons name="refresh-outline" size={20} color={c.primary} />
          </Row>
        </Card>
      </Pressable>
      <Pressable onPress={reset}>
        <Card>
          <Row>
            <AppText style={{ color: c.expense }}>Delete all data</AppText>
            <Ionicons name="trash-outline" size={20} color={c.expense} />
          </Row>
        </Card>
      </Pressable>
      <AppText
        style={{ textAlign: "center", color: c.textTertiary, fontSize: 12 }}
      >
        Pocketwise · Private, offline and yours
      </AppText>
    </Screen>
  );
}
