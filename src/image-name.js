const parseName = (name = '') => {
  const parts = name.split(':')

  if (parts.length === 1) {
    return { name: parts[0], version: 'latest' }
  } else {
    return { name: parts[0], version: parts[1] }
  }
}

module.exports = { parseName }
