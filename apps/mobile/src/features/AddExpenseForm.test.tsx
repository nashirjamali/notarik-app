import { fireEvent, render } from "@testing-library/react-native";

import { AddExpenseForm } from "./AddExpenseForm";

test("shows validation errors and adds or removes a line item", async () => {
  const onSubmit = jest.fn(async () => undefined);
  const view = await render(<AddExpenseForm onSubmit={onSubmit} />);

  await fireEvent.press(view.getByRole("button", { name: "Save" }));
  expect(await view.findByText("Enter a merchant")).toBeTruthy();
  expect(onSubmit).not.toHaveBeenCalled();

  await fireEvent.changeText(view.getByLabelText("Merchant"), "Warung");
  await fireEvent.changeText(view.getByLabelText("Date"), "2026-10-17");
  await fireEvent.changeText(view.getByLabelText("Total"), "25rb");
  await fireEvent.press(view.getByRole("button", { name: "Add item" }));
  await fireEvent.changeText(view.getByLabelText("Item name"), "Nasi");
  await fireEvent.changeText(view.getByLabelText("Item amount"), "10000");
  await fireEvent.press(view.getByRole("button", { name: "Remove item" }));
  expect(view.queryByLabelText("Item name")).toBeNull();

  await fireEvent.press(view.getByRole("button", { name: "Add item" }));
  await fireEvent.changeText(view.getByLabelText("Item name"), "Nasi");
  await fireEvent.changeText(view.getByLabelText("Item amount"), "10000");
  await fireEvent.press(view.getByRole("button", { name: "Save" }));

  expect(
    await view.findByText("Line items don't add up to the total. Both amounts are saved."),
  ).toBeTruthy();
  expect(onSubmit).toHaveBeenCalledWith({
    merchant: "Warung",
    date: "2026-10-17",
    total_minor: 25_000,
    category: "Dining",
    items: [{ name: "Nasi", line_total_minor: 10_000 }],
  });
});
