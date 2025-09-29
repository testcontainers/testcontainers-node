import * as k8s from "@kubernetes/client-node";
import { GenericContainer, Network, Wait } from "testcontainers";
import { getImage } from "../../../testcontainers/src/utils/test-helper";
import { K3sContainer } from "./k3s-container";

const IMAGE = getImage(__dirname);
const KUBECTL_IMAGE = getImage(__dirname, 1);

describe("K3sContainer", { timeout: 120_000 }, () => {
  // K3sContainer runs as a privileged container
  if (!process.env["CI_ROOTLESS"]) {
    it("should start and have listable node", async () => {
      // k3sListNodes {
      await using container = await new K3sContainer(IMAGE).start();

      const kubeConfig = new k8s.KubeConfig();
      kubeConfig.loadFromString(container.getKubeConfig());

      const client = kubeConfig.makeApiClient(k8s.CoreV1Api);
      const nodeList = await client.listNode();

      expect(nodeList.items).toHaveLength(1);
      // }
    });

    it("should start a pod", async () => {
      // k3sStartPod {
      await using container = await new K3sContainer(IMAGE).start();

      const kubeConfig = new k8s.KubeConfig();
      kubeConfig.loadFromString(container.getKubeConfig());

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

      const client = kubeConfig.makeApiClient(k8s.CoreV1Api);
      await client.createNamespacedPod({ namespace: "default", body: pod });

      await vi.waitFor(async () => {
        const { status } = await client.readNamespacedPodStatus({ namespace: "default", name: "helloworld" });

        return (
          status?.phase === "Running" &&
          status?.conditions?.some((cond) => cond.type === "Ready" && cond.status === "True")
        );
      }, 60_000);
      // }
    });

    it("should expose kubeconfig for a network alias", async () => {
      // k3sAliasedKubeConfig {
      await using network = await new Network().start();
      await using container = await new K3sContainer(IMAGE).withNetwork(network).withNetworkAliases("k3s").start();

      const kubeConfig = container.getAliasedKubeConfig("k3s");

      await using kubectlContainer = await new GenericContainer(KUBECTL_IMAGE)
        .withNetwork(network)
        .withCopyContentToContainer([{ content: kubeConfig, target: "/home/kubectl/.kube/config" }])
        .withCommand(["get", "namespaces"])
        .withWaitStrategy(Wait.forOneShotStartup())
        .start();

      const chunks = await (await kubectlContainer.logs()).toArray();
      expect(chunks).toEqual(expect.arrayContaining([expect.stringContaining("kube-system")]));
      // }
    });
  }
});
