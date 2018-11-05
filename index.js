"use strict";

const child_process = require("child_process");
// const path = require("path");
const BbPromise = require("bluebird");
const fse = require("fs-extra");

BbPromise.promisifyAll(fse);


class ServerlessDockerArtifacts {
  createArtifacts() {
    this.artifacts.forEach((art) => {
      this.serverless.cli.log(`Building ${art.path}/${art.dockerfile} image with ${art.copy}...`);

      let imageName = 'sls-dockart-' + art.copy.replace(/\W/g, '').toLowerCase();
      run('docker', ['build', '-f', art.dockerfile, '-t', imageName, art.path]);
      let container = run('docker', ['create', imageName, '-']).stdout.replace(/^\s+|\s+/g, '');
      run('docker', ['cp', `${container}:/var/task/${art.copy}`, art.copy])
    })
  }

  cleanup() {
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
      // dockart: {
      //   commands: {
      //     serve: {
      //       usage: "Serve the WSGI application locally.",
      //       lifecycleEvents: ["serve"],
      //       options: {
      //         port: {
      //           usage: "The local server port, defaults to 5000.",
      //           shortcut: "p"
      //         },
      //         host: {
      //           usage: "The server host, defaults to 'localhost'."
      //         }
      //       }
      //     },
      //     clean: {
      //       usage: "Remove cached requirements.",
      //       lifecycleEvents: ["clean"]
      //     }
      //   }
      // }
    };

    this.hooks = {
      "before:package:createDeploymentArtifacts": () => this.createArtifacts(),
      "after:package:createDeploymentArtifacts": () => this.cleanup(),

      // "wsgi:clean:clean": () =>
      //   BbPromise.bind(this)
      //     .then(this.validate)
      //     .then(this.unlinkRequirements)
      //     .then(this.cleanRequirements)
      //     .then(this.cleanup),

      // TODO: support functions?
      // "before:deploy:function:packageFunction": () =>
      // "after:deploy:function:packageFunction": () =>
    };
  }
}


// Helper function to run commands
function run(cmd, args) {
  // console.log('Running ', cmd, args.join(' '))
  const ps = child_process.spawnSync(cmd, args, { encoding: 'utf-8' });
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

module.exports = ServerlessDockerArtifacts;
