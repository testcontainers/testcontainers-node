import {
  AbstractStartedContainer,
  BoundPorts,
  ContainerRuntimeClient,
  GenericContainer,
  getContainerRuntimeClient,
  InspectResult,
  IntervalRetry,
  log,
  StartedTestContainer,
  Wait,
  WaitStrategy,
} from "testcontainers";
import { BucketDefinition } from "./bucket-definition";
import { CouchbaseService } from "./couchbase-service";
import PORTS from "./ports";

export class CouchbaseContainer extends GenericContainer {
  private static readonly DEFAULT_IMAGE_NAME = "couchbase/server";
  private static readonly DEFAULT_TAG = "6.5.1";

  private username = "Administrator";
  private password = "password";

  private enabledServices: Set<CouchbaseService> = new Set([
    CouchbaseService.KV,
    CouchbaseService.QUERY,
    CouchbaseService.SEARCH,
    CouchbaseService.INDEX,
  ]);

  private readonly customServiceQuotas: Map<CouchbaseService, number> = new Map();

  private readonly buckets: Set<BucketDefinition> = new Set([]);

  private isEnterprise = false;

  constructor(image = `${CouchbaseContainer.DEFAULT_IMAGE_NAME}:${CouchbaseContainer.DEFAULT_TAG}`) {
    super(image);
    this.withExposedPorts(...this.getPortsToExpose()).withWaitStrategy(
      Wait.forLogMessage("Starting Couchbase Server -- Web UI available at http://<ip>:8091")
    );
  }

  withCredentials(username: string, password: string) {
    this.username = username;
    this.password = password;
    return this;
  }

  withBucket(bucket: BucketDefinition) {
    this.buckets.add(bucket);
    return this;
  }

  withEnabledServices(...services: CouchbaseService[]) {
    this.enabledServices = new Set([...services]);
    return this;
  }

  withServiceQuota(service: CouchbaseService, quotaMb: number) {
    if (!service.hasQuota()) {
      throw new Error(`The provided service (${service}) has no quota to configure`);
    }

    if (quotaMb < service.getMinimumQuotaMb()) {
      throw new Error(
        `The custom quota (${quotaMb}) must not be smaller than the minimum quota for the service (${service.getMinimumQuotaMb()})`
      );
    }

    this.customServiceQuotas.set(service, quotaMb);
    return this;
  }

  withAnalyticService() {
    this.enabledServices.add(CouchbaseService.ANALYTICS);
    return this;
  }

  withEventingService() {
    this.enabledServices.add(CouchbaseService.EVENTING);
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async doHttpRequest(host: string, port: number, path: string, method: string, body: any, auth = false) {
    try {
      return await fetch(`http://${host}:${port}${path}`, {
        method,
        body,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          ...(auth ? { Authorization: `Basic ${btoa(this.username + ":" + this.password)}` } : {}),
        },
      });
    } catch (e) {
      throw new Error(`Could not perform request against couchbase HTTP endpoint ${e}`);
    }
  }

  private async checkResponse(response: Response, errorMessage: string) {
    if (!response.status.toString().startsWith("2")) {
      throw new Error(`${errorMessage}:${await response.text()}`);
    }
  }

  private getPortsToExpose() {
    const exposedPorts = [PORTS.MGMT_PORT, PORTS.MGMT_SSL_PORT];

    if (this.enabledServices.has(CouchbaseService.KV)) {
      exposedPorts.push(PORTS.KV_PORT, PORTS.KV_SSL_PORT, PORTS.VIEW_PORT, PORTS.VIEW_SSL_PORT);
    }
    if (this.enabledServices.has(CouchbaseService.ANALYTICS)) {
      exposedPorts.push(PORTS.ANALYTICS_PORT, PORTS.ANALYTICS_SSL_PORT);
    }
    if (this.enabledServices.has(CouchbaseService.QUERY)) {
      exposedPorts.push(PORTS.QUERY_PORT, PORTS.QUERY_SSL_PORT);
    }
    if (this.enabledServices.has(CouchbaseService.SEARCH)) {
      exposedPorts.push(PORTS.SEARCH_PORT, PORTS.SEARCH_SSL_PORT);
    }
    if (this.enabledServices.has(CouchbaseService.EVENTING)) {
      exposedPorts.push(PORTS.EVENTING_PORT, PORTS.EVENTING_SSL_PORT);
    }
    return exposedPorts;
  }

