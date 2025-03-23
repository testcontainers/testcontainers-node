import * as k8s from "@kubernetes/client-node";
import { setTimeout } from "node:timers/promises";
import { GenericContainer, Network, Wait } from "testcontainers";
import { K3sContainer } from "./k3s-container";

describe("K3s", { timeout: 120_000 }, () => {
  it("should construct", () => {
    new K3sContainer("rancher/k3s:v1.31.2-k3s1");
  });

  // K3sContainer runs as a privileged container
  if (!process.env["CI_ROOTLESS"]) {
    it("should start and have listable node", async () => {
      // starting_k3s {
      const container = await new K3sContainer("rancher/k3s:v1.31.2-k3s1").start();
      // }

      // connecting_with_client {
      // obtain a kubeconfig file that allows us to connect to k3s
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

    it("should expose kubeconfig for a network alias", async () => {
      const network = await new Network().start();
      const container = await new K3sContainer("rancher/k3s:v1.31.2-k3s1")
        .withNetwork(network)
        .withNetworkAliases("k3s")
        .start();

      // obtain a kubeconfig that allows us to connect on the custom network
      const kubeConfig = container.getAliasedKubeConfig("k3s");

      const kubectlContainer = await new GenericContainer("rancher/kubectl:v1.31.2")
        .withNetwork(network)
        .withCopyContentToContainer([{ content: kubeConfig, target: "/home/kubectl/.kube/config" }])
        .withCommand(["get", "namespaces"])
        .withWaitStrategy(Wait.forOneShotStartup())
        .withStartupTimeout(30_000)
        .start();

      const chunks = [];
      for await (const chunk of await kubectlContainer.logs()) {
        chunks.push(chunk);
      }
      expect(chunks).toEqual(expect.arrayContaining([expect.stringContaining("kube-system")]));

      await kubectlContainer.stop();
      await container.stop();
      await network.stop();
    });

    it("should start a pod", async () => {
      const container = await new K3sContainer("rancher/k3s:v1.31.2-k3s1").start();
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
      expect(await podIsReady(client, "default", "helloworld", 60_000)).toBe(true);

      await container.stop();
    });
  }
});

async function podIsReady(client: k8s.CoreV1Api, namespace: string, name: string, timeout: number): Promise<boolean> {
  for (const startTime = Date.now(); Date.now() - startTime < timeout; ) {
    const res = await client.readNamespacedPodStatus({ namespace, name });
    const ready =
      res.status?.phase === "Running" &&
      !!res.status?.conditions?.some((cond) => cond.type === "Ready" && cond.status === "True");
    if (ready) return true;
    await setTimeout(3_000);
  }
  return false;
}
