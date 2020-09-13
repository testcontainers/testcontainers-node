import { Reaper } from "./reaper";

afterAll(async () => {
  if (Reaper.isRunning()) {
    await (await Reaper.getInstance()).shutDown();
  }
});
