const package = require('../package');

var client = package.getClient(
  '<%= proto %>',
  '<%= pkgname %>',
  '<%= servicename %>',
  '<%= host_port %>'
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
  let metadata = package.copyheaders(service_call.metadata);
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
