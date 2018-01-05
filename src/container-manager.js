const GenericContainer = require('./containers/generic-container');

class ContainerManager {
  constructor({ docker, containerRegistry }) {
    this.docker = docker;
    this.containerRegistry = containerRegistry;
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
