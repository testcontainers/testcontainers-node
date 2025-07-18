import { Spanner } from "@google-cloud/spanner";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { SpannerEmulatorContainer } from "./spanner-emulator-container";

// select the fourth FROM in the Dockerfile (spanner emulator)
const IMAGE = getImage(__dirname, 3);

describe("SpannerEmulatorContainer", { timeout: 240_000 }, () => {
  // startupWithExplicitClient {
  it("should start, expose endpoints and accept real client connections using explicitly configured client", async () => {
    const container = await new SpannerEmulatorContainer(IMAGE).withProjectId("test-project").start();

    const client = new Spanner({
      projectId: container.getProjectId(),
      apiEndpoint: container.getHost(),
      port: container.getGrpcPort(),
      sslCreds: container.getSslCredentials(),
    });

    // list instance configs
    const admin = client.getInstanceAdminClient();
    const [configs] = await admin.listInstanceConfigs({
      parent: admin.projectPath(container.getProjectId()),
    });

    // emulator always includes "emulator-config"
    const expectedConfigName = admin.instanceConfigPath(container.getProjectId(), "emulator-config");
    expect(configs.map((c) => c.name)).toContain(expectedConfigName);

    await container.stop();
  });
  // }

  describe.sequential("Shared state", () => {
    afterEach(() => {
      process.env.SPANNER_EMULATOR_HOST = "";
    });

    // startupWithEnvironmentVariable {
    it("should start, expose endpoints and accept real client connections using projectId and SPANNER_EMULATOR_HOST", async () => {
      const container = await new SpannerEmulatorContainer(IMAGE).withProjectId("test-project").start();

      // configure the client to talk to our emulator
      process.env.SPANNER_EMULATOR_HOST = container.getEmulatorGrpcEndpoint();
      const client = new Spanner({ projectId: container.getProjectId() });

      // list instance configs
      const admin = client.getInstanceAdminClient();
      const [configs] = await admin.listInstanceConfigs({
        parent: admin.projectPath(container.getProjectId()),
      });

      // emulator always includes "emulator-config"
      const expectedConfigName = admin.instanceConfigPath(container.getProjectId(), "emulator-config");
      expect(configs.map((c) => c.name)).toContain(expectedConfigName);

      await container.stop();
    });
    // }
  });
});
