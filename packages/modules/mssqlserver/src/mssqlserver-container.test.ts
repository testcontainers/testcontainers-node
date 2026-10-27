import sql, { type config } from "mssql";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { MSSQLServerContainer } from "./mssqlserver-container";

const IMAGES = ["mcr.microsoft.com/mssql/server:2022-CU27-ubuntu-22.04", getImage(__dirname)];

describe.each(IMAGES)("MSSQLServerContainer (%s)", { concurrent: false, timeout: 180_000 }, (image) => {
  it.concurrent("should connect and return a query result", async () => {
    // mssqlConnect {
    await using container = await new MSSQLServerContainer(image).acceptLicense().start();

    const sqlConfig: config = {
      user: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
      server: container.getHost(),
      port: container.getPort(),
      pool: { max: 1, min: 0, idleTimeoutMillis: 30000 },
      options: { trustServerCertificate: true },
    };
    const connection = await new sql.ConnectionPool(sqlConfig).connect();

    const { recordset } = await connection.query`SELECT 1;`;
    expect(recordset).toStrictEqual([{ "": 1 }]);

    await connection.close();
    // }
  });

  it.concurrent("should connect and return a query result with database URI", async () => {
    // mssqlUriConnect {
    await using container = await new MSSQLServerContainer(image).acceptLicense().start();

    const connectionString = container.getConnectionUri();
    const connection = await new sql.ConnectionPool(connectionString).connect();

    const { recordset } = await connection.query`SELECT 1;`;
    expect(recordset).toStrictEqual([{ "": 1 }]);

    await connection.close();
    // }
  });

  it.concurrent("should connect and return a query result with valid custom password", async () => {
    // mssqlValidPassword {
    await using container = await new MSSQLServerContainer(image).acceptLicense().withPassword("I!@M#$eCur3").start();
    // }

    const connectionString = container.getConnectionUri();
    const connection = await new sql.ConnectionPool(connectionString).connect();

    const { recordset } = await connection.query`SELECT 1;`;
    expect(recordset).toStrictEqual([{ "": 1 }]);

    await connection.close();
  });

  it.concurrent("should throw error with invalid password", async () => {
    const container = new MSSQLServerContainer(image).acceptLicense().withPassword("password");
    await expect(container.start()).rejects.toThrow(
      'Log stream ended and message "/.*Recovery is complete.*/" was not received'
    );
  });

  it.concurrent("should start db with express edition", async () => {
    // mssqlExpressEdition {
    await using container = await new MSSQLServerContainer(image)
      .acceptLicense()
      .withEnvironment({ MSSQL_PID: "Express" })
      .withWaitForMessage(/.*SQL Server is now ready for client connections.*/)
      .start();
    // }

    const connection = await new sql.ConnectionPool(container.getConnectionUri()).connect();

    const { recordset } = await connection.query`SELECT SERVERPROPERTY('Edition') AS edition;`;
    expect(recordset[0].edition).toContain("Express Edition");

    await connection.close();
  });
});

describe("MSSQLServerContainer", { timeout: 180_000 }, () => {
  it("should use custom wait message", async () => {
    await using _ = await new MSSQLServerContainer("alpine")
      .withCommand(["/bin/sh", "-c", 'echo "custom ready"; sleep 5'])
      .withWaitForMessage("custom ready")
      .withStartupTimeout(1_000)
      .start();
  });
});
