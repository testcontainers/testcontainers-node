import { StartedTestContainer } from "../test-container";
import { ContainerManagerMaster } from "./container-manager-master";

export class ContainerManager{


  public static async addContainer(container: StartedTestContainer): Promise<void> {
    await ContainerManagerMaster.getInstance().addContainer(container);
  }
  public static async destroyAllContainers(): Promise<void> {
    await ContainerManagerMaster.getInstance().destroyAllContainers();
  }
  public static async removeContainer(container: StartedTestContainer): Promise<boolean>  {
    return ContainerManagerMaster.getInstance().removeContainer(container);
  }
}