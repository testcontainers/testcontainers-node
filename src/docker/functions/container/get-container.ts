import { dockerode } from "../../dockerode";
import Dockerode from "dockerode";
import { Id } from "../../types";

export const getContainerById = (id: Id): Dockerode.Container => dockerode.getContainer(id);
