const log = require('debug')('testcontainers:GenericContainer')

class GenericContainer {
  constructor ({ docker, image }) {
    this.docker = docker
    this.image = image
  }

  async start () {
    this.container = await this._createContainer()
    await this.container.start()
    log('started container', this.image, this.container.id)
    return this.container.inspect()
  }

  async stop () {
    await this.container.stop()
    await this.container.remove()
    log('stopped container', this.container.id)
  }

  async _createContainer () {
    const { docker, image } = this
    const containerOpts = { Image: image, Tty: true, Cmd: [] }
    return docker.createContainer(containerOpts)
  }
}

module.exports = GenericContainer
