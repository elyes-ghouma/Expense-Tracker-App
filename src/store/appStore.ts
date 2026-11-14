import { create } from "zustand";
type State = {
  themeMode: "system" | "light" | "dark";
  currency: string;
  decimals: number;
  openingBalance: number;
  privacy: boolean;
  set: (v: Partial<State>) => void;
};
export const useAppStore = create<State>((set) => ({
  themeMode: "system",
  currency: "USD",
  decimals: 2,
  openingBalance: 0,
  privacy: false,
  set: (v) => set(v),
}));
