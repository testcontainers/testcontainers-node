import { ImagePullPolicy, PullPolicy, resolvePullPolicy } from "./pull-policy";

test("default pull policy should return false", () => {
  const policy = PullPolicy.defaultPolicy();
  expect(policy.shouldPull()).toBe(false);
  expect(resolvePullPolicy(policy)).toBe("missing");
});

test("always pull policy should return true", () => {
  const policy = PullPolicy.alwaysPull();
  expect(policy.shouldPull()).toBe(true);
  expect(resolvePullPolicy(policy)).toBe("always");
});

test("never pull policy should forbid pulling", () => {
  const policy = PullPolicy.neverPull();
  expect(policy.shouldPull()).toBe(false);
  expect(policy.neverPull?.()).toBe(true);
  expect(resolvePullPolicy(policy)).toBe("never");
});

test.each([true, false])("should preserve a custom shouldPull result of %s", (shouldPull) => {
  const policy: ImagePullPolicy = { shouldPull: () => shouldPull };
  expect(resolvePullPolicy(policy)).toBe(shouldPull ? "always" : "missing");
});

test.each([true, false])("should allow shouldPull to return %s when neverPull is false", (shouldPull) => {
  const policy: ImagePullPolicy = { shouldPull: () => shouldPull, neverPull: () => false };
  expect(resolvePullPolicy(policy)).toBe(shouldPull ? "always" : "missing");
});

test("should support a custom never-pull policy", () => {
  const policy: ImagePullPolicy = { shouldPull: () => false, neverPull: () => true };
  expect(resolvePullPolicy(policy)).toBe("never");
});

test("should reject conflicting pull settings", () => {
  const policy: ImagePullPolicy = { shouldPull: () => true, neverPull: () => true };
  expect(() => resolvePullPolicy(policy)).toThrow("Image pull policy cannot enable both shouldPull() and neverPull()");
});

test("should evaluate shouldPull only once", () => {
  const shouldPull = vi.fn().mockReturnValue(false);
  expect(resolvePullPolicy({ shouldPull })).toBe("missing");
  expect(shouldPull).toHaveBeenCalledTimes(1);
});

test("should evaluate neverPull only once", () => {
  const neverPull = vi.fn().mockReturnValue(true);
  expect(resolvePullPolicy({ shouldPull: () => false, neverPull })).toBe("never");
  expect(neverPull).toHaveBeenCalledTimes(1);
});

test("should be able to create a custom pull policy", () => {
  class CustomPullPolicy implements ImagePullPolicy {
    public shouldPull(): boolean {
      return true;
    }
  }

  expect(new CustomPullPolicy().shouldPull()).toBe(true);
});
