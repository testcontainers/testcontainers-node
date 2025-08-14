import { Signal } from "../enum";
import { StartedTestContainer } from "../test-container";
import { ContainerManager } from "./container-manager";

type SignalHandler = (container?: StartedTestContainer) => void | Promise<void>;

const SIGNAL_HANDLERS: Record<Signal, SignalHandler> = {
  [Signal.KILL]: handleKillSignal,
  [Signal.ADD]: handleAddSignal,
} as const;

export async function sendSignal(
  signal: Signal, 
  container?: StartedTestContainer
): Promise<void> {
  validateSignalInput(signal, container);
  
  const signalHandler = getSignalHandler(signal);
  
  try {
    await signalHandler(container);
  } catch (error) {
    throw new Error(
      `Failed to handle ${signal} signal: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

function validateSignalInput(signal: Signal, container?: StartedTestContainer): void {
  if (!Object.values(Signal).includes(signal)) {
    throw new Error(`Invalid signal: ${signal}`);
  }
  
  if (signal === Signal.ADD && !container) {
    throw new Error('Container is required for ADD signal');
  }
}

function getSignalHandler(signal: Signal): SignalHandler {
  const handler = SIGNAL_HANDLERS[signal];
  
  if (!handler) {
    throw new Error(`No handler found for signal: ${signal}`);
  }
  
  return handler;
}


async function handleAddSignal(container?: StartedTestContainer): Promise<void> {
  if (!container) {
    throw new Error('Container is required for ADD signal');
  }
  
  const containerManager = ContainerManager.getInstance();
  await containerManager.addContainer(container);
}

async function handleKillSignal(): Promise<void> {
  const containerManager = ContainerManager.getInstance();
  await containerManager.destroyAllContainers(); 
}