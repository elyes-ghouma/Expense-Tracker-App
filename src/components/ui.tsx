import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text as NativeText,
  View,
  type TextProps,
  type ViewProps,
} from "react-native";
import { palette } from "@/constants/colors";
import { useColorScheme } from "react-native";
import { useAppStore } from "@/store/appStore";
export function useColors() {
  const scheme = useColorScheme();
  const mode = useAppStore((s) => s.themeMode);
  return palette[
    (mode === "system" ? scheme : mode) === "dark" ? "dark" : "light"
  ];
}
export function AppText({ style, ...props }: TextProps) {
  const c = useColors();
  return (
    <NativeText
      {...props}
      style={[
        { color: c.textPrimary, fontFamily: "Inter_400Regular", fontSize: 16 },
        style,
      ]}
    />
  );
}
export function Card({ style, ...props }: ViewProps) {
  const c = useColors();
  return (
    <View
      {...props}
      style={[
        styles.card,
        { backgroundColor: c.surface, borderColor: c.border },
        style,
      ]}
    />
  );
}
export function ActionButton({
  title,
  onPress,
  secondary = false,
  disabled = false,
  loading = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  loading?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: secondary ? c.primarySoft : c.primary,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={c.onPrimary} />
      ) : (
        <AppText
          style={{
            color: secondary ? c.primary : c.onPrimary,
            fontFamily: "Inter_600SemiBold",
          }}
        >
          {title}
        </AppText>
      )}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#101828",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  button: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
});
