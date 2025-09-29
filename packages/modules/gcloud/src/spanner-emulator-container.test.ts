import { Spanner } from "@google-cloud/spanner";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { SpannerEmulatorContainer } from "./spanner-emulator-container";

// select the fourth FROM in the Dockerfile (spanner emulator)
const IMAGE = getImage(__dirname, 3);

describe("SpannerEmulatorContainer", { timeout: 240_000 }, () => {
  it("should start, expose endpoints and accept real client connections using explicitly configured client", async () => {
    // startupWithExplicitClient {
    await using container = await new SpannerEmulatorContainer(IMAGE).withProjectId("test-project").start();

    const spanner = new Spanner({
      projectId: container.getProjectId(),
      apiEndpoint: container.getHost(),
      port: container.getGrpcPort(),
      sslCreds: container.getSslCredentials(),
    });

    const admin = spanner.getInstanceAdminClient();
    const [configs] = await admin.listInstanceConfigs({
      parent: admin.projectPath(container.getProjectId()),
    });

    const expectedConfigName = admin.instanceConfigPath(container.getProjectId(), "emulator-config");
    expect(configs.map((c) => c.name)).toContain(expectedConfigName);
    // }
  });

  describe.sequential("Shared state", () => {
    afterEach(() => {
      process.env.SPANNER_EMULATOR_HOST = "";
    });

    it("should start, expose endpoints and accept real client connections using projectId and SPANNER_EMULATOR_HOST", async () => {
      await using container = await new SpannerEmulatorContainer(IMAGE).withProjectId("test-project").start();

      // startupWithEnvironmentVariable {
      process.env.SPANNER_EMULATOR_HOST = container.getEmulatorGrpcEndpoint();
      const spanner = new Spanner({ projectId: container.getProjectId() });
      // }

      const admin = spanner.getInstanceAdminClient();
      const [configs] = await admin.listInstanceConfigs({
        parent: admin.projectPath(container.getProjectId()),
      });

      const expectedConfigName = admin.instanceConfigPath(container.getProjectId(), "emulator-config");
      expect(configs.map((c) => c.name)).toContain(expectedConfigName);
    });
  });
});
