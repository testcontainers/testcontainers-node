import { Container, DockerodeContainer, Id } from "../../../container";
import { dockerode } from "../../dockerode";

export const getContainerById = async (id: Id): Promise<Container> =>
  new DockerodeContainer(await dockerode.getContainer(id));
