#!/usr/bin/env node
/* eslint-disable object-curly-newline */
/* eslint-disable no-shadow */
/* eslint-disable no-param-reassign */
/* eslint-disable no-var */
/* eslint-disable import/extensions */
/* eslint-disable vars-on-top */
/* eslint-disable no-use-before-define */

import { Router, DEFAULT_HTTP_VERB } from './router.js';
import loader from './loader.js';
import httpServer from './httpServer.js';
import logger from './logger.js';
import inMemoryDb from './db.js';

const HTTP_SERVER_PORT = 8080;

(async ({ moduleLoader, router, server, logger, db }) => {
  async function start(m, r, s, l) {
    const definitions = await m.getModules({
      cwd: process.cwd(),
      include: './**/*.mj.?(m)js',
    });
    l.warn('\nAdding definitions to router:');
    addDefinitionsToRouter(r, [
      ...definitions,
      { path: '/db/reset', body: (req) => req.db.reset() },
    ]);
    r.all((req) => (req.db = db));

    s.use(r.requestHandler).start();
  }

  function addDefinitionsToRouter(router, definitions = []) {
    definitions.forEach((definition = {}) => {
      if (!definition.path) return;
      const body = typeof definition.body !== 'function' ? () => definition.body : definition.body;
      const verb = (definition.method || DEFAULT_HTTP_VERB).toLowerCase();
      router[verb](definition.path, definition, body, (req, res) => (response) => {
        setTimeout(() => {
          if (!res.writableFinished) {
            res.writeHead(response.responseStatus || 200, {
              'Content-Type': definition.contentType || 'application/json',
            });
            res.end(JSON.stringify(response.body || response));
          }
        }, definition.delay || 0);
      });
    });
  }

  try {
    await start(moduleLoader, router, server, logger);
    logger.log();
    logger.log('Mockingjay server listening at', `http://localhost:${server.getPort()}`);
  } catch (error) {
    logger.error(error);
  }
})({
  moduleLoader: loader,
  router: Router,
  server: httpServer.port(HTTP_SERVER_PORT),
  logger,
  db: inMemoryDb(),
});
