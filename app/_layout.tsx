import React from "react";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SQLiteProvider } from "expo-sqlite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { migrateDbIfNeeded } from "@/services/database/client";
import { ActivityIndicator, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { useSettings } from "@/hooks/useAppData";
import { useAppStore } from "@/store/appStore";
import type { Db } from "@/types/domain";
import { useColors } from "@/components/ui";
const client = new QueryClient({
  defaultOptions: {
    queries: { staleTime: Infinity, gcTime: 300_000, retry: 1 },
  },
});
void SplashScreen.preventAutoHideAsync();
function AppStack() {
  const colors = useColors();
  const settings = useSettings();
  const set = useAppStore((s) => s.set);
  React.useEffect(() => {
    if (settings.data) {
      set({
        themeMode:
          (settings.data.theme_mode as "light" | "dark" | "system") || "system",
        currency: settings.data.currency_code || "USD",
        decimals: Number(settings.data.currency_decimals || 2),
        openingBalance: Number(settings.data.opening_balance_minor || 0),
        privacy: settings.data.privacy_mode === "1",
      });
    }
    if (!settings.isPending) void SplashScreen.hideAsync();
  }, [settings.data, settings.isPending, set]);
  return (
    <BottomSheetModalProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="transaction/new"
          options={{ presentation: "modal", headerShown: false }}
        />
        <Stack.Screen
          name="transaction/[id]"
          options={{ presentation: "modal", headerShown: false }}
        />
        <Stack.Screen
          name="categories/index"
          options={{ headerShown: true, title: "Categories" }}
        />
        <Stack.Screen
          name="budget/edit"
          options={{ presentation: "formSheet", headerShown: false }}
        />
        <Stack.Screen
          name="settings/currency"
          options={{ presentation: "formSheet", headerShown: false }}
        />
      </Stack>
    </BottomSheetModalProvider>
  );
}
export default function RootLayout() {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  if (!loaded)
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SQLiteProvider
          databaseName="expense-tracker.db"
          onInit={(db) => migrateDbIfNeeded(db as unknown as Db)}
        >
          <QueryClientProvider client={client}>
            <AppStack />
          </QueryClientProvider>
        </SQLiteProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
