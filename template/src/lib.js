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
