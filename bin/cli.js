#!/usr/bin/env node

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
