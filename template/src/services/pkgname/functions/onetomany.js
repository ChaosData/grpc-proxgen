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

const utils = require('../../../utils');

let client = utils.getClient(
  '<%= proto %>',
  '<%= pkgname %>',
  '<%= servicename %>',
  '<%= default_upstream %>'
);

const str = JSON.stringify;

/**
 * one-to-many request handler. Gets a request with an input, forwards the
 * request to the server as a client and streams back all response values
 * streamed from the server.
 * @param {Writable} service_call Writable stream for responses with an
 *                                additional request property for the request
 *                                value.
 */
module.exports = function (service_call) {
  let metadata = utils.copyheaders(service_call.metadata);
  let request_object = service_call.request;
  console.log("<%= funcname %> called with: " + str(request_object));
  var client_call = client['<%= funcname %>'](request_object, metadata);
  client_call.on('data', function(response_object) {
    console.log("<%= funcname %> returned: " + str(response_object));
    service_call.write(response_object);
  });
  client_call.on('end', function() {
    service_call.end();
  });
}
