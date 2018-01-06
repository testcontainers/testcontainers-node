const GenericContainer = require('./generic-container')

describe('GenericContainer', () => {
  let mockInspect
  let mockContainer
  let mockDocker
  let mockImage

  beforeEach(() => {
    mockInspect = { id: '1' }
    mockContainer = {
      id: '1',
      start: jest.fn(() => Promise.resolve()),
      inspect: jest.fn(() => Promise.resolve(mockInspect)),
      stop: jest.fn(() => Promise.resolve()),
      remove: jest.fn(() => Promise.resolve())
    }
    mockDocker = {
      createContainer: jest.fn(() => Promise.resolve(mockContainer))
    }
    mockImage = 'mockImage'
  })

  it('should start a generic container', async () => {
    const container = await new GenericContainer({
      docker: mockDocker,
      image: mockImage
    })

    const startedContainer = await container.start()

    expect(mockDocker.createContainer).toHaveBeenCalledWith({
      Image: mockImage, Tty: true, Cmd: []
    })
    expect(mockContainer.start).toHaveBeenCalled()
    expect(mockContainer.inspect).toHaveBeenCalled()
    expect(startedContainer).toEqual(mockInspect)
  })

  it('should stop and remove a started generic container', async () => {
    const container = await new GenericContainer({
      docker: mockDocker,
      image: mockImage
    })
    await container.start()

    await container.stop()

    expect(mockContainer.stop).toHaveBeenCalled()
    expect(mockContainer.remove).toHaveBeenCalled()
  })
})
