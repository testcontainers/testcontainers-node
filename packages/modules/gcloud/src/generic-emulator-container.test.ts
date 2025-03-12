
import { GenericGCloudEmulatorContainer } from "./generic-emulator-container";

const IMAGE = "gcr.io/google.com/cloudsdktool/cloud-sdk"

describe("GenericGCloudEmulatorContainer", { timeout: 240_000 }, () => {
    it("should have all flags added", async () => {
        const genericGCloudEmulatorContainer = new GenericGCloudEmulatorContainer(IMAGE)
            .withFlag("database-mode", "firestore-native");

        const flags = genericGCloudEmulatorContainer.expandFlags();

        expect(flags.trim()).toEqual("--database-mode=firestore-native");
    });

    it("should overwrite flag if added more than once", async () => {
        const genericGCloudEmulatorContainer = new GenericGCloudEmulatorContainer(IMAGE)
            .withFlag("database-mode", "firestore-native")
            .withFlag("database-mode", "datastore-mode")
            .withFlag("database-mode", "datastore-mode");

        const flags = genericGCloudEmulatorContainer.expandFlags();

        expect(flags.trim()).toEqual("--database-mode=datastore-mode");
    });
});
