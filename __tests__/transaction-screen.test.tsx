import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import TransactionScreen from "../app/transaction/new";

const mockCreate = jest.fn();
const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ back: mockBack }),
}));
jest.mock("expo-sqlite", () => ({ useSQLiteContext: () => ({}) }));
jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  NotificationFeedbackType: { Success: "success" },
}));
jest.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: null }),
}));
jest.mock("@/hooks/useAppData", () => ({
  useSettings: () => ({
    data: {
      currency_code: "USD",
      currency_decimals: "2",
      haptics_enabled: "1",
    },
  }),
  useCategories: (type: "expense" | "income") => ({
    data: [
      {
        id: type === "expense" ? 1 : 2,
        name: type === "expense" ? "Groceries" : "Salary",
        type,
        icon: "cart",
        color: "#84CC16",
        isDefault: true,
        isArchived: false,
        sortOrder: 1,
      },
    ],
  }),
  useFrequentCategories: () => ({ data: [] }),
  useTransactionMutations: () => ({
    create: { mutateAsync: mockCreate, isPending: false },
    update: { mutateAsync: jest.fn(), isPending: false },
    remove: { mutateAsync: jest.fn() },
    restore: { mutate: jest.fn() },
  }),
}));

describe("transaction entry flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockResolvedValue({ id: 1 });
  });
  it("creates an expense from amount keypad and category selection", async () => {
    const view = render(<TransactionScreen />);
    fireEvent.press(view.getByRole("button", { name: "1" }));
    fireEvent.press(view.getByRole("button", { name: "2" }));
    fireEvent.press(view.getByRole("button", { name: "Groceries" }));
    fireEvent.press(view.getByRole("button", { name: "Add expense" }));
    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "expense",
          amountMinor: 1200,
          categoryId: 1,
        }),
      ),
    );
    expect(mockBack).toHaveBeenCalled();
  }, 15000);
  it("switches to income and uses the matching category list", async () => {
    const view = render(<TransactionScreen />);
    fireEvent.press(view.getByText("Income"));
    fireEvent.press(view.getByRole("button", { name: "4" }));
    fireEvent.press(view.getByRole("button", { name: "Salary" }));
    fireEvent.press(view.getByRole("button", { name: "Add income" }));
    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "income",
          amountMinor: 400,
          categoryId: 2,
        }),
      ),
    );
  }, 15000);
  it("places the amount beside the keypad and gives keypad presses feedback", () => {
    const Haptics = jest.requireMock("expo-haptics") as { selectionAsync: jest.Mock };
    const view = render(<TransactionScreen />);
    fireEvent(view.getByRole("button", { name: "1" }), "pressIn");
    fireEvent.press(view.getByRole("button", { name: "1" }));
    expect(view.getByLabelText("Amount 1 USD")).toBeTruthy();
    expect(Haptics.selectionAsync).toHaveBeenCalled();
  });
});
