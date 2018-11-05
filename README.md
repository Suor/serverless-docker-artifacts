# Serverless Docker Artifacts plugin

A Serverless 1.x plugin to build your artifacts within docker container.

### Features

- ...

## Install

```
npm install --save serverless-docker-artifacts
```

Add the plugin to your `serverless.yml` file and set the WSGI application:

```yaml
plugins:
  - serverless-docker-artifacts

custom:
  dockerArtifact: Dockerfile-tesseract
  dockerArtifacts:
    - Dockerfile-tesseract
    - Dockerfile-some-library
  # Extra options?
```


### Dockerfile example

...

```python
from ...

...
```


## Deployment

...


## Usage

...
