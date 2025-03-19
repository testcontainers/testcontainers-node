import { ImagePullPolicy, PullPolicy } from "./pull-policy";

test("default pull policy should return false", () => {
  expect(PullPolicy.defaultPolicy().shouldPull()).toBe(false);
});

test("always pull policy should return true", () => {
  expect(PullPolicy.alwaysPull().shouldPull()).toBe(true);
});

test("should be able to create a custom pull policy", () => {
  class CustomPullPolicy implements ImagePullPolicy {
    public shouldPull(): boolean {
      return true;
    }
  }

  expect(new CustomPullPolicy().shouldPull()).toBe(true);
});
