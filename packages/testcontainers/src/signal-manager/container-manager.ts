import { StartedTestContainer } from "../test-container";

export class ContainerManager {
    private static instance: ContainerManager;
    private containers: Map<string, StartedTestContainer> = new Map();

    private constructor() {}

    public static getInstance(): ContainerManager {
        if (!ContainerManager.instance) {
            ContainerManager.instance = new ContainerManager();
        }
        return ContainerManager.instance;
    }

    public addContainer(container: StartedTestContainer) {
        this.containers.set(container.getId(), container);
    }

    public removeContainer(container: StartedTestContainer) {
        this.containers.delete(container.getId());
    }

    public destroyAllContainers() {
        this.containers.forEach((container) => {
            try{
                container.stop();
            } catch (error) {
                console.error(`Error stopping container ${container.getId()}:`, error);
            }
        });
    }
}