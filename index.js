const Docker = require('dockerode');

const ContainerRegistry = require('./src/container-registry');
const ContainerManager = require('./src/container-manager');

(async () => {
  const docker = new Docker();
  const containerRegistry = new ContainerRegistry({ containers: [] });
  const containerManager = new ContainerManager({ docker, containerRegistry });

  try {
    const container = await containerManager.startContainer({ image: 'mysql' });
    console.log('container config', container);
    await containerManager.stopContainers();
  } catch (e) {
    console.error(e);
  }
})();
