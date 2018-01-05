const Docker = require('dockerode');

const ContainerRegistry = require('./container-registry');
const GenericContainer = require('./containers/generic-container');

class ContainerManager {
  constructor() {
    this.docker = new Docker();
    this.containerRegistry = new ContainerRegistry({ containers: [] });
  }

  newGenericContainer({ image }) {
    const { docker, containerRegistry } = this;
    const container = new GenericContainer({ docker, image });
    containerRegistry.registerContainer(container);
    return container;
  }

  async stopContainers() {
    await Promise.all(
      this.containerRegistry.getContainers().map(container => container.stop())
    );
  }
}

module.exports = ContainerManager;
