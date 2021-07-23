import Dockerode from "dockerode";

export const startContainer = (container: Dockerode.Container): Promise<void> => {
  try {
    return container.start();
  } catch (err) {
    throw err;
  }
};
