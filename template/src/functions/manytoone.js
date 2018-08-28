const package = require('../package');

var client = package.getClient(
  '<%= proto %>',
  '<%= pkgname %>',
  '<%= servicename %>'
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
  let metadata = package.copyheaders(service_call.metadata);
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
