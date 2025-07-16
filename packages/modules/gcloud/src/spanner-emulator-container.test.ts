import { Spanner } from "@google-cloud/spanner";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { SpannerEmulatorContainer } from "./spanner-emulator-container";

// select the fourth FROM in the Dockerfile (spanner emulator)
const IMAGE = getImage(__dirname, 3);

describe("SpannerEmulatorContainer", { timeout: 240_000 }, () => {
  it("should start, expose endpoints and accept real client connections", async () => {
    // startup {
    const container = await new SpannerEmulatorContainer(IMAGE).withProjectId("test-project").start();

    // 1) get the endpoint
    const grpcEndpoint = container.getEmulatorGrpcEndpoint();

    // 2) configure the client to talk to our emulator
    process.env.SPANNER_EMULATOR_HOST = grpcEndpoint;
    const client = new Spanner({ projectId: container.getProjectId() });

    // 3) use InstanceAdminClient to list instance configs
    const admin = client.getInstanceAdminClient();
    const [configs] = await admin.listInstanceConfigs({
      parent: admin.projectPath(container.getProjectId()),
    });

    // emulator always includes "emulator-config"
    const expectedConfigName = admin.instanceConfigPath(container.getProjectId(), "emulator-config");
    expect(configs.map((c) => c.name)).toContain(expectedConfigName);

    await container.stop();
    // }
  });
});
