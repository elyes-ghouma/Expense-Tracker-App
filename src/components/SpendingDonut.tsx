import React from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { AppText, useColors } from "@/components/ui";

export interface DonutItem {
  category_id: number;
  name: string;
  color: string;
  total: number;
}

export function SpendingDonut({
  items,
  center,
}: {
  items: DonutItem[];
  center: string;
}) {
  const colors = useColors();
  const radius = 47;
  const circumference = 2 * Math.PI * radius;
  const total = items.reduce((sum, item) => sum + item.total, 0);
  let offset = 0;
  const summary = items
    .map(
      (item) =>
        `${item.name} ${Math.round((item.total / (total || 1)) * 100)}%`,
    )
    .join(", ");
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Category spending: ${summary}`}
      style={{
        width: 150,
        height: 150,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={150} height={150} viewBox="0 0 120 120">
        <Circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth={16}
          stroke={colors.surfaceMuted}
        />
        {items.map((item) => {
          const length = (item.total / (total || 1)) * circumference;
          const segment = (
            <Circle
              key={item.category_id}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={16}
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-offset}
              rotation={-90}
              origin="60, 60"
            />
          );
          offset += length;
          return segment;
        })}
      </Svg>
      <View
        pointerEvents="none"
        style={{ position: "absolute", alignItems: "center", maxWidth: 100 }}
      >
        <AppText
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{ fontSize: 17, fontFamily: "Inter_700Bold" }}
        >
          {center}
        </AppText>
        <AppText style={{ fontSize: 11, color: colors.textSecondary }}>
          total
        </AppText>
      </View>
    </View>
  );
}