  private constructWaitStrategies() {
    const waitStrategies: WaitStrategy[] = [];

    waitStrategies.push(
      Wait.forHttp("/pools/default", PORTS.MGMT_PORT)
        .withBasicCredentials(this.username, this.password)
        .forStatusCode(200)
        .forResponsePredicate((response) => {
          try {
            const jsonResponse = JSON.parse(response);
            return jsonResponse.nodes[0].status === "healthy";
          } catch (e) {
            log.error(`Unable to parse response: ${response}, error: ${e}`);
            return false;
          }
        })
    );

    if (this.enabledServices.has(CouchbaseService.QUERY)) {
      waitStrategies.push(
        Wait.forHttp("/admin/ping", PORTS.QUERY_PORT)
          .withBasicCredentials(this.username, this.password)
          .forStatusCode(200)
      );
    }

    if (this.enabledServices.has(CouchbaseService.ANALYTICS)) {
      waitStrategies.push(
        Wait.forHttp("/admin/ping", PORTS.ANALYTICS_PORT)
          .withBasicCredentials(this.username, this.password)
          .forStatusCode(200)
      );
    }

    if (this.enabledServices.has(CouchbaseService.EVENTING)) {
      waitStrategies.push(
        Wait.forHttp("/api/v1/config", PORTS.EVENTING_PORT)
          .withBasicCredentials(this.username, this.password)
          .forStatusCode(200)
      );
    }
    return waitStrategies;
  }

  private async waitUntilNodeIsOnline(
    client: ContainerRuntimeClient,
    inspectResult: InspectResult,
    startedTestContainer: StartedTestContainer
  ) {
    return Wait.forHttp("/pools", PORTS.MGMT_PORT)
      .forStatusCode(200)
      .waitUntilReady(
        client.container.getById(startedTestContainer.getId()),
        BoundPorts.fromInspectResult(client.info.containerRuntime.hostIps, inspectResult)
      );
  }

  private async initializeIsEnterprise(container: StartedTestContainer) {
    const response = await this.doHttpRequest(
      container.getHost(),
      container.getMappedPort(PORTS.MGMT_PORT),
      "/pools",
      "GET",
      undefined,
      true
    );
    let jsonResponse;
    try {
      jsonResponse = (await response.json()) as { isEnterprise: boolean };
    } catch (e) {
      throw new Error("Couchbase /pools did not return valid JSON");
    }

    this.isEnterprise = jsonResponse.isEnterprise;

    if (!jsonResponse.isEnterprise) {
      if (this.enabledServices.has(CouchbaseService.ANALYTICS)) {
        throw new Error("The Analytics Service is only supported with the Enterprise version");
      }

      if (this.enabledServices.has(CouchbaseService.EVENTING)) {
        throw new Error("The Eventing Service is only supported with the Enterprise version");
      }
    }
  }

  private async renameNode(container: StartedTestContainer, inspectResult: InspectResult) {
    log.debug(`Renaming Couchbase Node from localhost to ${container.getHost()}`);

    const networkName = container.getNetworkNames()[0];
    const internalIpAddress = inspectResult.networkSettings[networkName].ipAddress;
    const body = new URLSearchParams();
    body.append("hostname", internalIpAddress);

    const response = await this.doHttpRequest(
      container.getHost(),
      container.getMappedPort(PORTS.MGMT_PORT),
      "/node/controller/rename",
      "POST",
      body.toString()
    );

    await this.checkResponse(response, "Could not rename couchbase node");
  }

