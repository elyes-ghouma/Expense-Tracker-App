import React from "react";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MotionPressable, useColors } from "@/components/ui";
export default function TabLayout() {
  const c = useColors();
  const router = useRouter();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textTertiary,
        tabBarStyle: {
          height: 72,
          paddingBottom: 10,
          paddingTop: 10,
          backgroundColor: c.surfaceElevated,
          borderTopColor: c.border,
        },
        tabBarLabelStyle: { fontSize: 11, fontFamily: "Inter_500Medium" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "",
          tabBarButton: () => (
            <MotionPressable
              accessibilityRole="button"
              accessibilityLabel="Add transaction"
              onPress={() => router.push("/transaction/new")}
              haptic
              style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                backgroundColor: c.primary,
                alignItems: "center",
                justifyContent: "center",
                marginTop: -17,
              }}
            >
              <Ionicons name="add" color="#fff" size={30} />
            </MotionPressable>
          ),
        }}
      />
      <Tabs.Screen
        name="budgets"
        options={{
          title: "Plan",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pie-chart-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
