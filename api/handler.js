'use strict';

import {
  recent,
  top,
  getStats,
  getTargets,
  getLatestProbes,
  getCoordinates,
  getLocation,
  getOrigin,
  getProbes,
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

export const targets = async ({ pathParameters: { source, target, listener, from, to } }) => {
  const raw = await getTargets(decodeURI(source), decodeURI(target), decodeURI(listener), new Date(from), new Date(to));
  const ids = await Promise.all(raw.map(({ target }) => target).map((fqdn) => getIp(fqdn)));
  const ips = [
    //...raw.map(({ source }) => source),
    ...ids.map(({ip}) => ip),
  ];
  const locations = await Promise.all(raw.map(({ source }) => getLocation(source)));
  const coords = await Promise.all(ips.map((ip) => getCoordinates(ip)));
  const data = raw.map((x) => {
    const id = ids.find(({fqdn}) => fqdn === x.target);
    const { latitude, longitude } = coords.find((c) => c.ip.address === id.ip);
    const location = locations.find((location) => (location.ip === x.source));
    return {
      target: {
        ...id,
        latitude,
        longitude,
        port: x.port,
      },
      source: {
        ip: x.source,
        location,
      },
      note: x.note,
      probes: x.probes,
    };
  });
  /*
  const coordinates = await Promise.all(ips.map(({ip}) => getCoordinates(ip)));
  const targets = ips.map((ip, i) => ({ ...ip, coordinates: [coordinates[i].longitude, coordinates[i].latitude] }));
  */
  return {
    ...response,
    body: JSON.stringify(
      data,
      null,
      2
    ),
  };
};

export const origin = async ({ pathParameters: { ip, target, listener, from, to } }) => {
  const [origin, probes] = await Promise.all([
    getOrigin(ip, decodeURI(target), decodeURI(listener), new Date(from), new Date(to)),
    getProbes(ip, decodeURI(target), decodeURI(listener), new Date(from), new Date(to)),
  ]);
  /*
  const fqdnsWithMissingIp = rawProbes.filter((p) => !p.target.ip).map((p) => p.target.fqdn);
  const missingIps = (await Promise.all(fqdnsWithMissingIp.map(fqdn => getIp(fqdn))));
  const ipFqdnMap = fqdnsWithMissingIp.map((fqdn, i) => ({ fqdn, ip: missingIps[i]}));
  const probes = rawProbes.map((probe) => (
    (!!probe.target.ip)
      ? probe
      : ({
          ...probe,
          target: {
            ...probe.target,
            ip: ipFqdnMap.find((x) => x.fqdn === probe.target.fqdn).ip,
          },
        })
    ));
  */

  const ips = [...new Set([
    ...probes.map(({ source: { ip }}) => ip),
    ...probes.map(({ target: { ip }}) => ip),
  ])];
  const locations = await Promise.all(ips.map((ip) => getLocation(ip)));
  return {
    ...response,
    body: JSON.stringify(
      {
        origin,
        probes: probes.map((probe) => ({
          ...probe,
          source: {
            ...probe.source,
            location: locations.find((location) => location.ip === probe.source.ip),
          },
          target: {
            ...probe.target,
            location: locations.find((location) => location.ip === probe.target.ip),
          },
        })),
      },
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
