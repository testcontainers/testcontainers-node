const log = require('debug')('testcontainers:ContainerRegistry')

class ContainerRegistry {
  constructor ({ containers }) {
    this.containers = containers
  }

  registerContainer (container) {
    log('registering container')
    this.containers = [...this.containers, container]
  }

  unregisterContainer (container) {
    log('unregistering container')
    this.containers = this.containers.filter(
      registeredContainer => registeredContainer !== container
    )
  }

  getContainers () {
    return this.containers
  }
}

module.exports = ContainerRegistry
