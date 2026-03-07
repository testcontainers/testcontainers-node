import oracledb from "oracledb";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { OracleDbContainer, StartedOracleDbContainer } from "./oraclefree-container";

const IMAGE = getImage(__dirname);

describe("OracleFreeContainer", { timeout: 240_000 }, () => {
  describe("default configuration", () => {
    let container: StartedOracleDbContainer;

    // start one container for all tests in this block to save on resources
    beforeAll(async () => {
      container = await new OracleDbContainer(IMAGE).start();
    }, 120_000);

    afterAll(async () => {
      await container.stop();
    });

    it("should connect and return a query result", async () => {
      const connection = await oracledb.getConnection({
        user: container.getUsername(),
        password: container.getPassword(),
        connectString: container.getUrl(),
      });

      const result = await connection.execute("SELECT 1 FROM DUAL");
      expect(result.rows![0]).toEqual([1]);

      await connection.close();
    });

    it("should work with connection descriptor", async () => {
      const connection = await oracledb.getConnection({
        user: container.getUsername(),
        password: container.getPassword(),
        connectString: container.getConnectionDescriptor(),
      });

      const result = await connection.execute("SELECT 1 FROM DUAL");
      expect(result.rows![0]).toEqual([1]);

      await connection.close();
    });

    it("should have default database name", async () => {
      const connection = await oracledb.getConnection({
        user: container.getUsername(),
        password: container.getPassword(),
        connectString: container.getUrl(),
      });

      const result = await connection.execute("SELECT SYS_CONTEXT('USERENV', 'CON_NAME') FROM DUAL");
      expect(result.rows![0]).toEqual(["FREEPDB1"]);

      await connection.close();
    });
  });

  it("should treat default database names as no-op and reject empty names", () => {
    const container = new OracleDbContainer(IMAGE);
    expect(() => container.withDatabase("FREEPDB1")).not.toThrow();
    expect(() => container.withDatabase("freepdb1")).not.toThrow();
    expect(() => container.withDatabase("")).toThrow("Database name cannot be empty.");
  });

  it("should set the custom database and user", async () => {
    // customDatabase {
    const customDatabase = "TESTDB";
    const customUsername = "CUSTOMUSER";
    const customPassword = "customPassword";
    await using container = await new OracleDbContainer(IMAGE)
      .withDatabase(customDatabase)
      .withUsername(customUsername)
      .withPassword(customPassword)
      .start();

    const connection = await oracledb.getConnection({
      user: container.getUsername(),
      password: container.getPassword(),
      connectString: container.getUrl(),
    });

    const result = await connection.execute("SELECT SYS_CONTEXT('USERENV', 'CON_NAME') FROM DUAL");
    expect(result.rows![0]).toEqual([customDatabase]);

    const resultUser = await connection.execute("SELECT USER FROM DUAL");
    expect(resultUser.rows![0]).toEqual([customUsername]);

    await connection.close();
    // }
  });

  it("should work with restarted container", async () => {
    const container = await new OracleDbContainer(IMAGE).start();
    await container.restart();

    const connection = await oracledb.getConnection({
      user: container.getUsername(),
      password: container.getPassword(),
      connectString: container.getUrl(),
    });

    const result = await connection.execute("SELECT 1 FROM DUAL");
    expect(result.rows![0]).toEqual([1]);

    await connection.close();
  });
});
