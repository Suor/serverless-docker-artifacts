# Serverless Docker Artifacts plugin

A Serverless 1.x plugin to build your artifacts within docker container.


## Installation and Usage

```
npm install --save serverless-docker-artifacts
```

Add the plugin to your `serverless.yml` file and set the WSGI application:

```yaml
plugins:
  - serverless-docker-artifacts

custom:
  dockerArtifact:
    path: '.'
    dockerfile: Dockerfile-tesseract
    copy: tesseract-standalone

  # If you have more than one
  dockerArtifacts:
    - path: build/somelib
      copy: somelib
    - path: build/tool
      copy: tool-portable
```

Then run `sls deploy` or `sls package` as usual.


## Extra commands

This plugin defines commands to manufacture and clean artifacts without packaging them:

```bash
sls dockart create                # Build all artifacts
SLS_DEBUG="*" sls dockart create  # Same, showing all the process

sls dockart clean        # Delete artifacts
sls dockart clean --full # Delete artifacts, docker images and containers
```

Note that if you are debugging a dockerfile you probaly have lots of dangling images and their containers. These are not removed by `sls dockart clean --full`, you need to handle it yourself.


## API for your plugins

```js
const dockart = require('serverless-docker-artifacts');

// Create an artifact
dockart.createArtifact(this.serverless, {
    path: 'path/to/',
    dockerfile: 'Dockerfile',
    copy: 'some-dir'
})

// Remove containers and images
dockart.cleanDocker()
```
