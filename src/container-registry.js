class ContainerRegistry {
  constructor ({ containers }) {
    this.containers = containers
  }

  registerContainer (container) {
    this.containers = [...this.containers, container]
  }

  getContainers () {
    return this.containers
  }
}

module.exports = ContainerRegistry
