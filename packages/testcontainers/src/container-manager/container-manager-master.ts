import { log } from "../common";
import { StartedTestContainer } from "../test-container";

export class ContainerManagerMaster{
    private static instance: ContainerManagerMaster | null = null;
    private containers: Map<string, StartedTestContainer> = new Map();
    private isShuttingDown = false;

    protected constructor() { }

    public static getInstance(): ContainerManagerMaster {
        if (!ContainerManagerMaster.instance) {
            ContainerManagerMaster.instance = new ContainerManagerMaster();
        }
        return ContainerManagerMaster.instance;
    }
    public async addContainer(container: StartedTestContainer): Promise<void> {
        log.debug(`Adding container ${container.getId()}...`);
        this.containers.set(container.getId(), container);
    }
    public  removeContainer(container: StartedTestContainer): boolean {
        log.debug(`Removing container ${container.getId()}...`);
        return this.containers.delete(container.getId());
    }
    public async destroyAllContainers(): Promise<void> {
        const containerPromises = Array.from(this.containers.values()).map(async (container) => {
            try {
                const containerId = container.getId();
                log.debug(`Stopping container ${containerId}...`);
                await container.stop();
                log.debug(`Container ${containerId} stopped successfully`);
            } catch (error) {
                log.error(`Error stopping container ${container.getId()}:${error}`);
            }
        });
        await Promise.allSettled(containerPromises);
        this.destroyInstance();
    }
    public getContainerCount(): number {
        log.debug(`containers size is ${this.containers.size}`);
        return this.containers.size;
    }

    public destroyInstance(): void {
        ContainerManagerMaster.instance = null;
    }
}