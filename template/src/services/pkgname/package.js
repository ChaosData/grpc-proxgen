let grpc = require('grpc');
let protoLoader = require('@grpc/proto-loader');

function addService(grpcServer) {
  let packageDefinition = protoLoader.loadSync(
    __dirname + "/../../../config/protos/<%= proto %>", {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    }
  );

  let protopkg = grpc.loadPackageDefinition(packageDefinition)['<%= pkgname %>'];
  grpcServer.addService(protopkg['<%= servicename %>'].service, eval(`(<%= implementation %>)`));
}

module.exports = {
  addService
}
