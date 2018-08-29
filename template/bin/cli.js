#!/usr/bin/env node

let program = require('commander');
const version = require('../package.json').version;

const package = require('../src/package');
const lib = require('../src/lib');

main().catch((err)=>{
  console.error(err);
  process.exit(1);
});

async function main() {
  let service_config; // array
  try {
    service = JSON.parse('<%= service_config_json %>');
  } catch (e) {
    console.error(e);
    program.exit(1);
  }

  let p = program
          .version(version)
          .usage('[options] <bind host:port>');
    //.option('--routeguide_RouteGuide <host_port>',
    //        'Upstream <host:port> for routeguide.RouteGuide')
  try {
    for (let svc of service_config) {
      p = p.option(svc.arg, svc.desc);
    }
  } catch (e) { }
  p.arguments("<bind host:port>")
   .parse(process.argv);

  if (program.args.length > 1) {
    console.error("Error: More than one bind <host:port> provided.")
    program.help();
  } else if (program.args.length == 0) {
    console.error("Error: Missing bind <host:port>")
    program.help();
  }

  for (let svc of service_config) {
    let name = svc.argname;
    if (!program[name] || program[name] === 0) {
      console.error("Error: Missing ${svc.arg}");
      program.help();
    }
    package.setDefaultHostPort(name, null, program[name]);
  }

  await lib.startServer(service_config);
}
