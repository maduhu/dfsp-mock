const net = require('net')
const ServerPort = 5678

const server = net.createServer((socket) => {
  socket.on('end', () => {
    // do nothing for now
  })
  socket.on('data', (data) => {
    // do nothing for now
  })
})

server.on('error', (error) => {
  throw error
})
server.listen(ServerPort, () => {
  // do nothing for now
})
