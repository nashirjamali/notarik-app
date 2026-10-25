import { destination } from "./guard";

test("sends a missing session to auth and a restored session into the app", () => {
  expect(destination(false, null)).toBe("loading");
  expect(destination(true, null)).toBe("auth");
  expect(destination(true, { accessToken: "token" })).toBe("app");
});
