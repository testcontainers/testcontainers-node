const log = require('debug')('testcontainers:GenericContainer')

class GenericContainer {
  constructor ({ docker, image }) {
    this.docker = docker
    this.image = image
  }

  async start () {
    const { docker, image } = this
    const containerOpts = { Image: image, Tty: true, Cmd: [] }
    const container = await docker.createContainer(containerOpts)
    await container.start()
    log('started container', image, container.id)
    this.container = container
    return this.container.inspect()
  }

  async stop () {
    const { container } = this
    await container.stop()
    await container.remove()
    log('stopped container', container.id)
  }
}

module.exports = GenericContainer