  private async initializeServices(container: StartedTestContainer) {
    const services = Array.from(this.enabledServices)
      .map((service) => service.getIdentifier())
      .join(",");

    log.debug(`Initializing couchbase services on host: ${services}`);

    const body = new URLSearchParams();
    body.append("services", services);

    const response = await this.doHttpRequest(
      container.getHost(),
      container.getMappedPort(PORTS.MGMT_PORT),
      "/node/controller/setupServices",
      "POST",
      body
    );

    await this.checkResponse(response, "Could not enable couchbase services");
  }

  private async setMemoryQuotas(container: StartedTestContainer) {
    log.debug(`Custom service memory quotas: ${this.customServiceQuotas}`);
    for (const service of this.enabledServices) {
      if (!service.hasQuota()) {
        continue;
      }

      const body = new URLSearchParams();
      const quota = this.customServiceQuotas.get(service) || service.getMinimumQuotaMb();

      if (service.getIdentifier() === CouchbaseService.KV.getIdentifier()) {
        body.set("memoryQuota", quota.toString());
      } else {
        body.set(`${service.getIdentifier()}MemoryQuota`, quota.toString());
      }

      const response = await this.doHttpRequest(
        container.getHost(),
        container.getMappedPort(PORTS.MGMT_PORT),
        "/pools/default",
        "POST",
        body
      );

      await this.checkResponse(response, "Could not configure service memory quotas");
    }
  }

  private async configureAdminUser(container: StartedTestContainer) {
    log.debug(`Configuring couchbase admin user with username: "${this.username}"`);
    const body = new URLSearchParams();
    body.set("username", this.username);
    body.set("password", this.password);
    body.set("port", PORTS.MGMT_PORT.toString());

    const response = await this.doHttpRequest(
      container.getHost(),
      container.getMappedPort(PORTS.MGMT_PORT),
      "/settings/web",
      "POST",
      body
    );

    await this.checkResponse(response, "Could not configure couchbase admin user");
  }

  private async configureExternalPorts(container: StartedTestContainer) {
    log.debug("Mapping external ports to the alternate address configuration");
    const body = new URLSearchParams();

    body.set("hostname", container.getHost());
    body.set("mgmt", container.getMappedPort(PORTS.MGMT_PORT).toString());
    body.set("mgmtSSL", container.getMappedPort(PORTS.MGMT_SSL_PORT).toString());

    if (this.enabledServices.has(CouchbaseService.KV)) {
      body.set("kv", container.getMappedPort(PORTS.KV_PORT).toString());
      body.set("kvSSL", container.getMappedPort(PORTS.KV_SSL_PORT).toString());
      body.set("capi", container.getMappedPort(PORTS.VIEW_PORT).toString());
      body.set("capiSSL", container.getMappedPort(PORTS.VIEW_SSL_PORT).toString());
    }

    if (this.enabledServices.has(CouchbaseService.QUERY)) {
      body.set("n1ql", container.getMappedPort(PORTS.QUERY_PORT).toString());
      body.set("n1qlSSL", container.getMappedPort(PORTS.QUERY_SSL_PORT).toString());
    }

    if (this.enabledServices.has(CouchbaseService.SEARCH)) {
      body.set("fts", container.getMappedPort(PORTS.SEARCH_PORT).toString());
      body.set("ftsSSL", container.getMappedPort(PORTS.SEARCH_SSL_PORT).toString());
    }

    if (this.enabledServices.has(CouchbaseService.ANALYTICS)) {
      body.set("cbas", container.getMappedPort(PORTS.ANALYTICS_PORT).toString());
      body.set("cbasSSL", container.getMappedPort(PORTS.ANALYTICS_SSL_PORT).toString());
    }

    if (this.enabledServices.has(CouchbaseService.EVENTING)) {
      body.set("eventingAdminPort", container.getMappedPort(PORTS.EVENTING_PORT).toString());
      body.set("eventingSSL", container.getMappedPort(PORTS.EVENTING_SSL_PORT).toString());
    }

    const response = await this.doHttpRequest(
      container.getHost(),
      container.getMappedPort(PORTS.MGMT_PORT),
      "/node/controller/setupAlternateAddresses/external",
      "PUT",
      body,
      true
    );
    await this.checkResponse(response, "Could not configure external ports");
  }

