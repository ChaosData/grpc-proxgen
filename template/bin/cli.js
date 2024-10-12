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
