import fs from 'fs';
import logger from './logger.js';

// inmemory database
export default function inMemoryDb(dbFilePath = './db.mj.json') {
  const initialData = loadDbFile(dbFilePath);
  const _initialData = initialData;
  let data = { ...initialData };

  function upsert(collection, key, value) {
    const existingItem = find(collection, key, value[key]);
    const newItem = { ...existingItem, ...value };
    const collectionItems = data[collection] || [];

    data[collection] = [...collectionItems.filter((item) => item[key] !== value[key]), newItem];
  }

  function find(collection, key, value) {
    if (!data[collection]) {
      return undefined;
    } else {
      return data[collection].find((item) => item[key] === value);
    }
  }

  function reset() {
    data = { ..._initialData };
  }

  return {
    upsert,
    find,
    reset,
  };
}

function loadDbFile(dbFilePath) {
  logger.warn('Creating database');
  try {
    const data = fs.readFileSync(dbFilePath);
    let db = JSON.parse(data);
    logger.info(`Data loaded from ${dbFilePath}\n`);
    return db;
  } catch (error) {
    logger.error(`Couldn't load data from ${dbFilePath}\n`);
    return {};
  }
}
