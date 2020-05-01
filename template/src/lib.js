const config = require('../config/config.json');

let path = require('path');
let fs = require('fs');

let grpc = require('grpc');
let protoLoader = require('@grpc/proto-loader');


async function startServer(bind) {
  let server = new grpc.Server();

  let servicesDir = path.join(__dirname, "services");
  fs.readdirSync(servicesDir).forEach(function(pkgdir) {
    require("./services/" + pkgdir + "/package").addService(server);
  });

  let listen_bind = bind || config?.bind?.value || '127.0.0.1:4444';
  console.log(`listening on ${listen_bind}...`);

  server.bind(listen_bind, grpc.ServerCredentials.createInsecure());
  server.start();
}

module.exports = {
  startServer
}
