#!/usr/bin/env node

let program = require('commander');
const version = require('../package.json').version;
const _ = require('lodash');

const lib = require('../src/lib');

main().catch((err)=>{
  console.error(err);
  process.exit(1);
});

async function main() {
  program
    .version(version)
    .usage('[options] -o <out> <proto>')
    .option('-o, --out <out>', 'Output directory path')
    .option('-f, --force', 'Overwrite existing files')
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
  while (outdir != "/" && outdir[outdir.length-1] === '/') {
    outdir = outdir.slice(0, -1);
  }

  await lib.generate(proto, outdir, !!program.force);
}
