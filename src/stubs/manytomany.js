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

const package = require('../package');

var client = package.getClient(
  '<%= proto %>',
  '<%= pkgname %>',
  '<%= servicename %>',
  '<%= host_port %>'
);

const str = JSON.stringify;

/**
 * many-to-many handler. Receives and forwards a stream of request objects, and
 * streams back all response values streamed from the server.
 * @param {Duplex} service_call The stream for incoming and outgoing messages
 */
module.exports = function(service_call) {
  let metadata = package.copyheaders(service_call.metadata);
  let client_call = client['<%= funcname %>'](metadata);
  client_call.on("data", function(response_object) {
    console.log(
      "<%= funcname %> recieved stream output of: " + str(response_object)
    );
    service_call.write(response_object);
  });
  client_call.on("error", function(e) {
    console.log("<%= funcname %> received error output of: " + e);
  });
  client_call.on("end", function() {
    service_call.end();
  });

  service_call.on('data', function(request_object) {
    console.log(
      "<%= funcname %> received stram input of: " + str(request_object)
    );
    client_call.write(request_object);
  });
  service_call.on('error', function(e) {
    console.log("<%= funcname %> received error input of: " + e);
    client_call.end();
  });
  service_call.on('end', function() {
    client_call.end();
  });
}
