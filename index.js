const Docker = require('dockerode')

const ContainerRegistry = require('./src/container-registry')
const ImageManager = require('./src/image-manager')
const ContainerManager = require('./src/container-manager')

const docker = new Docker()
const containerRegistry = new ContainerRegistry({ containers: [] })
const imageManager = new ImageManager({ docker })
const containerManager = new ContainerManager({ docker, imageManager, containerRegistry })

module.exports = containerManager
