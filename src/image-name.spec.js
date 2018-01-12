const { parseName } = require('./image-name')

describe('imageName', () => {
  it('should return the name and version of the image', () => {
    expect(parseName('image:1.0.0')).toEqual({
      name: 'image', version: '1.0.0'
    })
  })

  it('should default to the latest version if one is not provided', () => {
    expect(parseName('image')).toEqual({ name: 'image', version: 'latest' })
  })
})
