'use strict';

import { recent, top, getStats } from './db.js';
import { headers } from './util.js';
//import fetch from 'node-fetch';

const response = {
  headers,
  statusCode: 200,
};

export const overview = async (event) => {
  const { limit, from, to } = event.pathParameters;
  const sources = await Promise.all((await top(new Date(from), new Date(to), parseInt(limit))).map(async ({ip, attempts}) => {
    const response = await fetch(`https://ipapi.co/${ip}/json`);
    const source = await response.json();
    return {
      source,
      attempts,
    };
  }));
  return {
    ...response,
    body: JSON.stringify(
      {
        sources
      },
      null,
      2
    ),
  };
};

export const latest = async (event) => {
  const { since } = event.pathParameters;
  const sources = await Promise.all((await recent(new Date(since))));
  return {
    ...response,
    body: JSON.stringify(
      {
        sources
      },
      null,
      2
    ),
  };
};

export const stats = async ({ pathParameters: { target, listener, from, to, period } }) => {
  return {
    ...response,
    body: JSON.stringify(
      {
        stats: await getStats(decodeURI(target), decodeURI(listener), new Date(from), new Date(to), period),
      },
      null,
      2
    ),
  };
};
