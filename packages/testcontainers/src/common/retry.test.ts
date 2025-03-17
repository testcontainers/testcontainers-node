import { IntervalRetry } from "./retry";

describe("Retry", () => {
  describe("IntervalRetry", () => {
    it("should not retry when predicate succeeds", async () => {
      const fnMock = vi.fn().mockResolvedValue(true);

      const result = await new IntervalRetry<boolean, Error>(1).retryUntil(
        () => fnMock(),
        (result) => result,
        () => new Error(),
        10
      );

      expect(result).toEqual(true);
      expect(fnMock).toHaveBeenCalledTimes(1);
    });

    it("should retry when predicate fails", async () => {
      const fnMock = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);

      const result = await new IntervalRetry<boolean, Error>(1).retryUntil(
        () => fnMock(),
        (result) => result,
        () => new Error(),
        10
      );

      expect(result).toEqual(true);
      expect(fnMock).toHaveBeenCalledTimes(2);
    });

    it("should invoke timeout handler on timeout", async () => {
      const fnMock = vi.fn().mockResolvedValue(false);
      const timeoutMock = vi.fn().mockReturnValue(new Error());

      const result = await new IntervalRetry<boolean, Error>(1).retryUntil(
        () => fnMock(),
        (result) => result,
        () => timeoutMock(),
        10
      );

      expect(result).toEqual(new Error());
      expect(timeoutMock).toHaveBeenCalledTimes(1);
    });
  });
});
