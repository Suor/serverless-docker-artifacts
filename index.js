"use strict";

const child_process = require("child_process");
const path = require("path");

const BbPromise = require("bluebird");
const _ = require("lodash");
const fse = require("fs-extra");

BbPromise.promisifyAll(fse);


function validateArtifact(artifact) {
  const art = Object.assign({path: '.', dockerfile: 'Dockerfile', args: {}}, artifact);
  return art;
}


class ServerlessDockerArtifacts {
  // Public API functions
  static createArtifact(artifact) {
    const art = validateArtifact(artifact);

    if (fse.existsSync(art.copy))
      throw Error(`The target path "${art.copy}" is occupied. ` +
                  `Run "sls dockart clean" to remove all artifacts.`);

    const image = 'sls-dockart-' + art.copy.replace(/\W/g, '').toLowerCase();

    // Build image
    const buildArgs = ['build', '-t', image, '-f', path.resolve(art.path, art.dockerfile)];
    _.forOwn(art.args, (value, key) => buildArgs.push('--build-arg', `${key}=${value}`));
    run('docker', buildArgs.concat([art.path]), {'showOutput': true});

    // Copy artifact from container
    const container = run('docker', ['create', image, '-']).stdout.trim();
    run('docker', ['cp', `${container}:/var/task/${art.copy}`, art.copy])
  }

  static cleanDocker() {
    const images = lines(run('docker', ['images', '-q', 'sls-dockart-*']));
    const filters = _.flatMap(images, image => ['-f', `ancestor=${image}`])
    const containers = lines(run('docker', ['ps', '-aq'].concat(filters)));

    if (containers.length) run('docker', ['rm'].concat(containers));
    if (images.length) run('docker', ['rmi'].concat(images));
  }

  // Private implementation
  create() {
    this.artifacts.forEach((artifact) => {
      let art = validateArtifact(artifact);
      this.serverless.cli.log(`Building ${art.path}/${art.dockerfile} image with ${art.copy}...`);
      this.constructor.createArtifact(art)
    });
  }

  clean() {
    return BbPromise.all(this.artifacts.map(art =>
        fse.removeAsync(art.copy)
    ));
  }

  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    let custom = this.serverless.config.serverless.service.custom;
    this.artifacts = custom ?
      custom.dockerArtifacts || (custom.dockerArtifact ? [custom.dockerArtifact] : [])
      : [];

    this.commands = {
      dockart: {
        commands: {
          create: {
            usage: "Create artifacts.",
            lifecycleEvents: ["create"],
          },
          clean: {
            usage: "Remove artifacts.",
            lifecycleEvents: ["clean"],
          },
          'clean-docker': {
            usage: "Remove artifacts.",
            lifecycleEvents: ["clean-docker"],
          }
        }
      }
    };

    this.hooks = {
      "before:package:createDeploymentArtifacts": () => this.create(),
      "after:package:createDeploymentArtifacts": () => this.clean(),

      "dockart:create:create": () => this.create(),
      "dockart:clean:clean": () => this.clean(),
      "dockart:clean-docker:clean-docker": () => this.constructor.cleanDocker(),

      // TODO: support functions?
      // "before:deploy:function:packageFunction": () =>
      // "after:deploy:function:packageFunction": () =>
    };
  }
}


// Helper function to run commands
function run(cmd, args, options) {
  if (process.env.SLS_DEBUG) console.log('Running', cmd, args.join(' '));

  const stdio = process.env.SLS_DEBUG && options && options.showOutput
    ? ['pipe', 'inherit', 'pipe'] : 'pipe';
  const ps = child_process.spawnSync(cmd, args, {encoding: 'utf-8', 'stdio': stdio});
  if (ps.error) {
    if (ps.error.code === 'ENOENT') {
      throw new Error(`${cmd} not found! Please install it.`);
    }
    throw new Error(ps.error);
  } else if (ps.status !== 0) {
    throw new Error(ps.stderr);
  }
  return ps;
}

function lines(res) {
  return res.stdout.trim().split(/\r?\n/)
}


module.exports = ServerlessDockerArtifacts;
