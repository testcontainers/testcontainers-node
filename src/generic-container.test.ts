import fetch from "node-fetch";
import { GenericContainer } from "./generic-container";

describe("GenericContainer", () => {
    it("should start and stop a container", async () => {
        const container = await new GenericContainer("tutum/hello-world").withExposedPorts(80).start();
        const testUrl = `http://localhost:${container.getMappedPort(80)}`;

        const containerResponse = await fetch(testUrl);
        expect(containerResponse.status).toBe(200);

        await container.stop();
    }, 10000);
});