  private async configureIndexer(container: StartedTestContainer) {
    log.debug("Configuring the indexer service");
    const body = new URLSearchParams();
    body.set("storageMode", this.isEnterprise ? "memory_optimized" : "forestdb");

    const response = await this.doHttpRequest(
      container.getHost(),
      container.getMappedPort(PORTS.MGMT_PORT),
      "/settings/indexes",
      "POST",
      body,
      true
    );

    await this.checkResponse(response, "Could not configure the indexing service");
  }

  private async createBuckets(
    client: ContainerRuntimeClient,
    inspectResult: InspectResult,
    startedTestContainer: StartedTestContainer
  ) {
    log.debug(`Creating ${this.buckets.size} buckets (and corresponding indexes).`);
    for (const bucket of this.buckets) {
      log.debug(`Creating bucket ${bucket.getName()}`);

      const body = new URLSearchParams();
      body.set("name", bucket.getName());
      body.set("ramQuotaMB", bucket.getQuota().toString());
      body.set("flushEnabled", bucket.hasFlushEnabled() ? "1" : "0");
      body.set("replicaNumber", bucket.getNumOfReplicas().toString());

      const response = await this.doHttpRequest(
        startedTestContainer.getHost(),
        startedTestContainer.getMappedPort(PORTS.MGMT_PORT),
        "/pools/default/buckets",
        "POST",
        body,
        true
      );

      await this.checkResponse(response, `Could not create bucket ${bucket.getName()}`);

      await Wait.forHttp(`/pools/default/b/${bucket.getName()}`, PORTS.MGMT_PORT)
        .withBasicCredentials(this.username, this.password)
        .forStatusCode(200)
        .forResponsePredicate((response) => {
          try {
            const jsonResponse = JSON.parse(response);
            const services = jsonResponse["nodesExt"][0].services;
            const serviceNames = Object.keys(services);

            let found = false;
            for (const enabledService of this.enabledServices) {
              if (serviceNames.some((s) => s.startsWith(enabledService.getIdentifier()))) {
                found = true;
              } else {
                found = false;
                log.trace(`Service ${enabledService.getIdentifier()} not yet part of config, retrying.`);
                break;
              }
            }
            return found;
          } catch (e) {
            log.error(`Unable to parse response: ${response} ${e}`);
            return false;
          }
        })
        .waitUntilReady(
          client.container.getById(startedTestContainer.getId()),
          BoundPorts.fromInspectResult(client.info.containerRuntime.hostIps, inspectResult)
        );

      if (this.enabledServices.has(CouchbaseService.KV)) {
        await new IntervalRetry<Response | undefined, Error>(1000).retryUntil(
          async () => {
            try {
              const body = new URLSearchParams();
              body.set(
                "statement",
                `SELECT COUNT(*) > 0 as present FROM system:keyspaces WHERE name = "${bucket.getName()}"`
              );

              const response = await this.doHttpRequest(
                startedTestContainer.getHost(),
                startedTestContainer.getMappedPort(PORTS.QUERY_PORT),
                "/query/service",
                "POST",
                body,
                true
              );

              await this.checkResponse(response, `Could not poll query service state for bucket: ${bucket.getName()}`);

              return response;
            } catch (e) {
              return undefined;
            }
          },
          async (response) => {
            if (response === undefined) {
              return false;
            }
            const jsonResponse = (await response.json()) as { results: Array<{ present: boolean }> };
            return jsonResponse.results[0].present;
          },
          () => {
            const message = `URL /query/service not accessible after ${this.startupTimeout || 60_000}ms`;
            log.error(message, { containerId: client.container.getById(startedTestContainer.getId()).id });

            throw new Error(message);
          },
          this.startupTimeout || 60_000
        );
      }

      if (bucket.hasPrimaryIndex()) {
        if (this.enabledServices.has(CouchbaseService.QUERY)) {
          const body = new URLSearchParams();
          body.set("statement", "CREATE PRIMARY INDEX on `" + bucket.getName() + "`"); //TODO: check here!

          const response = await this.doHttpRequest(
            startedTestContainer.getHost(),
            startedTestContainer.getMappedPort(PORTS.QUERY_PORT),
            "/query/service",
            "POST",
            body,
            true
          );

          await this.checkResponse(response, `Could not create primary index for bucket ${bucket.getName()}`);

          await new IntervalRetry<Response | undefined, Error>(1000).retryUntil(
            async () => {
              try {
                const body = new URLSearchParams();
                body.set(
                  "statement",
                  `SELECT COUNT(*) > 0 as online FROM system:indexes WHERE keyspace_id = "${bucket.getName()}" and is_primary = true and state = "online"`
                );

                const response = await this.doHttpRequest(
                  startedTestContainer.getHost(),
                  startedTestContainer.getMappedPort(PORTS.QUERY_PORT),
                  "/query/service",
                  "POST",
                  body,
                  true
                );

                await this.checkResponse(
                  response,
                  `Could not poll primary index state for bucket: ${bucket.getName()}`
                );

                return response;
              } catch (e) {
                return undefined;
              }
            },
            async (response) => {
              if (response === undefined) {
                return false;
              }
              const jsonResponse = (await response.json()) as { results: Array<{ online: boolean }> };
              return jsonResponse.results[0].online;
            },
            () => {
              const message = `URL /query/service not accessible after ${this.startupTimeout || 60_000}ms`;
              log.error(message, { containerId: client.container.getById(startedTestContainer.getId()).id });

              throw new Error(message);
            },
            this.startupTimeout || 60_000
          );
        } else {
          log.info(
            `Primary index creation for bucket ${bucket.getName()} ignored, since QUERY service is not present.`
          );
        }
      }
    }
  }

