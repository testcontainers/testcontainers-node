const Docker = require('dockerode');

const ContainerRegistry = require('./src/container-registry');
const ContainerManager = require('./src/container-manager');

(async () => {
  const docker = new Docker();
  const containerRegistry = new ContainerRegistry({ containers: [] });
  const containerManager = new ContainerManager({ docker, containerRegistry });

  try {
    const container = await containerManager.newGenericContainer({ image: 'mysql' }).start();
    console.log(container);
    await containerManager.stopContainers();
  } catch (e) {
    console.error(e);
  }
})();
