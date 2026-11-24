import { IntervalRetry, poll } from "./retry";

describe("Retry", { concurrent: false }, () => {
  describe("poll", () => {
    it("should not retry when the first attempt resolves", async () => {
      const fnMock = vi.fn().mockResolvedValue("result");

      const result = await poll(() => fnMock(), { intervalMs: 1, timeoutMs: 1000 });

      expect(result).toEqual("result");
      expect(fnMock).toHaveBeenCalledTimes(1);
    });

    it("should retry until the predicate passes", async () => {
      const fnMock = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2).mockResolvedValueOnce(3);

      const result = await poll(() => fnMock(), { until: (value) => value === 3, intervalMs: 1, timeoutMs: 1000 });

      expect(result).toEqual(3);
      expect(fnMock).toHaveBeenCalledTimes(3);
    });

    it("should pass the attempt number", async () => {
      const attempts: number[] = [];

      await poll(({ attempt }) => attempts.push(attempt), {
        until: (count) => count === 3,
        intervalMs: 1,
        timeoutMs: 1000,
      });

      expect(attempts).toEqual([1, 2, 3]);
    });

    it("should retry when an attempt throws", async () => {
      const fnMock = vi.fn().mockRejectedValueOnce(new Error("not ready")).mockResolvedValueOnce("result");

      const result = await poll(() => fnMock(), { intervalMs: 1, timeoutMs: 1000 });

      expect(result).toEqual("result");
      expect(fnMock).toHaveBeenCalledTimes(2);
    });

    it("should rethrow when an attempt throws and retryOnError is false", async () => {
      const fnMock = vi.fn().mockRejectedValue(new Error("not running"));

      await expect(poll(() => fnMock(), { intervalMs: 1, timeoutMs: 1000, retryOnError: false })).rejects.toThrow(
        "not running"
      );
      expect(fnMock).toHaveBeenCalledTimes(1);
    });

    it("should rethrow when the predicate throws", async () => {
      const fnMock = vi.fn().mockResolvedValue("result");

      await expect(
        poll(() => fnMock(), {
          until: () => {
            throw new Error("invalid predicate");
          },
          intervalMs: 1,
          timeoutMs: 1000,
        })
      ).rejects.toThrow("invalid predicate");
      expect(fnMock).toHaveBeenCalledTimes(1);
    });

    it("should reject with the timeout message when the predicate never passes", async () => {
      const promise = poll(async () => false, {
        until: (result) => result,
        intervalMs: 1,
        timeoutMs: 20,
        timeoutMessage: "not ready after 20ms",
      });

      await expect(promise).rejects.toThrow("not ready after 20ms");
      await expect(promise).rejects.not.toHaveProperty("cause");
    });

    it("should reject with a default timeout message", async () => {
      await expect(
        poll(async () => false, { until: (result) => result, intervalMs: 1, timeoutMs: 20 })
      ).rejects.toThrow("Timed out after 20ms");
    });

    it("should reject with the last error as the cause on timeout", async () => {
      let attempts = 0;

      const promise = poll(
        async () => {
          throw new Error(`failure ${++attempts}`);
        },
        { intervalMs: 1, timeoutMs: 20 }
      );

      await expect(promise).rejects.toThrow("Timed out after 20ms");
      await expect(promise).rejects.toHaveProperty("cause", new Error(`failure ${attempts}`));
      expect(attempts).toBeGreaterThan(1);
    });

    it("should not time out early when the timeout exceeds the maximum timer delay", async () => {
      const fnMock = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);

      const result = await poll(() => fnMock(), { until: (value) => value, intervalMs: 20, timeoutMs: Infinity });

      expect(result).toEqual(true);
    });

    it("should reject at the timeout when an attempt never resolves", { timeout: 1000 }, async () => {
      const fnMock = vi.fn(() => new Promise<boolean>(() => {}));

      await expect(
        poll(() => fnMock(), { intervalMs: 1, timeoutMs: 20, timeoutMessage: "not ready after 20ms" })
      ).rejects.toThrow("not ready after 20ms");
      expect(fnMock).toHaveBeenCalledTimes(1);
    });

    it("should abort the signal with the timeout error at the timeout", async () => {
      const signals: AbortSignal[] = [];

      const promise = poll(
        ({ signal }) => {
          signals.push(signal);
          return new Promise<boolean>((_, reject) => signal.addEventListener("abort", () => reject(signal.reason)));
        },
        { intervalMs: 1, timeoutMs: 20 }
      );

      await expect(promise).rejects.toThrow("Timed out after 20ms");
      expect(signals).toHaveLength(1);
      expect(signals[0].aborted).toBe(true);
      await expect(promise).rejects.toBe(signals[0].reason);
    });

    it("should not abort the signal when polling succeeds", async () => {
      const signals: AbortSignal[] = [];

      await poll(({ signal }) => signals.push(signal), { intervalMs: 1, timeoutMs: 20 });
      await new Promise((resolve) => setTimeout(resolve, 40));

      expect(signals[0].aborted).toBe(false);
    });

    it("should not start another attempt after the timeout", async () => {
      const fnMock = vi.fn().mockResolvedValue(false);

      await expect(
        poll(() => fnMock(), { until: (result) => result, intervalMs: 10, timeoutMs: 25 })
      ).rejects.toThrow();
      const callsAtTimeout = fnMock.mock.calls.length;
      await new Promise((resolve) => setTimeout(resolve, 40));

      expect(fnMock).toHaveBeenCalledTimes(callsAtTimeout);
    });
  });

  describe("IntervalRetry", () => {
    it("should not retry when predicate succeeds", async () => {
      const fnMock = vi.fn().mockResolvedValue(true);

      const result = await new IntervalRetry<boolean, Error>(1).retryUntil(
        () => fnMock(),
        (value) => value,
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
        (value) => value,
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
        (value) => value,
        () => timeoutMock(),
        10
      );

      expect(result).toEqual(new Error());
      expect(timeoutMock).toHaveBeenCalledTimes(1);
    });
  });
});
