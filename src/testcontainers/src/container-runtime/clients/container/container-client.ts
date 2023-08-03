import Dockerode, {
  Container,
  ContainerCreateOptions,
  ContainerInfo,
  ContainerInspectInfo,
  ContainerLogsOptions,
  Network,
} from "dockerode";
import { Readable } from "stream";
import { ExecResult } from "./types";

export interface ContainerClient {
  dockerode: Dockerode;
  ping(): Promise<string>;
  getById(id: string): Container;
  fetchByLabel(labelName: string, labelValue: string): Promise<Container | undefined>;
  fetchArchive(container: Container, path: string): Promise<NodeJS.ReadableStream>;
  putArchive(container: Dockerode.Container, stream: Readable, path: string): Promise<void>;
  list(): Promise<ContainerInfo[]>;
  create(opts: ContainerCreateOptions): Promise<Container>;
  start(container: Container): Promise<void>;
  inspect(container: Container): Promise<ContainerInspectInfo>;
  stop(container: Container, opts?: { timeout: number }): Promise<void>;
  attach(container: Container): Promise<Readable>;
  logs(container: Container, opts?: ContainerLogsOptions): Promise<Readable>;
  exec(container: Container, command: string[], opts?: { log: boolean }): Promise<ExecResult>;
  restart(container: Container, opts?: { timeout: number }): Promise<void>;
  remove(container: Container, opts?: { removeVolumes: boolean }): Promise<void>;
  connectToNetwork(container: Container, network: Network, networkAliases: string[]): Promise<void>;
}
