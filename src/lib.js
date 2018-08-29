const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const grpc = require('grpc');
const protoLoader = require('@grpc/proto-loader');

const _ = require('lodash');

let templates; // function templates
let service_template;

async function generate(proto, outdir, force) {
  //const tmpdir = outdir + ".tmp";
  await initializeTemplate(outdir, force);

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

  await generatePackageJson(proto, outdir, force);

  for (let [pkgname, pkg] of Object.entries(packages)) {
    let service, servicename;
    let keys = Object.keys(pkg);
    if (keys.length === 1) {
      servicename = keys[0];
      ({ service } = pkg[servicename]);
    } else {
      servicename = pkgname;
      pkgname = "";
      ({ service } = pkg);
    }

    await generateService(service, outdir, {
      proto,
      pkgname,
      servicename,
    });
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

function checkFileExists(filename) {
  if (fs.existsSync(filename)) {
    console.error(`Error: Would overwrite existing file '${filename}'.\n` +
                  "       Use --force to enable file overwrites.");
    process.exit(1);
  }
}

function copyFileSync(a, b, force) {
  if (!force) {
    checkFileExists(b);
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
  copyFileSync(path.join(template_path, 'src', 'package.js'),
               path.join(outdir,        'src', 'package.js'),
               force
  );
}

async function generatePackageJson(proto, outdir, force) {
  let template_path = getTemplatePath();
  let protoname = path.basename(proto).replace(/\.proto$/g, '');
  let outfile = path.join(outdir, 'src', 'package.js');
  if (!force) {
    checkFileExists(outfile);
  }
  let text = await readFile(path.join(template_path, 'package.json'), 'utf8');
  text = _.template(text)({ protoname });
  await writeFile(
    path.join(outdir, 'package.json'),
    text,
    { mode: 0600 }
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

function dot(pkg) {
  if (!!pkg) {
    return pkg + '.';
  } else {
    return "";
  }
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
                  `${dot(ctx.pkgname)}${ctx.servicename}.${func.grpcname}.js`
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
