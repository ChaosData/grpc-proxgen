const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const grpc = require('grpc');
const protoLoader = require('@grpc/proto-loader');

const _ = require('lodash');

let templates;

async function generate(proto, outdir, force) {
  const tmpdir = outdir + ".tmp";
  await initializeTemplate(tmpdir, force);

  if (templates === undefined) {
    templates = loadFunctionTemplates();
  }

  const packageDefinition = protoLoader.loadSync(proto, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });

  const packages = grpc.loadPackageDefinition(packageDefinition);
  
  for (let [pkgname, pkg] of Object.entries(packages)) {
    for (let servicename of Object.keys(pkg)) {
      let { service } = pkg[servicename];
      await generateService(service, tmpdir, {
        proto,
        pkgname,
        servicename,
      });
    }
  }
}

function mkdirSync(path) {
  try {
    fs.mkdirSync(path, 0o750);
  } catch (e) {
    if (e.code !== 'EEXIST') {
      console.error(e);
      process.exit(1);
    }
  }
}

function copyFileSync(a, b, force) {
  if (!force) {
    if (fs.existsSync(b)) {
      console.error(`Error: Would overwrite existing file '${b}'.\n` +
                    "       Use --force to enable file overwrites.");
      process.exit(1);
    }
  }
  fs.copyFileSync(a, b);
}

function getTemplatePath() {
  return path.join(__dirname, '..', 'template');
}

async function initializeTemplate(outdir, force) {
  mkdirSync(outdir);
  mkdirSync(path.join(outdir, "src"));
  mkdirSync(path.join(outdir, "src", "services"));
  mkdirSync(path.join(outdir, "src", "services", "functions"));

  let template_path = getTemplatePath();
  copyFileSync(path.join(template_path, 'package.json'),
               path.join(outdir,        'package.json'),
               force
  );
  copyFileSync(path.join(template_path, 'src', 'package.js'),
               path.join(outdir,        'src', 'package.js'),
               force
  );
}

function isTrue(thing) {
  return thing === true;
}

const types = {
  MANYMANY: "manytomany.js",
  MANYONE:  "manytoone.js",
  ONEMANY:  "onetomany.js",
  ONEONE:   "onetoone.js"
};

function invert(obj) {
  return Object.entries(obj).reduce((o, [k, v]) => ({ ...o, [v]: k }), {});
}

const invtypes = invert(types);

function getTemplateByType(type) {
  return templates[invtypes[type]];
}

async function loadFunctionTemplates() {
  const template_path = getTemplatePath();
  const func_template_path = path.join(getTemplatePath(), "src", "functions");
  const templates = {
    ...types
  };
  let promises = [];
  for (let [k,v] of Object.entries(templates)) {
    promises.push((async function(k, v) {
      templates[k] = _.template(await readFile(path.join(func_template_path, v), 'utf8'));
    })(k,v));
  }

  await Promise.all(promises);
  return templates;
}

async function generateService(service, outdir, ctx) {
  let funcs = [];
  for (let funcname of Object.keys(service)) {
    let func = service[funcname];
    let type;
    if (isTrue(func.requestStream) && isTrue(func.responseStream)) {
      type = types.MANYMANY;
    } else if (isTrue(func.requestStream) && !isTrue(func.responseStream)) {
      type = types.MANYONE;
    } else if (!isTrue(func.requestStream) && isTrue(func.responseStream)) {
      type = types.ONEMANY;
    } else if (!isTrue(func.requestStream) && !isTrue(func.responseStream)) {
      type = types.ONEONE;
    } else {
      console.error("Error: Invalid stream config settings for " +
                    JSON.serialize(func));
      process.exit(1);
    }
    funcs.push({
      funcname: func.originalName, // name as used in JS
      grpcname: funcname, // name as it appears in the proto
      type,
      path: func.path,
    });
  }

  if (templates instanceof Promise) {
    templates = await templates;
  }

  let promises = [];
  for (let func of funcs) {
    func.code = getTemplateByType(func.type)({
      ...ctx,
      ...func
    });

    promises.push((async function(func) {
      await writeFile(
        path.join(outdir, "src", "services", "functions",
                  `${ctx.pkgname}.${ctx.servicename}.${func.grpcname}.js`
        ),
        func.code,
        { mode: 0600 }
      );
    })(func));
  }
  await Promise.all(promises);
}

module.exports = {
  generate
}
