import { Reaper } from "./reaper";

afterAll(async () => {
  if (Reaper.isRunning()) {
    await Reaper.getInstance().shutDown();
  }
});
