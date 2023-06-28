'use strict';

import {
  recent,
  top,
  getStats,
  getTargets,
  getLatestProbes,
  getCoordinates,
  getLocation,
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
  const sources = await Promise.all((await top(new Date(from), new Date(to), parseInt(limit))).map(async ({ip, probes}) => {
    const source = await getLocation(ip);
    return {
      source,
      probes,
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
  const targets = ips.map((ip, i) => ({ ...ip, coordinates: [coordinates[i].longitude, coordinates[i].latitude] }));
  return {
    ...response,
    body: JSON.stringify(
      targets,
      null,
      2
    ),
  };
};

const locateProbe = async (probe) => {
  const [target, source] = await Promise.all([
    getLocation(probe.target.ip),
    getLocation(probe.source.ip),
  ]);
  return {
    ...probe,
    target: {
      ...probe.target,
      location: target,
    },
    source: {
      ...probe.source,
      location: source,
    },
  };
};

export const probes = async ({ pathParameters: { target, listener, limit } }) => {
  const rawProbes = await getLatestProbes(decodeURI(target), decodeURI(listener), parseInt(limit));
  const probes = await Promise.all(rawProbes.map(locateProbe));
  return {
    ...response,
    body: JSON.stringify(
      {
        probes
      },
      null,
      2
    ),
  };
};
