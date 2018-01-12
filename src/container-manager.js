const log = require('debug')('testcontainers:ContainerManager')
const GenericContainer = require('./generic-container')
const { parseName } = require('./image-name')

class ContainerManager {
  constructor ({ docker, imageManager, containerRegistry }) {
    this.docker = docker
    this.imageManager = imageManager
    this.containerRegistry = containerRegistry
  }

  async startContainer ({ image }) {
    log('starting container', image)
    if (!await this.imageManager.exists(image)) {
      const { name, version } = parseName(image)
      await this.imageManager.pull(`${name}:${version}`)
    }
    const container = new GenericContainer({ docker: this.docker, image })
    this.containerRegistry.registerContainer(container)
    return (await container.start()).Config
  }

  async stopContainers () {
    log('stopping containers')
    await Promise.all(this.containerRegistry.getContainers().map(container => {
      container.stop()
      this.containerRegistry.unregisterContainer(container)
    }))
  }
}

module.exports = ContainerManager
