import type { TextStyle } from "react-native";

export const type = {
  display: {
    fontFamily: "Inter_700Bold",
    fontSize: 36,
    lineHeight: 42,
    fontVariant: ["tabular-nums"],
  },
  titleLarge: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    lineHeight: 34,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 23, lineHeight: 29 },
  titleSmall: { fontFamily: "Inter_600SemiBold", fontSize: 18, lineHeight: 24 },
  body: { fontFamily: "Inter_400Regular", fontSize: 16, lineHeight: 23 },
  bodyStrong: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    lineHeight: 22,
  },
  caption: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  captionStrong: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    lineHeight: 18,
  },
  footnote: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 15 },
  eyebrow: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof type;
