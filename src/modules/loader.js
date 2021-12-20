/* eslint-disable import/no-unresolved */
import glob from 'glob';
import path from 'node:path';
import logger from './logger.js';

export default ((g, p, l) => {
  async function loadModule(modulePath) {
    l.info(modulePath);
    const module = await import(modulePath);
    return module.default;
  }

  async function getModules({ cwd, include }) {
    return new Promise((res, rej) => {
      g(include, { cwd }, async (error, matches) => {
        function joinCwd(modulePath) {
          return p.join(cwd, modulePath);
        }
        if (error) {
          rej(error);
        } else {
          l.warn('Loading Mockingjay definitions at:');
          const modules = await Promise.all(matches.map(joinCwd).map(loadModule));
          res(modules.flat());
        }
      });
    });
  }

  return {
    getModules,
  };
})(glob, path, logger);
