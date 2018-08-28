const package = require('../package');

var client = package.getClient(
  '<%= proto %>',
  '<%= pkgname %>',
  '<%= servicename %>'
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
