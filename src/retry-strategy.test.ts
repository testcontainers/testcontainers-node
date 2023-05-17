import { IntervalRetryStrategy } from "./retry-strategy";

describe("RetryStrategy", () => {
  describe("IntervalRetryStrategy", () => {
    it("should not retry when predicate succeeds", async () => {
      const fnMock = jest.fn().mockResolvedValue(true);

      const result = await new IntervalRetryStrategy<boolean, Error>(1).retryUntil(
        () => fnMock(),
        (result) => result,
        () => new Error(),
        100
      );

      expect(result).toEqual(true);
      expect(fnMock).toHaveBeenCalledTimes(1);
    });

    it("should retry when predicate fails", async () => {
      const fnMock = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);

      const result = await new IntervalRetryStrategy<boolean, Error>(1).retryUntil(
        () => fnMock(),
        (result) => result,
        () => new Error(),
        100
      );

      expect(result).toEqual(true);
      expect(fnMock).toHaveBeenCalledTimes(2);
    });

    it("should invoke timeout handler on timeout", async () => {
      const fnMock = jest.fn().mockResolvedValue(false);
      const timeoutMock = jest.fn().mockReturnValue(new Error());

      const result = await new IntervalRetryStrategy<boolean, Error>(1).retryUntil(
        () => fnMock(),
        (result) => result,
        () => timeoutMock(),
        100
      );

      expect(result).toEqual(new Error());
      expect(timeoutMock).toHaveBeenCalledTimes(1);
    });

    it("should invoke timeout handler on timeout while function is running", async () => {
      const timeoutMock = jest.fn().mockReturnValue(new Error());
      const slowPromise = new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 10_000).unref());

      await new IntervalRetryStrategy<boolean, Error>(1).retryUntil(
        () => slowPromise,
        (result) => result,
        () => timeoutMock(),
        100
      );

      expect(timeoutMock).toHaveBeenCalledTimes(1);
    });
  });
});
