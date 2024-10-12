/*
Copyright (c) 2018-2020 NCC Group Security Services, Inc. All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright
   notice, this list of conditions and the following disclaimer in the
   documentation and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.
*/

const path = require('path');

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
    PROTO_PATH = path.join(__dirname, '..', 'config', 'protos', proto_name);
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

/*
function getServer(protoname, pkgname, servicename, functions) {
  let pkg = pathIndex(getPackage(protoname), pkgname);

  var server = new grpc.Server();
  server.addProtoService(pkg[servicename].service, functions);
  return server;
}
*/

const server = new grpc.Server();

function getServer() {
  return server;
}

function addService(protoname, pkgname, servicename, functions) {
  let pkg = pathIndex(getPackage(protoname), pkgname);
  getServer().addProtoService(pkg[servicename].service, functions);
}

let hosts = { };
let default_upstream = null;

function under(pkg) {
  if (!!pkg) {
    return pkg + '_';
  } else {
    return "";
  }
}

function setOverrideUpstream(pkgname, servicename, host_port) {
  let key;
  if (servicename === null) {
    key = pkgname;
  } else {
    key = `${under(pkgname)}${servicename}`;
  }
  hosts[key] = host_port;
}

function overrideUpstream(upstream_host_port) {
  default_upstream = upstream_host_port
}

function getOverrideUpstream(pkgname, servicename) {
  if (default_upstream !== null) {
    return default_upstream;
  }

  const key = `${under(pkgname)}${servicename}`;
  if (!(key in hosts)) {
    // console.error(`Error: Default host:port not set for '${pkgname}.${servicename}'. Set with --${key}.`);
    // process.exit(1);
    return null;
  }
  return hosts[key];
}

let clients = { };

function getClient(protoname, pkgname, servicename, upstream_host_port) {
  let override_upstream = getOverrideUpstream(pkgname, servicename);
  if (override_upstream !== null) {
    upstream_host_port = override_upstream;
  }

  const key = `${pkgname}.${servicename}_${upstream_host_port}`;

  if (key in clients) {
    return clients[key];
  }


  let pkg = pathIndex(getPackage(protoname), pkgname);
  let client = new pkg[servicename](upstream_host_port, grpc.credentials.createInsecure());

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
  addService,
  getClient,
  copyheaders,
  setOverrideUpstream,
  overrideUpstream,
  getOverrideUpstream
}
