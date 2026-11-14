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
} from "@/hooks/useAppData";

export default function Categories() {
  const c = useColors();
  const router = useRouter();
  const [type, setType] = useState<"expense" | "income">("expense");
  const [name, setName] = useState("");
  const q = useCategories(type);
  const create = useCategoryCreate();
  const archive = useCategoryArchive();
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
            onPress={() => setType(item)}
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
                {category.isDefault ? "Default" : "Hold to remove"}
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
      <ActionButton
        title="Add category"
        loading={create.isPending}
        disabled={!name.trim()}
        onPress={async () => {
          try {
            await create.mutateAsync({
              name,
              type,
              icon: type === "income" ? "add-circle" : "ellipse",
              color: type === "income" ? "#12B76A" : "#5B5FEF",
            });
            setName("");
          } catch (error) {
            Alert.alert(
              "Could not add category",
              error instanceof Error ? error.message : String(error),
            );
          }
        }}
      />
    </Screen>
  );
}
