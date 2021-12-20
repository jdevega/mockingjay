/* eslint-disable import/no-unresolved */
import http from 'node:http';

function parseCookie(request) {
  var list = {};
  var rc = request.headers.cookie;

  rc &&
    rc.split(';').forEach(function (cookie) {
      var [name, value] = cookie.split('=');
      if (value && value !== '') list[name.trim()] = decodeURI(value);
    });

  return list;
}

async function parseBody(request) {
  const buffers = [];

  for await (const chunk of request) {
    buffers.push(chunk);
  }

  try {
    const data = Buffer.concat(buffers).toString();
    if (request.headers['content-type'].includes('application/json')) return JSON.parse(data);
    return data;
  } catch (error) {
    return {};
  }
}

const server = {
  start(PORT) {
    http.createServer(this.requestHandler).listen(PORT || this.port);
  },
  use(requestHandler) {
    this.requestHandler = async (req, res) => {
      req.cookie = parseCookie(req);
      req.body = await parseBody(req);
      requestHandler(req, res);
    };
    return this;
  },
  port(value) {
    this.port = value;
    return this;
  },
  getPort() {
    return this.port;
  },
};

export default server;
