import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text as NativeText,
  View,
  type PressableProps,
  type TextProps,
  type ViewProps,
} from "react-native";
import { useColorScheme } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "@/store/appStore";
import { palette, radius, shadows, spacing, type, type TypographyVariant } from "@/theme";

export function useColors() {
  const scheme = useColorScheme();
  const mode = useAppStore((s) => s.themeMode);
  return palette[(mode === "system" ? scheme : mode) === "dark" ? "dark" : "light"];
}

export function AppText({ style, variant = "body", ...props }: TextProps & { variant?: TypographyVariant }) {
  const c = useColors();
  return <NativeText {...props} style={[type[variant], { color: c.textPrimary }, style]} />;
}

export function MoneyText({ style, ...props }: TextProps) {
  return <AppText {...props} style={[{ fontVariant: ["tabular-nums"] }, style]} />;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export function MotionPressable({ children, onPressIn, onPressOut, style, feedback = true, haptic = false, ...props }: PressableProps & { feedback?: boolean; haptic?: boolean }) {
  const scale = useSharedValue(1);
  const reducedMotion = useReducedMotion();
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const pressIn: NonNullable<PressableProps["onPressIn"]> = (event) => {
    if (feedback && !reducedMotion) scale.value = withSpring(0.97, { damping: 18, stiffness: 320 });
    if (haptic) void Haptics.selectionAsync();
    onPressIn?.(event);
  };
  const pressOut: NonNullable<PressableProps["onPressOut"]> = (event) => {
    scale.value = withSpring(1, { damping: 18, stiffness: 320 });
    onPressOut?.(event);
  };
  return <AnimatedPressable {...props} onPressIn={pressIn} onPressOut={pressOut} style={[style, animatedStyle]}>{children}</AnimatedPressable>;
}

export function Card({ style, ...props }: ViewProps) {
  const c = useColors();
  return <View {...props} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, style]} />;
}

export function SegmentedControl<T extends string>({ value, options, onChange, accessibilityLabel }: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}) {
  const c = useColors();
  return (
    <View accessibilityLabel={accessibilityLabel} style={[styles.segmented, { backgroundColor: c.surfaceMuted }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <MotionPressable key={option.value} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => onChange(option.value)} style={[styles.segment, selected && { backgroundColor: c.surface, shadowColor: "#101828", shadowOpacity: 0.08, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 1 }]}>
            <AppText variant="captionStrong" style={{ color: selected ? c.textPrimary : c.textSecondary, textAlign: "center" }}>{option.label}</AppText>
          </MotionPressable>
        );
      })}
    </View>
  );
}

export function CategoryBadge({ icon, color, size = 42 }: { icon: string; color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: radius.md, backgroundColor: `${color}20`, alignItems: "center", justifyContent: "center" }}><Ionicons name={icon as never} color={color} size={size * 0.52} /></View>;
}

export function ProgressBar({ progress, color }: { progress: number; color: string }) {
  const c = useColors();
  return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.min(100, Math.max(0, progress))) }} style={{ height: 9, borderRadius: 9, backgroundColor: c.surfaceMuted, overflow: "hidden" }}><View style={{ height: "100%", width: `${Math.min(100, Math.max(0, progress))}%`, borderRadius: 9, backgroundColor: color }} /></View>;
}

export function ActionButton({ title, onPress, secondary = false, disabled = false, loading = false }: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  loading?: boolean;
}) {
  const c = useColors();
  return <MotionPressable accessibilityRole="button" onPress={onPress} disabled={disabled || loading} style={[styles.button, { backgroundColor: secondary ? c.primarySoft : c.primary, opacity: disabled ? 0.45 : 1 }]}>{loading ? <ActivityIndicator color={secondary ? c.primary : c.onPrimary} /> : <AppText variant="bodyStrong" style={{ color: secondary ? c.primary : c.onPrimary }}>{title}</AppText>}</MotionPressable>;
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, boxShadow: shadows.card, elevation: 2 },
  segmented: { flexDirection: "row", padding: 4, borderRadius: radius.pill, gap: 3 },
  segment: { flex: 1, minHeight: 40, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  button: { minHeight: 52, borderRadius: radius.md, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.lg },
});
