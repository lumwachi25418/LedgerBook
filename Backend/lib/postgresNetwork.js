const net = require('net');

function preferStablePostgresSockets() {
  if (typeof net.setDefaultAutoSelectFamily === 'function') {
    net.setDefaultAutoSelectFamily(false);
  }
}

module.exports = preferStablePostgresSockets;