  protected override async containerStarted(
    startedTestContainer: StartedTestContainer,
    inspectResult: InspectResult
  ): Promise<void> {
    const client = await getContainerRuntimeClient();

    await this.waitUntilNodeIsOnline(client, inspectResult, startedTestContainer);
    await this.initializeIsEnterprise(startedTestContainer);
    await this.renameNode(startedTestContainer, inspectResult);
    await this.initializeServices(startedTestContainer);
    await this.setMemoryQuotas(startedTestContainer);
    await this.configureAdminUser(startedTestContainer);
    await this.configureExternalPorts(startedTestContainer);
    if (this.enabledServices.has(CouchbaseService.INDEX)) {
      await this.configureIndexer(startedTestContainer);
    }

    await Promise.all(
      this.constructWaitStrategies().map((s) =>
        s.waitUntilReady(
          client.container.getById(startedTestContainer.getId()),
          BoundPorts.fromInspectResult(client.info.containerRuntime.hostIps, inspectResult)
        )
      )
    );

    await this.createBuckets(client, inspectResult, startedTestContainer);

    log.info(
      `Couchbase container is ready! UI available at http://${startedTestContainer.getHost()}:${startedTestContainer.getMappedPort(
        PORTS.MGMT_PORT
      )}`
    );
  }

  public override async start(): Promise<StartedCouchbaseContainer> {
    return new StartedCouchbaseContainer(await super.start(), this.username, this.password);
  }
}

export class StartedCouchbaseContainer extends AbstractStartedContainer {
  private readonly host: string;
  private readonly username: string;
  private readonly password: string;

  constructor(startedTestContainer: StartedTestContainer, username: string, password: string) {
    super(startedTestContainer);
    this.host = startedTestContainer.getHost();
    this.username = username;
    this.password = password;
  }

  private getBootstrapCarrierDirectPort() {
    return this.getMappedPort(PORTS.KV_PORT);
  }

  getUsername() {
    return this.username;
  }

  getPassword() {
    return this.password;
  }

  getConnectionString() {
    return `couchbase://${this.host}:${this.getBootstrapCarrierDirectPort()}`;
  }
}
