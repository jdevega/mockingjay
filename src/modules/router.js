/* eslint-disable consistent-return */
/* eslint-disable import/extensions */
/* eslint-disable import/prefer-default-export */
/* eslint-disable no-use-before-define */
/* eslint-disable no-shadow */
import { UrlPattern } from './UrlPattern.js';
import logger from './logger.js';

export const DEFAULT_HTTP_VERB = 'GET';

function inject(fns = [], value) {
  return { ...value, middlewares: [...fns, ...value.middlewares] };
}

export const Router = ((UrlPattern, logger) => {
  const routes = {};
  const middlewares = {};
  const globalMiddlewares = [];

  function buildKey(url, method, options = {}) {
    return `${method}-${url}-${JSON.stringify(options)}`;
  }

  function getRoute(req) {
    const route = Object.values(routes)
      .filter(({ pattern }) => pattern.match(req.url))
      .filter((route) => route.method === req.method)
      .filter(routeByHeaders.bind(this, req.headers))
      .filter(routeByCookie.bind(this, req.cookie))
      .shift();
    return inject(globalMiddlewares, route);
  }

  function use(store, method, route, options, ...middlewares) {
    // eslint-disable-next-line no-param-reassign
    store[buildKey(route, method, options)] = {
      method,
      middlewares,
      options: options || {},
      pattern: new UrlPattern(route),
    };
    logger.info(
      'Route',
      method.toUpperCase(),
      route,
      'with options',
      JSON.stringify({ cookie: options.cookie, headers: options.headers }),
      'added.',
    );
  }

  function getRouteParams({ method, url }) {
    const route = Object.values(routes).find(
      (route) => route.method === method && route.pattern.match(url),
    );
    return route.pattern.match(url);
  }

  function requestHandler(req, res) {
    const route = getRoute(req);
    if (route) {
      req.params = getRouteParams(req);
      res.body = route.middlewares.reduce((acc, middleware) => {
        const result = middleware(req, res) || {};
        if (typeof result === 'function') return result(acc);
        return { ...acc, ...result };
      }, {});
      logger.info('Router handled', req.method, req.url);
    } else {
      logger.error('Route handler not found for', req.method, req.url);
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: `Not found definition for ${req.method.toUpperCase()} ${req.url}`,
        }),
      );
    }
  }

  return {
    requestHandler,
    use: use.bind(this, middlewares),
    get: use.bind(this, routes, 'GET'),
    post: use.bind(this, routes, 'POST'),
    put: use.bind(this, routes, 'PUT'),
    patch: use.bind(this, routes, 'PATCH'),
    delete: use.bind(this, routes, 'DELETE'),
    all: (fn) => globalMiddlewares.push(fn),
  };
})(UrlPattern, logger);

// function filterRouteBy(itemName, items, route) {
//   const routeItems = route.options[itemName] || {};
//   console.log({ requestItems: items, routeItems });
//   if (Object.keys(routeItems).length && !Object.keys(items).length) return false;

//   return Object.keys(routeItems).reduce((keep, itemKey) => {
//     if (!Object.keys(items).includes(itemKey)) return keep;
//     return keep && routeItems[itemKey] === items[itemKey];
//   }, true);
// }

function routeByHeaders(requestHeaders, route) {
  try {
    const routeHeaders = (route.options || {}).headers || {};
    if (!Object.keys(routeHeaders).length) return true;
    for (let header in routeHeaders) {
      if (
        requestHeaders.includes(header) &&
        requestHeaders[header] === route.options.header[header]
      ) {
        return false;
      }
    }
    return true;
  } catch (error) {
    return false;
  }
}

function routeByCookie(requestCookie = {}, route) {
  const hasRequestCookie = Object.keys(requestCookie).length;
  const routeCookie = (route.options || {}).cookie || {};
  const hasRouteCookie = Object.keys(routeCookie).length;
  if (!hasRouteCookie) {
    return !hasRequestCookie;
  } else if (hasRequestCookie) {
    for (let key in requestCookie) {
      if (routeCookie[key] !== requestCookie[key]) return false;
    }
    return true;
  } else {
    return false;
  }
}
