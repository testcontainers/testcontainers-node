import { Reaper } from "./reaper";

afterAll(async () => {
  if (Reaper.isRunning()) {
    const reaper = await Reaper.getInstance();
    await reaper.shutDown();
  }
});
