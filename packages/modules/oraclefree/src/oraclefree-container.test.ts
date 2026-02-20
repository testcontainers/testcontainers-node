import oracledb from "oracledb";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { OracleDbContainer, StartedOracleDbContainer } from "./oraclefree-container";

const IMAGE = getImage(__dirname);

describe.sequential("OracleFreeContainer", { timeout: 240_000 }, () => {
  describe("default configuration", () => {
    let container: StartedOracleDbContainer;

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

    it("should work with restarted container", async () => {
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

  it("should throw error when using default database name", () => {
    const container = new OracleDbContainer(IMAGE);
    expect(() => container.withDatabase("FREEPDB1")).toThrow('The default database "FREEPDB1" cannot be used');
  });

  it("should set the custom database and user", async () => {
    const customDatabase = "TESTDB";
    const customUsername = "CUSTOMUSER";
    const customPassword = "customPassword";
    await using container = await new OracleDbContainer(IMAGE)
      .withDatabase(customDatabase)
      .withUsername(customUsername)
      .withPassword(customPassword)
      .start();

    const connection = await oracledb.getConnection({
      user: customUsername,
      password: customPassword,
      connectString: container.getUrl(),
    });

    const result = await connection.execute("SELECT SYS_CONTEXT('USERENV', 'CON_NAME') FROM DUAL");
    expect(result.rows![0]).toEqual([customDatabase]);

    const resultUser = await connection.execute("SELECT USER FROM DUAL");
    expect(resultUser.rows![0]).toEqual([customUsername]);

    await connection.close();
  });
});
