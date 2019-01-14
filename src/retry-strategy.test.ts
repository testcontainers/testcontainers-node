import { Duration, TemporalUnit } from "node-duration";
import { SimpleRetryStrategy } from "./retry-strategy";

describe("RetryStrategy", () => {
  describe("SimpleRetryStrategy", () => {
    it("should retry until a result is returned", async () => {
      const duration = new Duration(0, TemporalUnit.MILLISECONDS);
      const strategy = new SimpleRetryStrategy(duration);

      let count = 0;
      await strategy.retry(async () => {
        if (count === 5) {
          return true;
        }
        count++;
      });
    });
  });
});
