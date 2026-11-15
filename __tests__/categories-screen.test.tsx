import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import Categories from "../app/categories";

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock("@/hooks/useAppData", () => ({
  useCategories: () => ({
    data: [{
      id: 7,
      name: "Groceries",
      type: "expense",
      icon: "cart",
      color: "#5B5FEF",
      isDefault: false,
      isArchived: false,
      sortOrder: 1,
    }],
  }),
  useCategoryCreate: () => ({ mutateAsync: mockCreate, isPending: false }),
  useCategoryUpdate: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useCategoryArchive: () => ({ mutate: jest.fn() }),
}));

describe("category appearance editing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockResolvedValue(undefined);
    mockUpdate.mockResolvedValue(undefined);
  });

  it("creates a category with the selected color and icon", async () => {
    const view = render(<Categories />);
    fireEvent.changeText(view.getByLabelText("New category name"), "Travel");
    fireEvent.press(view.getByLabelText("Category color #2E90FA"));
    fireEvent.press(view.getByLabelText("Category icon airplane"));
    fireEvent.press(view.getByRole("button", { name: "Add category" }));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({
      name: "Travel",
      type: "expense",
      icon: "airplane",
      color: "#2E90FA",
    }));
  });

  it("edits an existing category name, icon, and color", async () => {
    const view = render(<Categories />);
    fireEvent.press(view.getByLabelText("Groceries, custom"));
    fireEvent.changeText(view.getByLabelText("New category name"), "Food");
    fireEvent.press(view.getByLabelText("Category color #F79009"));
    fireEvent.press(view.getByLabelText("Category icon restaurant"));
    fireEvent.press(view.getByRole("button", { name: "Save category" }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({
      id: 7,
      input: { name: "Food", icon: "restaurant", color: "#F79009" },
    }));
  });
});
