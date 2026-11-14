import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { ActionButton } from "@/components/ui";
describe("primary action button", () => {
  it("exposes an accessible button and calls its action", () => {
    const onPress = jest.fn();
    const view = render(
      <ActionButton title="Save transaction" onPress={onPress} />,
    );
    fireEvent.press(view.getByRole("button", { name: "Save transaction" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  it("disables the action while loading", () => {
    const onPress = jest.fn();
    const view = render(
      <ActionButton title="Saving" onPress={onPress} loading />,
    );
    fireEvent.press(view.getByRole("button"));
    expect(onPress).not.toHaveBeenCalled();
  });
});
