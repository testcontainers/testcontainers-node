import { EmulatorFlagsManager } from "./emulator-flags-manager";

describe("EmulatorFlagsManager", () => {
  it("should add flag without --", async () => {
    const flagsManager = new EmulatorFlagsManager().withFlag("database-mode", "firestore-native");

    const flags = flagsManager.expandFlags();

    expect(flags.trim()).toEqual("--database-mode=firestore-native");
  });

  it("should add flag with --", async () => {
    const flagsManager = new EmulatorFlagsManager().withFlag("--database-mode", "firestore-native");

    const flags = flagsManager.expandFlags();

    expect(flags.trim()).toEqual("--database-mode=firestore-native");
  });

  it("should add many flags", async () => {
    const flagsManager = new EmulatorFlagsManager()
      .withFlag("database-mode", "firestore-native")
      .withFlag("--host-port", "0.0.0.0:8080");

    const flags = flagsManager.expandFlags();

    expect(flags.trim()).toEqual("--database-mode=firestore-native --host-port=0.0.0.0:8080");
  });

  it("should overwrite same flag if added more than once", async () => {
    const flagsManager = new EmulatorFlagsManager()
      .withFlag("database-mode", "firestore-native")
      .withFlag("--database-mode", "datastore-mode");

    const flags = flagsManager.expandFlags();

    expect(flags.trim()).toEqual("--database-mode=datastore-mode");
  });

  it("should add flag with no value", async () => {
    const flagsManager = new EmulatorFlagsManager().withFlag("database-mode", "").withFlag("--host-port", "");

    const flags = flagsManager.expandFlags();

    expect(flags.trim()).toEqual("--database-mode --host-port");
  });

  it("should throw if flag name not set", async () => {
    expect(() => new EmulatorFlagsManager().withFlag("", "firestore-native")).toThrowError();
  });

  it("should clear all flags added", async () => {
    const flagsManager = new EmulatorFlagsManager()
      .withFlag("database-mode", "firestore-native")
      .withFlag("host-port", "0.0.0.0:8080");

    flagsManager.clearFlags();
    const flags = flagsManager.expandFlags();

    expect(flags.trim()).toEqual("");
  });
});
