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

const utils = require('../utils');

var client = utils.getClient(
  '<%= proto %>',
  '<%= pkgname %>',
  '<%= servicename %>',
  '<%= upstream_host_port %>'
);

const str = JSON.stringify;

/**
 * many-to-one handler. Gets and forwards a stream of input values, and
 * responds with the response value sent back by the server.
 * @param {Readable} service_call The request object stream.
 * @param {function(Error, response_object)} callback The callback to pass the
 *                                                    response to
 */
module.exports = function (service_call, callback) {
  let metadata = utils.copyheaders(service_call.metadata);
  var client_call = client['<%= funcname %>'](
      metadata, function(error, response_object) {
    if (error) {
      console.log("<%= funcname %> returned error: " + error);
      callback(error);
      return;
    }
    console.log("<%= funcname %> returned: " + str(response_object));
    callback(null, response_object);
  });

  service_call.on('data', function(request_object) {
    console.log("<%= funcname %> received stream input of: " + str(request_object));
    client_call.write(request_object);
  });

  service_call.on('end', function() {
    client_call.end();
  });
}
