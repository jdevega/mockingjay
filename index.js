#!/usr/bin/env node

/* eslint-disable import/no-unresolved */
/* eslint-disable no-use-before-define */
/* eslint-disable global-require */
/* eslint-disable prefer-arrow-callback */
const { randomUUID } = require('crypto');
const { glob } = require('glob');
const http = require('http');
const nodepath = require('path');
const Router = require('./src/modules/router');

Router.use('GET', '*', (req, res) => {
  res.setHeader('x-mockingjay-id', randomUUID());
});

function loadDefinitionFiles() {
  console.log(process.cwd());
  // eslint-disable-next-line no-shadow
  return glob.sync('./**/*.mj.?(m)js', { cwd: process.cwd() }).map(async (path) => {
    console.log(nodepath.join(process.cwd(), path));
    return {
      path,
      // eslint-disable-next-line import/no-dynamic-require
      definitions: await import(nodepath.join(process.cwd(), path)),
    };
  });
}

function addDefinitionsToRouter() {
  const pathDefinitions = {};

  function definitionPath(definition) {
    return pathDefinitions[definitionPathKey(definition)];
  }

  function definitionPathKey(definition) {
    return `${definition.method || 'GET'}-${definition.path}`;
  }

  return function addDefinition({ path, definitions }) {
    [].concat(definitions).forEach(function addRouteByDefinition(definition) {
      if (!definition || !definition.path) return;
      const httpVerb = definition.method || 'GET';
      const currentDefinitionPath = definitionPath(definition);
      if (currentDefinitionPath) {
        console.log(
          'Router already has a route for',
          httpVerb,
          definition.path,
          'defined at',
          currentDefinitionPath,
          'whent trying to load a new one from',
          path,
        );
      } else {
        pathDefinitions[definitionPathKey(definition)] = path;

        if (typeof definition.body === 'function') {
          Router[(definition.method || 'GET').toLowerCase()](
            definition.path,
            definition.body,
            (req, res) => (response) => {
              setTimeout(() => {
                if (!res.writableFinished) {
                  res.writeHead(response.responseStatus || 200, {
                    'Content-Type': definition.contentType || 'application/json',
                  });
                  res.end(JSON.stringify(response.body || response));
                }
              }, definition.delay || 0);
            },
          );
        } else {
          Router[(definition.method || 'GET').toLowerCase()](definition.path, (req, res) => {
            setTimeout(() => {
              if (!res.writableFinished) {
                res.writeHead(definition.responseStatus || 200, {
                  'Content-Type': definition.contentType || 'application/json',
                });
                res.end(JSON.stringify(definition.body));
              }
            }, definition.delay || 0);
          });
        }
      }
    });
  };
}

function requestHandler(req, res) {
  if (Router.recognize(req.url, req.method)) {
    req.params = Router.getRouteParams(req.url, req.method);
    res.body = Router.middlewaresFor(req.url, req.method).reduce((acc, middleware) => {
      const result = middleware(req, res) || {};
      if (typeof result === 'function') return result(acc);
      return { ...acc, ...result };
    }, {});
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'Not Found' }));
  }
}

loadDefinitionFiles().map(addDefinitionsToRouter());
const server = http.createServer(requestHandler);
server.listen(8080);
