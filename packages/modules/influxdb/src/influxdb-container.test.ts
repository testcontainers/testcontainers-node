import { InfluxDBContainer, StartedInfluxDBContainer } from "./influxdb-container";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import axios from "axios";

const IMAGE = getImage(__dirname);

describe("InfluxDBContainer", { timeout: 240_000 }, () => {

  describe("InfluxDB 2.x", { timeout: 240_000 }, () => {
    let container: StartedInfluxDBContainer;

    afterEach(async () => {
      if (container) {
        await container.stop();
      }
    });

    it("should start with default configuration", async () => {
      container = await new InfluxDBContainer(IMAGE).start();

      expect(container.getPort()).toBeGreaterThan(0);
      expect(container.getUsername()).toBe("test-user");
      expect(container.getPassword()).toBe("test-password");
      expect(container.getOrganization()).toBe("test-org");
      expect(container.getBucket()).toBe("test-bucket");
      expect(container.isInfluxDB2()).toBe(true);
    });

    it("should start with custom configuration", async () => {
      container = await new InfluxDBContainer(IMAGE)
        .withUsername("custom-user")
        .withPassword("custom-password")
        .withOrganization("custom-org")
        .withBucket("custom-bucket")
        .withRetention("7d")
        .withAdminToken("my-super-secret-token")
        .start();

      expect(container.getUsername()).toBe("custom-user");
      expect(container.getPassword()).toBe("custom-password");
      expect(container.getOrganization()).toBe("custom-org");
      expect(container.getBucket()).toBe("custom-bucket");
      expect(container.getAdminToken()).toBe("my-super-secret-token");
    });

    it("should respond to ping endpoint", async () => {
      container = await new InfluxDBContainer(IMAGE).start();

      const response = await axios.get(`${container.getUrl()}/ping`);
      expect(response.status).toBe(204);
    });

    it("should provide correct connection string", async () => {
      container = await new InfluxDBContainer(IMAGE)
        .withOrganization("my-org")
        .withBucket("my-bucket")
        .withAdminToken("my-token")
        .start();

      const connectionString = container.getConnectionString();
      expect(connectionString).toContain(container.getUrl());
      expect(connectionString).toContain("org=my-org");
      expect(connectionString).toContain("bucket=my-bucket");
      expect(connectionString).toContain("token=my-token");
    });

    it("should be able to write and query data", async () => {
      const adminToken = "test-admin-token";
      container = await new InfluxDBContainer(IMAGE)
        .withAdminToken(adminToken)
        .start();

      // Write data using the InfluxDB 2.x API
      const writeUrl = `${container.getUrl()}/api/v2/write?org=${container.getOrganization()}&bucket=${container.getBucket()}`;
      const writeData = "temperature,location=room1 value=23.5";
      
      const writeResponse = await axios.post(writeUrl, writeData, {
        headers: {
          Authorization: `Token ${adminToken}`,
          "Content-Type": "text/plain",
        },
      });
      
      expect(writeResponse.status).toBe(204);

      // Query data
      const queryUrl = `${container.getUrl()}/api/v2/query?org=${container.getOrganization()}`;
      const query = {
        query: `from(bucket: "${container.getBucket()}") |> range(start: -1h) |> filter(fn: (r) => r._measurement == "temperature")`,
        type: "flux",
      };

      const queryResponse = await axios.post(queryUrl, query, {
        headers: {
          Authorization: `Token ${adminToken}`,
          "Content-Type": "application/json",
        },
      });

      expect(queryResponse.status).toBe(200);
    });

    it("should start with specific version", async () => {
      container = await new InfluxDBContainer(IMAGE).start();

      expect(container.isInfluxDB2()).toBe(true);
      
      const response = await axios.get(`${container.getUrl()}/ping`);
      expect(response.status).toBe(204);
    });
  });

  describe("InfluxDB 1.x", { timeout: 240_000 }, () => {
    let container: StartedInfluxDBContainer;

    afterEach(async () => {
      if (container) {
        await container.stop();
      }
    });

    it("should start InfluxDB 1.8 with default configuration", async () => {
      container = await new InfluxDBContainer("influxdb:1.8").start();

      expect(container.getPort()).toBeGreaterThan(0);
      expect(container.getUsername()).toBe("test-user");
      expect(container.getPassword()).toBe("test-password");
      expect(container.isInfluxDB2()).toBe(false);
    });

    it("should start InfluxDB 1.8 with custom database", async () => {
      container = await new InfluxDBContainer("influxdb:1.8")
        .withDatabase("mydb")
        .withUsername("dbuser")
        .withPassword("dbpass")
        .withAuthEnabled(true)
        .withAdmin("superadmin")
        .withAdminPassword("superpass")
        .start();

      expect(container.getDatabase()).toBe("mydb");
      expect(container.getUsername()).toBe("dbuser");
      expect(container.getPassword()).toBe("dbpass");
    });

    it("should respond to ping endpoint for v1", async () => {
      container = await new InfluxDBContainer("influxdb:1.8")
        .withAuthEnabled(false)
        .start();

      const response = await axios.get(`${container.getUrl()}/ping`);
      expect(response.status).toBe(204);
    });

    it("should provide correct connection string for v1", async () => {
      container = await new InfluxDBContainer("influxdb:1.8")
        .withDatabase("testdb")
        .withUsername("user1")
        .withPassword("pass1")
        .start();

      const connectionString = container.getConnectionString();
      expect(connectionString).toContain(container.getHost());
      expect(connectionString).toContain("user1");
      expect(connectionString).toContain("pass1");
      expect(connectionString).toContain("/testdb");
    });

    it("should be able to write data with v1 API", async () => {
      container = await new InfluxDBContainer("influxdb:1.8")
        .withDatabase("testdb")
        .withAuthEnabled(false)
        .start();

      // Write data using the InfluxDB 1.x API
      const writeUrl = `${container.getUrl()}/write?db=testdb`;
      const writeData = "cpu_usage,host=server01 value=0.64";
      
      const writeResponse = await axios.post(writeUrl, writeData, {
        headers: {
          "Content-Type": "text/plain",
        },
      });
      
      expect(writeResponse.status).toBe(204);

      // Query data
      const queryUrl = `${container.getUrl()}/query?db=testdb&q=SELECT * FROM cpu_usage`;
      const queryResponse = await axios.get(queryUrl);

      expect(queryResponse.status).toBe(200);
      expect(queryResponse.data).toHaveProperty("results");
    });
  });

  describe("Version Detection", { timeout: 240_000 }, () => {
    it("should correctly detect InfluxDB 2.x from image tag", async () => {
      // The default image in Dockerfile is 2.7
      const container = await new InfluxDBContainer(IMAGE).start();
      expect(container.isInfluxDB2()).toBe(true);
      await container.stop();
    });

    it("should correctly detect InfluxDB 1.x when using 1.8 image", async () => {
      const container = await new InfluxDBContainer("influxdb:1.8").start();
      expect(container.isInfluxDB2()).toBe(false);
      await container.stop();
    });
  });
});