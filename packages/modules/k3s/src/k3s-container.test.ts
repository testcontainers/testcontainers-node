import { K3sContainer } from "./k3s-container";
import * as k8s from "@kubernetes/client-node";
import { setTimeout } from "node:timers/promises";

describe("K3s", () => {
  jest.setTimeout(150_000);

  it("should start and have listable node", async () => {
    // starting_k3s {
    const container = await new K3sContainer().start();
    // }

    // connecting_with_client {
    // obtain a kubeconfig file which allows us to connect to k3s
    const kubeConfig = container.getKubeConfig();

    const kc = new k8s.KubeConfig();
    kc.loadFromString(kubeConfig);

    const client = kc.makeApiClient(k8s.CoreV1Api);

    // interact with the running K3s server, e.g.:
    const nodeList = await client.listNode();
    // }

    expect(nodeList.items).toHaveLength(1);

    await container.stop();
  });

  it("should start a pod", async () => {
    const container = await new K3sContainer().start();
    const kc = new k8s.KubeConfig();
    kc.loadFromString(container.getKubeConfig());

    const pod = {
      metadata: {
        name: "helloworld",
      },
      spec: {
        containers: [
          {
            name: "helloworld",
            image: "testcontainers/helloworld:1.1.0",
            ports: [
              {
                containerPort: 8080,
              },
            ],
            readinessProbe: {
              tcpSocket: {
                port: 8080,
              },
            },
          },
        ],
      },
    };

    const client = kc.makeApiClient(k8s.CoreV1Api);
    await client.createNamespacedPod({ namespace: "default", body: pod });

    // wait for pod to be ready
    let ready = false;
    for (const startTime = Date.now(); Date.now() - startTime < 60_000; ) {
      const podList = await client.listNamespacedPod({ namespace: "default" });
      const pod = podList.items.find((pod) => pod.metadata?.name === "helloworld");
      const status = pod?.status;
      ready =
        status?.phase === "Running" &&
        !!status?.conditions?.some((cond) => cond.type === "Ready" && cond.status === "True");
      if (ready) break;
      await setTimeout(3_000);
    }

    expect(ready).toBe(true);

    await container.stop();
  });
});
