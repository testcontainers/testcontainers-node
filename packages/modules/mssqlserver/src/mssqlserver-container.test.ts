import { Wait } from "testcontainers";
import sql, { config } from "mssql";
import { MSSQLServerContainer } from "./mssqlserver-container";

describe("MSSqlServerContainer", () => {
  jest.setTimeout(180_000);

  // connect {
  it("should connect and return a query result", async () => {
    const container = await new MSSQLServerContainer()
      .acceptLicense()
      .withWaitStrategy(Wait.forLogMessage(/.*Recovery is complete.*/, 1))
      .start();

    const sqlConfig: config = {
      user: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
      server: container.getHost(),
      port: container.getPort(),
      pool: {
        max: 10,
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
    await container.stop();
  });
  // }

  // uriConnect {
  it("should work with database URI", async () => {
    const container = await new MSSQLServerContainer()
      .acceptLicense()
      .withWaitStrategy(Wait.forLogMessage(/.*Recovery is complete.*/, 1))
      .start();

    const connectionString = container.getConnectionUri();
    const connection = await sql.connect(connectionString);

    const { recordset } = await connection.query`SELECT 1;`;
    expect(recordset).toStrictEqual([{ "": 1 }]);

    await connection.close();
    await container.stop();
  });
  // }

  // setPassword {
  it("should throw error with insecure password", async () => {
    try {
      const container = await new MSSQLServerContainer()
        .acceptLicense()
        .withPassword("password")
        .withWaitStrategy(Wait.forLogMessage(/.*Recovery is complete.*/, 1))
        .start();

      await container.stop();
    } catch (err) {
      expect((err as Error).message).toBe(
        "Password must contain characters from three of the following four categories:\n" +
          " - Latin uppercase letters (A through Z)\n" +
          " - Latin lowercase letters (a through z)\n" +
          " - Base 10 digits (0 through 9)\n" +
          " - Non-alphanumeric characters such as: exclamation point (!), dollar sign ($), number sign (#), " +
          "or percent (%)."
      );
    }
  });
  // }
});
