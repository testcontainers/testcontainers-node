import sql, { config } from "mssql";
import { getImage } from "testcontainers/src/utils/test-helper";
import { MSSQLServerContainer } from "./mssqlserver-container";

const IMAGE = getImage(__dirname);

describe("MSSqlServerContainer", { timeout: 180_000 }, () => {
  // connect {
  it("should connect and return a query result", async () => {
    await using container = await new MSSQLServerContainer(IMAGE).acceptLicense().start();

    const sqlConfig: config = {
      user: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
      server: container.getHost(),
      port: container.getPort(),
      pool: {
        max: 1,
        min: 0,
        idleTimeoutMillis: 30000,
      },
      options: {
        trustServerCertificate: true,
      },
    };

    const connection = await sql.connect(sqlConfig);

    const { recordset } = await connection.query`SELECT 1;`;
    expect(recordset).toStrictEqual([{ "": 1 }]);

    await connection.close();
  });
  // }

  // uriConnect {
  it("should connect and return a query result with database URI", async () => {
    await using container = await new MSSQLServerContainer(IMAGE).acceptLicense().start();

    const connectionString = container.getConnectionUri();
    const connection = await sql.connect(connectionString);

    const { recordset } = await connection.query`SELECT 1;`;
    expect(recordset).toStrictEqual([{ "": 1 }]);

    await connection.close();
  });
  // }

  // validPassword {
  it("should connect and return a query result with valid custom password", async () => {
    await using container = await new MSSQLServerContainer(IMAGE).acceptLicense().withPassword("I!@M#$eCur3").start();

    const connectionString = container.getConnectionUri();
    const connection = await sql.connect(connectionString);

    const { recordset } = await connection.query`SELECT 1;`;
    expect(recordset).toStrictEqual([{ "": 1 }]);

    await connection.close();
  });
  // }

  // invalidPassword {
  it("should throw error with invalid password", async () => {
    const container = new MSSQLServerContainer(IMAGE).acceptLicense().withPassword("password");
    await expect(container.start()).rejects.toThrow(
      Error('Log stream ended and message "/.*Recovery is complete.*/" was not received')
    );
  });
  // }

  // expressEdition {
  it("should start db with express edition", async () => {
    await using container = await new MSSQLServerContainer(IMAGE)
      .withWaitForMessage(/.*Attribute synchronization manager initialized*/)
      .acceptLicense()
      .withEnvironment({ MSSQL_PID: "Express" })
      .start();

    const { output, exitCode } = await container.exec([
      "/opt/mssql-tools/bin/sqlcmd",
      "-S",
      container.getHost(),
      "-U",
      container.getUsername(),
      "-P",
      container.getPassword(),
      "-Q",
      "SELECT @@VERSION;",
    ]);

    expect(exitCode).toBe(0);
    expect(output).toContain("Express Edition");
  });
  // }
});
