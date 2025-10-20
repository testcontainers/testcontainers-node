import { existsSync, unlinkSync } from "fs";
import { writeFile } from "fs/promises";
import path from "path";
import { withFileLock } from "./file-lock";

describe("withFileLock", () => {
  const testFileName = "test-file-lock.lock";

  afterEach(async () => {
    // Clean up any test lock files - wait a bit for locks to be fully released
    await new Promise((resolve) => setTimeout(resolve, 100));
    const tmp = await import("tmp");
    const file = path.resolve(tmp.tmpdir, testFileName);
    try {
      if (existsSync(file)) {
        unlinkSync(file);
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  it("should execute function and return its result", async () => {
    const result = await withFileLock(testFileName, () => {
      return "test-result";
    });

    expect(result).toBe("test-result");
  });

  it("should execute async function and return its result", async () => {
    const result = await withFileLock(testFileName, async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return 42;
    });

    expect(result).toBe(42);
  });

  it("should create lock file in tmp directory", async () => {
    const tmp = await import("tmp");
    const expectedFile = path.resolve(tmp.tmpdir, testFileName);

    let fileExistedDuringLock = false;
    await withFileLock(testFileName, () => {
      fileExistedDuringLock = existsSync(expectedFile);
    });

    expect(fileExistedDuringLock).toBe(true);
  });

  it("should release lock after function completes", async () => {
    let lockAcquired = false;

    await withFileLock(testFileName, () => {
      lockAcquired = true;
    });

    // If lock was released, we should be able to acquire it again immediately
    await withFileLock(testFileName, () => {
      expect(lockAcquired).toBe(true);
    });
  });

  it("should release lock even if function throws error", async () => {
    const error = new Error("Test error");

    await expect(
      withFileLock(testFileName, () => {
        throw error;
      })
    ).rejects.toThrow("Test error");

    // Lock should be released, so we can acquire it again
    const result = await withFileLock(testFileName, () => "success");
    expect(result).toBe("success");
  });

  it("should release lock even if async function throws error", async () => {
    await expect(
      withFileLock(testFileName, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error("Async error");
      })
    ).rejects.toThrow("Async error");

    // Lock should be released
    const result = await withFileLock(testFileName, () => "success");
    expect(result).toBe("success");
  });

  it("should handle concurrent lock attempts by waiting", async () => {
    const results: string[] = [];
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const promise1 = withFileLock(testFileName, async () => {
      results.push("lock1-acquired");
      await delay(50);
      results.push("lock1-released");
      return "result1";
    });

    // Start second lock attempt after a small delay
    await delay(10);
    const promise2 = withFileLock(testFileName, async () => {
      results.push("lock2-acquired");
      await delay(20);
      results.push("lock2-released");
      return "result2";
    });

    const [result1, result2] = await Promise.all([promise1, promise2]);

    expect(result1).toBe("result1");
    expect(result2).toBe("result2");
    // Verify sequential execution
    expect(results).toEqual(["lock1-acquired", "lock1-released", "lock2-acquired", "lock2-released"]);
  });

  it("should handle existing lock file gracefully", async () => {
    const tmp = await import("tmp");
    const file = path.resolve(tmp.tmpdir, testFileName);

    // Pre-create the lock file
    await writeFile(file, "", { flag: "w" });
    expect(existsSync(file)).toBe(true);

    // Should still work with existing file
    const result = await withFileLock(testFileName, () => {
      return "works-with-existing-file";
    });

    expect(result).toBe("works-with-existing-file");
  });

  it("should reuse existing lock file on multiple calls", async () => {
    const tmp = await import("tmp");
    const file = path.resolve(tmp.tmpdir, testFileName);

    await withFileLock(testFileName, () => "first");
    expect(existsSync(file)).toBe(true);

    await withFileLock(testFileName, () => "second");
    expect(existsSync(file)).toBe(true);

    await withFileLock(testFileName, () => "third");
    expect(existsSync(file)).toBe(true);
  });

  it("should propagate return value of synchronous function", async () => {
    const obj = { value: 123, nested: { data: "test" } };
    const result = await withFileLock(testFileName, () => obj);

    expect(result).toEqual(obj);
  });

  it("should propagate return value of async function", async () => {
    const result = await withFileLock(testFileName, async () => {
      const data = await Promise.resolve({ status: "success" });
      return data;
    });

    expect(result).toEqual({ status: "success" });
  });
});
