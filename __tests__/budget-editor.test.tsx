import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import BudgetEditor from "../app/budget/edit";

const mockSave = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));
jest.mock("expo-sqlite", () => ({ useSQLiteContext: () => ({}) }));
jest.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: jest.fn() }) }));
jest.mock("@/hooks/useAppData", () => ({
  useBudgets: () => ({ data: [] }),
  useCategories: () => ({ data: [] }),
  useCopyBudgets: () => ({ mutate: jest.fn() }),
  useRemoveBudget: () => ({ mutateAsync: jest.fn() }),
  useSetBudget: () => ({ mutateAsync: mockSave, isPending: false }),
  useSettings: () => ({ data: { currency_code: "USD", currency_decimals: "2" } }),
}));

describe("monthly alert threshold editor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSave.mockResolvedValue(undefined);
  });

  it("allows direct percentage edits and previews the exact amount", async () => {
    const view = render(<BudgetEditor />);
    fireEvent.changeText(view.getByLabelText("Monthly limit"), "1000");
    fireEvent.changeText(view.getByLabelText("Alert threshold value"), "75");
    expect(view.getByLabelText("Alert preview $750.00")).toBeTruthy();
    fireEvent.press(view.getByRole("button", { name: "Save budget" }));
    await waitFor(() => expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({
      amountMinor: 100000,
      alertThresholdMode: "percent",
      alertThresholdValue: 75,
      alertThresholdPct: 75,
    })));
  });

  it("lets the user set a cash alert and previews its amount", async () => {
    const view = render(<BudgetEditor />);
    fireEvent.changeText(view.getByLabelText("Monthly limit"), "1000");
    fireEvent.press(view.getByRole("button", { name: "Cash Amount" }));
    fireEvent.changeText(view.getByLabelText("Alert threshold value"), "825");
    expect(view.getByLabelText("Alert preview $825.00")).toBeTruthy();
    fireEvent.press(view.getByRole("button", { name: "Save budget" }));
    await waitFor(() => expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({
      amountMinor: 100000,
      alertThresholdMode: "cash",
      alertThresholdValue: 82500,
      alertThresholdPct: 83,
    })));
  });
});
