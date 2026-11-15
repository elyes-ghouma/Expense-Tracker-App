import React, { useState } from "react";
import { Alert, Pressable, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Row } from "@/components/screens";
import { ActionButton, AppText, Card, useColors } from "@/components/ui";
import {
  useCategories,
  useCategoryArchive,
  useCategoryCreate,
  useCategoryUpdate,
} from "@/hooks/useAppData";
import type { Category } from "@/types/domain";

const COLORS = ["#5B5FEF", "#12B76A", "#F79009", "#F04438", "#2E90FA", "#D946EF", "#667085", "#14B8A6"];
const ICONS = ["cart", "home", "restaurant", "car", "heart", "bag", "school", "briefcase", "gift", "cash", "card", "airplane"];

export default function Categories() {
  const c = useColors();
  const router = useRouter();
  const [type, setType] = useState<"expense" | "income">("expense");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("cart");
  const [color, setColor] = useState(COLORS[0]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const q = useCategories(type);
  const create = useCategoryCreate();
  const update = useCategoryUpdate();
  const archive = useCategoryArchive();
  const resetForm = () => {
    setName("");
    setIcon(type === "income" ? "cash" : "cart");
    setColor(type === "income" ? "#12B76A" : COLORS[0]);
    setEditingCategory(null);
  };
  return (
    <Screen>
      <Row>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
        >
          <AppText style={{ fontSize: 23 }}>‹</AppText>
        </Pressable>
        <AppText style={{ fontSize: 25, fontFamily: "Inter_700Bold" }}>
          Categories
        </AppText>
        <View style={{ width: 24 }} />
      </Row>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["expense", "income"] as const).map((item) => (
          <Pressable
            key={item}
            onPress={() => {
              setType(item);
              resetForm();
            }}
            style={{
              padding: 10,
              borderRadius: 18,
              backgroundColor: type === item ? c.primarySoft : c.surface,
            }}
          >
            <AppText>{item === "expense" ? "Expenses" : "Income"}</AppText>
          </Pressable>
        ))}
      </View>
      {q.data?.map((category) => (
        <Pressable
          key={category.id}
          accessibilityRole="button"
          accessibilityLabel={`${category.name}, ${category.isDefault ? "default" : "custom"}`}
          onLongPress={() => {
            if (category.isDefault) return;
            Alert.alert(category.name, "Remove this custom category?", [
              { text: "Cancel" },
              {
                text: "Remove",
                style: "destructive",
                onPress: () =>
                  archive.mutate(category.id, {
                    onError: (error) =>
                      Alert.alert("Could not remove category", error.message),
                  }),
              },
            ]);
          }}
          onPress={() => {
            setEditingCategory(category);
            setName(category.name);
            setIcon(category.icon);
            setColor(category.color);
          }}
        >
          <Card style={{ padding: 14 }}>
            <Row style={{ gap: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 13,
                  backgroundColor: `${category.color}22`,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name={category.icon as never}
                  size={20}
                  color={category.color}
                />
              </View>
              <AppText style={{ flex: 1 }}>{category.name}</AppText>
              <AppText style={{ fontSize: 12, color: c.textTertiary }}>
                {category.isDefault ? "Tap to edit" : "Tap to edit · hold to remove"}
              </AppText>
            </Row>
          </Card>
        </Pressable>
      ))}
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="New category name"
        placeholderTextColor={c.textTertiary}
        maxLength={40}
        accessibilityLabel="New category name"
        style={{
          padding: 14,
          borderRadius: 14,
          color: c.textPrimary,
          backgroundColor: c.surface,
        }}
      />
      <AppText style={{ fontFamily: "Inter_600SemiBold" }}>Color</AppText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {COLORS.map((option) => (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityLabel={`Category color ${option}`}
            accessibilityState={{ selected: color === option }}
            onPress={() => setColor(option)}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: option,
              borderWidth: color === option ? 3 : 1,
              borderColor: color === option ? c.textPrimary : c.border,
            }}
          />
        ))}
      </View>
      <AppText style={{ fontFamily: "Inter_600SemiBold" }}>Symbol</AppText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {ICONS.map((option) => (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityLabel={`Category icon ${option}`}
            accessibilityState={{ selected: icon === option }}
            onPress={() => setIcon(option)}
            style={{
              width: 42,
              height: 42,
              borderRadius: 13,
              borderWidth: icon === option ? 2 : 1,
              borderColor: icon === option ? c.primary : c.border,
              backgroundColor: icon === option ? c.primarySoft : c.surface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name={option as never} size={21} color={color} />
          </Pressable>
        ))}
      </View>
      <ActionButton
        title={editingCategory ? "Save category" : "Add category"}
        loading={create.isPending || update.isPending}
        disabled={!name.trim()}
        onPress={async () => {
          try {
            if (editingCategory) {
              await update.mutateAsync({
                id: editingCategory.id,
                input: { name, icon, color },
              });
            } else {
              await create.mutateAsync({ name, type, icon, color });
            }
            resetForm();
          } catch (error) {
            Alert.alert(
              "Could not add category",
              error instanceof Error ? error.message : String(error),
            );
          }
        }}
      />
      {editingCategory && (
        <Pressable accessibilityRole="button" onPress={resetForm}>
          <AppText style={{ color: c.textSecondary, textAlign: "center" }}>
            Cancel editing
          </AppText>
        </Pressable>
      )}
    </Screen>
  );
}
