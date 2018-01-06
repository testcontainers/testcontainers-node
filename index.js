const Docker = require('dockerode')

const ContainerRegistry = require('./src/container-registry')
const ContainerManager = require('./src/container-manager')

const docker = new Docker()
const containerRegistry = new ContainerRegistry({ containers: [] })
const containerManager = new ContainerManager({ docker, containerRegistry })

module.exports = containerManager
