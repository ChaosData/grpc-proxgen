
const grpc = require('grpc');
const protoLoader = require('@grpc/proto-loader');

let packages = { };

function getPackage(proto_name) {
  if (proto_name in packages) {
    return packages[proto_name];
  }

  let PROTO_PATH;
  if (proto_name.startsWith('./')) {
    PROTO_PATH = proto_name;
  } else {
    PROTO_PATH = __dirname + '/protos/' + proto_name;
  }

  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });

  const package = grpc.loadPackageDefinition(packageDefinition);

  packages[proto_name] = package;
  return package;
}

function pathIndex(obj,is, value) {
  if (typeof is == 'string') {
    return pathIndex(obj,is.split('.'), value);
  } else if (is.length==1 && value!==undefined) {
    return obj[is[0]] = value;
  } else if (is.length==0) {
    return obj;
  } else {
    return pathIndex(obj[is[0]],is.slice(1), value);
  }
}

function getServer(protoname, pkgname, servicename, functions) {
  let pkg = pathIndex(getPackage(protoname), pkgname);

  var server = new grpc.Server();
  server.addProtoService(pkg[servicename].service, functions);
  return server;
}

let clients = { };

function getClient(protoname, pkgname, servicename, host_port) {
  const key = `${pkgname}.${servicename}_${host_port}`;

  if (key in clients) {
    return clients[key];
  }

  let pkg = pathIndex(getPackage(protoname), pkgname);
  let client = new pkg[servicename](host_port, grpc.credentials.createInsecure());

  clients[key] = client;
  return client;
}

function copyheaders(original_metadata) {
  var metadata = new grpc.Metadata();
  var original_metadata_notactuallya_map = original_metadata.getMap();
  for (let k of Object.keys(original_metadata_notactuallya_map)) {
    let v = original_metadata_notactuallya_map[k];
    if (Array.isArray(v)) {
      if (v.length == 1) {
        v = v[0];
      } else {
        console.err("got metadata array of length != 1: " + JSON.stringify(original_metadata));
        continue;
      }
    }
    metadata.set(String(k), String(v));
  }
  return metadata;
}


module.exports = {
  getServer,
  getClient,
  copyheaders,
}
