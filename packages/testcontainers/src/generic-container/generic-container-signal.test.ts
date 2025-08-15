import { ContainerManagerMaster } from "../container-manager/container-manager-master";
import { ContainerManager } from "../container-manager/destory-manager";
import { getRunningContainerNames } from "../utils/test-helper";
import { GenericContainer } from "./generic-container";


describe("GenericContainer manager", { timeout: 180_000 }, () => {
    it("should add container to manager", async () => {
        const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").withExposedPorts(8080).withSignal().start();
        expect(ContainerManagerMaster.getInstance().getContainerCount()).toBe(1);
        await container.stop();
        ContainerManagerMaster.getInstance().destroyInstance();

    });
    it("should remove container from manager", async () => {
        const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").withExposedPorts(8080).withSignal().start();
        expect(await ContainerManager.removeContainer(container)).toBe(true);
        expect(ContainerManagerMaster.getInstance().getContainerCount()).toBe(0);
        ContainerManagerMaster.getInstance().destroyInstance();
    });
    it("should destroy all containers when destory is called", async () => {
        const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").withExposedPorts(8080).withSignal().start();
        expect(container.getId()).toBeDefined();
        expect(ContainerManagerMaster.getInstance().getContainerCount()).toBe(1);
        await ContainerManagerMaster.getInstance().destroyAllContainers();
        expect(ContainerManagerMaster.getInstance().getContainerCount()).toBe(0);
        expect(await getRunningContainerNames()).not.toContain(container.getName());
        ContainerManagerMaster.getInstance().destroyInstance();
    });
    it("should destroy all containers created ", async () => {
        const containersName = [];
        for (let i = 0; i < 10; i++) {
            const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").withExposedPorts(8080).withSignal().start();
            expect(container.getId()).toBeDefined();
            expect(ContainerManagerMaster.getInstance().getContainerCount()).toBe(i + 1);
            containersName.push(container.getName());
        }
        await ContainerManager.destroyAllContainers();
        expect(ContainerManagerMaster.getInstance().getContainerCount()).toBe(0);
        ContainerManagerMaster.getInstance().destroyInstance();
    });
    it("if stops called remove from the manager", async () => {
        const container = await new GenericContainer("cristianrgreco/testcontainer:1.1.14").withExposedPorts(8080).withSignal().start();
        expect(container.getId()).toBeDefined();
        expect(ContainerManagerMaster.getInstance().getContainerCount()).toBe(1);
        await container.stop();
        expect(ContainerManagerMaster.getInstance().getContainerCount()).toBe(0);
        expect(await getRunningContainerNames()).not.toContain(container.getName());
        await expect(ContainerManager.destroyAllContainers()).resolves.not.toThrow();
    });
});
