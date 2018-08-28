const package = require('../package');

var client = package.getClient(
  '<%= proto %>',
  '<%= pkgname %>',
  '<%= servicename %>',
  '<%= host_port %>'
);

const str = JSON.stringify;

/**
 * one-to-one request handler. Gets a request with an input, forwards the
 * request to the server as a client, and responds with what the server
 * responded with.
 * @param {EventEmitter} call Call object for the handler to process
 * @param {function(Error, value)} callback Response callback
 */
module.exports = function(call, callback) {
  let metadata = package.copyheaders(call.metadata);
  let request_object = call.request;
  console.log("<%= funcname %> called with: " + str(request_object));
  client['<%= funcname %>'](request_object, metadata,
                            function(error, response_object) {
    if (error) {
      console.log("<%= funcname %> error: " + error);
    } else {
      console.log("<%= funcname %> returned: " + str(response_object));
    }
    callback(error, response_object);
  });
}
