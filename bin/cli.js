#!/usr/bin/env node

let program = require('commander');
const version = require('../package.json').version;

const lib = require('../src/lib');

main().catch((err)=>{
  console.error(err);
  process.exit(1);
});

function parseHostPort(bind) {
  if (typeof(bind) !== typeof("")) {
    return [null];
  }
  let host_port = bind.split(':')
  if (host_port.length !== 2) {
    return [null];
  }
  let [host, port] = host_port;
  let nport = Number.parseInt(port, 10)
  if (Number.isNaN(nport)) {
    return [null];
  }
  if (nport > 65535 || nport < 0) {
    return [null];
  }
  if (port !== String(nport)) {
    return [null];
  }
  return [host, nport];
}

async function main() {
  program
    .version(version)
    .usage('[options] -o <out> <proto>')
    .option('-o, --out <out>', 'Output directory path')
    .option('-f, --force', 'Overwrite existing files')
    .option('-b, --bind <address:port>', 'Default bind address', '127.0.0.1:4444')
    .option('-u, --upstream <https://url.example/base>', 'Upstream API host (required for envoy config generation)')
    .option('-i, --internal <host:port>', 'Default internal upstream (generally localhost envoy)', '127.0.0.1:5555')
    .arguments("<proto>")
    .parse(process.argv);

  if (program.args.length > 1) {
    console.error("Error: More than one Protobuf file provided.")
    program.help();
  } else if (program.args.length == 0) {
    console.error("Error: Missing Protobuf file.")
    program.help();
  }

  if (!program.out || program.out.length == 0) {
    console.error("Error: Missing output directory path.")
    program.help();
  }

  let proto = program.args[0];
  let outdir = program.out;
  while (outdir !== "/" && outdir[outdir.length-1] === '/') {
    outdir = outdir.slice(0, -1);
  }

  let default_upstream = program.upstream;
  if (default_upstream !== undefined) {
    if (parseHostPort(default_upstream)[0] === null) {
      console.error("Error: Invalid upstream.")
      program.help();
    }
  }

  let default_internal_upstream = program.internal;
  if (default_internal_upstream !== undefined) {
    if (parseHostPort(default_internal_upstream)[0] === null) {
      console.error("Error: Invalid internal upstream.")
      program.help();
    }
  }

  let default_bind = program.bind;
  if (default_bind !== undefined) {
    if (parseHostPort(default_bind)[0] === null) {
      console.error("Error: Invalid binding.")
      program.help();
    }
  }

  await lib.generate(proto, outdir, default_internal_upstream, default_bind, !!program.force);
}
