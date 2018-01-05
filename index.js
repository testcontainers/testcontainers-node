const ContainerManager = require('./src/container-manager');

(async () => {
  try {
    const containerManager = new ContainerManager();
    const container = await containerManager
      .newGenericContainer({ image: 'mysql' })
      .start();
    console.log(container);
    await containerManager.stopContainers();
  } catch (e) {
    console.error(e);
  }
})();
