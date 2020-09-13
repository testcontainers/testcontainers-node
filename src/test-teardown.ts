import { Reaper } from "./reaper";

export default async () => {
  if (Reaper.isRunning()) {
    await Reaper.getInstance().shutDown();
  }
};
