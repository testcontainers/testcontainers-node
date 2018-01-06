const log = require('debug')('testcontainers:ContainerManager')
const GenericContainer = require('./generic-container')

class ContainerManager {
  constructor ({ docker, imageManager, containerRegistry }) {
    this.docker = docker
    this.imageManager = imageManager
    this.containerRegistry = containerRegistry
  }

  async startContainer ({ image }) {
    log('starting container', image)
    if (!await this.imageManager.exists(image)) {
      const finalImage = image.indexOf(':') !== -1 ? image : `${image}:latest`
      await this.imageManager.pull(finalImage)
    }
    const container = new GenericContainer({ docker: this.docker, image })
    this.containerRegistry.registerContainer(container)
    return (await container.start()).Config
  }

  async stopContainers () {
    log('stopping containers')
    await Promise.all(this.containerRegistry.getContainers().map(container => container.stop()))
  }
}

module.exports = ContainerManager
