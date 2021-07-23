import Dockerode from "dockerode";

export type RemoveContainerOptions = {
  removeVolumes: boolean;
};

export const removeContainer = (container: Dockerode.Container, options: RemoveContainerOptions): Promise<void> => {
  try {
    return container.remove({
      v: options.removeVolumes,
    });
  } catch (err) {
    throw err;
  }
};
