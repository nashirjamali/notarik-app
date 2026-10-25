import { render } from "@testing-library/react-native";

import { Button } from "./Button";
import { Card } from "./Card";
import { Money } from "./Money";
import { Screen } from "./Screen";
import { Text } from "./Text";

jest.mock("react-native-safe-area-context", () => {
  const { View } = require("react-native");
  return { SafeAreaView: View };
});

test("renders the base components with formatted money", async () => {
  const view = await render(
    <Screen>
      <Card>
        <Text>Hello</Text>
        <Money minor={1_500_000} />
        <Button label="Save" />
      </Card>
    </Screen>,
  );
  expect(view.getByText("Hello")).toBeTruthy();
  expect(view.getByText("Rp 1.500.000")).toBeTruthy();
  expect(view.getByRole("button", { name: "Save" })).toBeTruthy();
});
