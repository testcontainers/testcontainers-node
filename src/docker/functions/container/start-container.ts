import { Container } from "../../../container";

export const startContainer = (container: Container): Promise<void> => container.start();
