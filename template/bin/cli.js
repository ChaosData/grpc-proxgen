#!/usr/bin/env node

const version = require('../package.json').version;
const config = require('../config/config.json');

const utils = require('../src/utils');
const lib = require('../src/lib');

let program = require('commander');

main().catch((err)=>{
  console.error(err);
  process.exit(1);
});

async function main() {
  let p = program
    .version(version)
    .usage('[options]')
  try {
    for (let opt of Object.keys(config)) {
      p = p.option(config[opt].arg[0], config[opt].arg[1], config[opt].value);
    }
  } catch (e) { }
  p.parse(process.argv);

  if (program.args.length > 0) {
    // console.error("Error: More than one bind <host:port> provided.")
    program.help();
  }

  if (program.upstream !== undefined) {
    utils.overrideUpstream(program.upstream);
  }

  await lib.startServer(program.bind);
}
