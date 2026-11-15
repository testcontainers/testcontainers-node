import type { GenericContainer } from "./generic-container/generic-container";
import type { TestContainer } from "./test-container";

type BuilderMethodName<T> = Extract<keyof T, `with${string}`>;

describe("TestContainer", () => {
  it("declares every public builder method of GenericContainer", () => {
    expectTypeOf<Exclude<BuilderMethodName<GenericContainer>, keyof TestContainer>>().toBeNever();
  });
});
