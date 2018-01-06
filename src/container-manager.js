const log = require('debug')('testcontainers:ContainerManager')
const GenericContainer = require('./containers/generic-container')

class ContainerManager {
  constructor ({ docker, containerRegistry }) {
    this.docker = docker
    this.containerRegistry = containerRegistry
  }

  async startContainer ({ image }) {
    log('starting container', image)
    const { docker, containerRegistry } = this
    if (!await this.imageExists(image)) {
      await this.pullImage(image)
    }
    const container = new GenericContainer({ docker, image })
    containerRegistry.registerContainer(container)
    return (await container.start()).Config
  }

  async imageExists (image) {
    const images = await this.docker.listImages()
    const imageRepoTags = images.map(image => image.RepoTags[0])
    return imageRepoTags.some(imageTag => imageTag.indexOf(image) !== -1)
  }

  async pullImage (image) {
    const finalImage = image.indexOf(':') !== -1 ? image : `${image}:latest`
    log('pulling image', finalImage)
    await new Promise((resolve, reject) => {
      this.docker.pull(finalImage, (err, stream) => {
        if (err) {
          reject(err)
        }
        stream.pipe(process.stdout)
        stream.once('end', resolve)
      })
    })
  }

  async stopContainers () {
    log('stopping containers')
    await Promise.all(
      this.containerRegistry.getContainers().map(container => container.stop())
    )
  }
}

module.exports = ContainerManager
