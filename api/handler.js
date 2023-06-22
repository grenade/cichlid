'use strict';

import {
  recent,
  top,
  getStats,
  getTargets,
  getCoordinates,
} from './db.js';
import { headers } from './util.js';
//import fetch from 'node-fetch';

const response = {
  headers,
  statusCode: 200,
};

const getIp = async (fqdn) => (
  {
    fqdn,
    ip: (await (await fetch(`https://1.1.1.1/dns-query?name=${fqdn}`, {
      headers: {
        Accept: 'application/dns-json',
      },
    })).json()).Answer[0].data
  }
  //curl --http2 --header accept:application/dns-json --url https://1.1.1.1/dns-query?name=a1.manta.systems | jq .
);

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

export const targets = async ({ pathParameters: { target, listener, from, to } }) => {
  const fqdns = await getTargets(decodeURI(target), decodeURI(listener), new Date(from), new Date(to));
  const ips = (await Promise.all(fqdns.map(fqdn => getIp(fqdn))));
  const coordinates = await Promise.all(ips.map(({ip}) => getCoordinates(ip)));

  return {
    ...response,
    body: JSON.stringify(
      {
        targets: ips.map((ip, i) => ({
          ...ip,
          coordinates: [coordinates[i].longitude, coordinates[i].latitude],
        })),
      },
      null,
      2
    ),
  };
};
