const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const grpc = require('grpc');
const protoLoader = require('@grpc/proto-loader');
const protobuf = require('protobufjs');


const template = require('lodash.template');

let templates; // function templates
let service_template;

async function generate(proto, outdir, default_upstream, default_bind, force) {

  let proto_files = await new Promise((resolve, reject) => {
    protobuf.load(proto, function(err, root) {
      if (err !== null) {
        reject(err);
      } else {
        resolve(root.files)
      }
    })
  });

  //const tmpdir = outdir + ".tmp";
  await initializeTemplate(outdir, proto_files, force);

  await writeFile(
    path.join(outdir, 'config', 'config.json'),
    JSON.stringify({
      bind: {
        arg: ["-b, --bind <host:port>", "Bind address"],
        value: default_bind
      },
      upstream: {
        arg: ["-u, --upstream <host:port>", "Upstream host (generally localhost envoy)"],
        value: default_upstream
      },
    }, null, 4),
    { mode: 0o0600 }
  );

  if (templates === undefined) {
    templates = loadFunctionTemplates();
  }

  const packageDefinition = protoLoader.loadSync(proto, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    //includeDirs: [path.dirname(proto)]
  });

  const packages = grpc.loadPackageDefinition(packageDefinition);

  // const packages2 = grpc.load(proto, "proto", {
  //   keepCase: true,
  //   longs: String,
  //   enums: String,
  //   defaults: true,
  //   oneofs: true,
  //   includeDirs: [path.dirname(proto)]
  // });
  // console.log(packages2)

  await generatePackageJson(proto, outdir, force);

  for (let [pkgname, pkg] of Object.entries(packages)) {

    for (let key of Object.keys(pkg)) {
      let obj = pkg[key];
      if (obj.service === undefined) {
        continue;
      }

      let service = obj.service;
      let servicename = key;

      await generateService(service, outdir, {
        proto,
        pkgname,
        servicename,
        default_upstream,
      });
    }
  }
}

function mkdirSync(path, recursive) {
  try {
    fs.mkdirSync(path, {
      recursive: !!recursive,
      mode: 0o750,
    });
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

function copyFileSync(a, b, force, mkdirs) {
  if (!force) {
    checkFileExists(b);
  }
  if (!!mkdirs) {
    mkdirSync(path.dirname(b), true);
  }
  fs.copyFileSync(a, b);
}

function getTemplatePath() {
  return path.join(__dirname, '..', 'template');
}

async function initializeTemplate(outdir, proto_files, force) {
  mkdirSync(outdir);
  mkdirSync(path.join(outdir, "config"));
  mkdirSync(path.join(outdir, "config", "protos"));
  mkdirSync(path.join(outdir, "src"));
  mkdirSync(path.join(outdir, "src", "services"));
  mkdirSync(path.join(outdir, "bin"));
  //mkdirSync(path.join(outdir, "src", "services", "functions"));

  let template_path = getTemplatePath();
  copyFileSync(
    path.join(template_path, '.gitignore'),
    path.join(outdir, '.gitignore'),
    force
  );
  if (!force) {
    checkFileExists(path.join(outdir, 'node_modules'))
  }
  fse.copySync(
    path.join(__dirname, '..', 'node_modules'),
    path.join(outdir, 'node_modules'),
    {
      overwrite: force,
      errorOnExist: !force,
    }
  );

  copyFileSync(
    path.join(template_path, 'bin', 'cli.js'),
    path.join(outdir, 'bin', 'cli.js'),
    force
  );
  copyFileSync(
    path.join(template_path, 'src', 'lib.js'),
    path.join(outdir,        'src', 'lib.js'),
    force
  );
  copyFileSync(
    path.join(template_path, 'src', 'utils.js'),
    path.join(outdir,        'src', 'utils.js'),
    force
  );
  let mkdirs = true;
  for (let proto of proto_files) {
    copyFileSync(proto, path.join(outdir, 'config', 'protos', proto), force, mkdirs);
  }
}

async function generatePackageJson(proto, outdir, force) {
  let template_path = getTemplatePath();
  let protoname = path.basename(proto).replace(/\.proto$/g, '');
  // let outfile = path.join(outdir, 'src', 'utils.js');
  // if (!force) {
  //   checkFileExists(outfile);
  // }
  let text = await readFile(path.join(template_path, 'package.json'), 'utf8');
  text = template(text)({ protoname });
  await writeFile(
    path.join(outdir, 'package.json'),
    text,
    { mode: 0o0600 }
  );
}

function isTrue(thing) {
  return thing === true;
}

const types = {
  MANYMANY: "manytomany.js",
  MANYONE:  "manytoone.js",
  ONEMANY:  "onetomany.js",
  ONEONE:   "onetoone.js",
  PACKAGE:  "../package.js",
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
  const func_template_path = path.join(getTemplatePath(), "src", "services", "pkgname", "functions");
  const templates = {
    ...types
  };
  let promises = [];
  for (let [k,v] of Object.entries(templates)) {
    promises.push((async function(k, v) {
      templates[k] = template(await readFile(path.join(func_template_path, v), 'utf8'));
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

  mkdirSync(path.join(outdir, "src", "services", ctx.pkgname));
  mkdirSync(path.join(outdir, "src", "services", ctx.pkgname, "functions"));

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

  let implementation = "{\n";
  for (let func of funcs) {
    implementation += `    "${func.grpcname}": require('./functions/${ctx.pkgname}.${ctx.servicename}.${func.grpcname}'),\n`;
  }
  implementation += "  }"

  if (templates instanceof Promise) {
    templates = await templates;
  }


  let promises = [];
  let package_code = getTemplateByType(types.PACKAGE)({
    implementation,
    ...ctx
  });
  promises.push((async function(package_code) {
    await writeFile(
      path.join(outdir, "src", "services", ctx.pkgname, "package.js"),
      package_code,
      { mode: 0o0600 }
    );
  })(package_code));

  for (let func of funcs) {
    func.code = getTemplateByType(func.type)({
      ...ctx,
      ...func
    });

    promises.push((async function(func) {
      await writeFile(
        path.join(outdir, "src", "services", ctx.pkgname, "functions",
                  `${dot(ctx.pkgname)}${ctx.servicename}.${func.grpcname}.js`
        ),
        func.code,
        { mode: 0o0600 }
      );
    })(func));
  }
  await Promise.all(promises);
}

module.exports = {
  generate
}
