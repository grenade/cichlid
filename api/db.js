'use strict';

import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.db_readwrite);

export const top = async (from, to, limit) => (
  await client.db('cichlid').collection('probe').aggregate([
    {
      $match: {
        time: {
          $gte: from,
          $lt: to,
        },
        'source.ip': { $ne: '127.0.0.1' },
      }
    },
    {
      $group: {
        _id: '$source.ip',
        probes: {
          $sum: 1,
        }
      }
    },
    {
      $sort: {
        probes: -1,
      }
    },
    {
      $limit: limit,
    },
    {
      $project: {
        _id: false,
        ip: '$_id',
        probes: true,
      }
    }
  ]).toArray()
);

export const recent = async (since) => (
  await client.db('cichlid').collection('probe').distinct(
    'source.ip',
    {
      time: {
        $gte: since,
      },
      'source.ip': { $ne: '127.0.0.1' },
    }
  )
);

const getPeriodSelector = (period) => {
  switch (period) {
    case 'year':
      return { $substr: [ "$date", 0, 4 ] };
    case 'month':
      return { $substr: [ "$date", 0, 7 ] };
    case 'day':
      return { $substr: [ "$date", 0, 10 ] };
    case 'hour':
      return { $substr: [ "$date", 0, 13 ] };
    case 'minute':
      return { $substr: [ "$date", 0, 16 ] };
    default:
      return { $substr: [ "$date", 0, 10 ] };
  }
};

/*
const getTargetSelector = (target) => {
  switch (target) {
    case 'domain':
      return { $slice: [ { $split: [ "$target.fqdn", "." ] }, 1, 9 ] };
    default:
      return '"$target.fqdn"';
  }
};
*/

export const getStats = async (target, listener, from, to, period) => (
  await client.db('cichlid').collection('probe').aggregate([
    {
      $match: {
        time: {
          $gte: from,
          $lt: to
        },
        'target.fqdn': {
          $regex: target
        },
        note: {
          $regex: listener
        }
      }
    },
    {
      $group: {
        _id: {
          period: getPeriodSelector(period),
          target: '$target.fqdn',
        },
        probes: {
          $sum: 1
        }
      }
    },
    {
      $sort: {
        '_id.period': 1,
        '_id.target': 1,
      }
    },
    {
      $project: {
        _id: false,
        [period]: '$_id.period',
        target: '$_id.target',
        probes: true
      }
    }
  ]).toArray()
);

export const getTargets = async (source, target, listener, from, to) => (
  await client.db('cichlid').collection('probe').aggregate([
    {
      $match: {
        time: {
          $gte: from,
          $lt: to
        },
        'source.ip': {
          $regex: source
        },
        'target.fqdn': {
          $regex: target
        },
        note: {
          $regex: listener
        }
      }
    },
    {
      $group: {
        _id: {
          note: '$note',
          target: '$target.fqdn',
          port: '$target.port',
          source: '$source.ip',
        },
        probes: {
          $sum: 1
        }
      }
    },
    {
      $sort: {
        '_id.note': 1,
        '_id.target': 1,
        '_id.port': 1,
        '_id.source': 1,
      }
    },
    {
      $project: {
        _id: false,
        note: '$_id.note',
        target: '$_id.target',
        port: '$_id.port',
        source: '$_id.source',
        probes: true
      }
    }
  ]).toArray()
);

export const getOrigin = async (ip, target, listener, from, to) => (
  await client.db('cichlid').collection('probe').aggregate([
    {
      $match: {
        time: {
          $gte: from,
          $lt: to
        },
        'source.ip': {
          $regex: ip
        },
        'target.fqdn': {
          $regex: target
        },
        note: {
          $regex: listener
        }
      }
    },
    {
      $group: {
        _id: {
          note: '$note',
          target: '$target.fqdn',
        },
        probes: {
          $sum: 1
        }
      }
    },
    {
      $sort: {
        '_id.note': 1,
        '_id.target': 1,
      }
    },
    {
      $project: {
        _id: false,
        note: '$_id.note',
        target: '$_id.target',
        probes: true
      }
    }
  ]).toArray()
);

export const getProbes = async (origin, target, listener, from, to) => (
  await client.db('cichlid').collection('probe').find(
    {
      time: {
        $gte: from,
        $lt: to
      },
      'source.ip': {
        $regex: origin
      },
      'target.fqdn': {
        $regex: target
      },
      note: {
        $regex: listener
      },
    },
    {
      projection: {
        _id: false
      }
    }
  ).toArray()
);

export const getLatestProbes = async (target, listener, limit) => (
  await client.db('cichlid').collection('probe').find(
    {
      'target.fqdn': {
        $regex: target
      },
      note: {
        $regex: listener
      },
    }
  ).sort({ time: -1 }).limit(limit).toArray()
);

const getIpv4AsInteger = (ipv4) => (ipv4.split('.').reverse().reduce((a, o, i) => (a + (parseInt(o) * (256 ** i))), 0));

export const getCoordinates = async (ip) => {
  const integer = getIpv4AsInteger(ip);
  const x = (await client.db('geoip').collection('city-blocks-ipv4').findOne(
    {
      network_start_integer: {
        $lte: integer,
      },
      network_last_integer: {
        $gte: integer,
      },
    },
    {
      projection: {
        _id: 0,
        latitude: 1,
        longitude: 1,
        /*
        postal_code: 1,
        is_anonymous_proxy: 1,
        is_satellite_provider: 1,
        */
      },
    }
  ));
  return {
    ...x,
    ip: {
      address: ip,
      integer,
    },
  };
};

export const getLocation = async (ip) => {
  const ipAsInteger = getIpv4AsInteger(ip);
  const [abi, cbi] = await Promise.all([
    client.db('geoip').collection('asn-blocks-ipv4').findOne(
      {
        network_start_integer: {
          $lte: ipAsInteger,
        },
        network_last_integer: {
          $gte: ipAsInteger,
        },
      },
      {
        projection: {
          _id: 0,
          network: 1,
          autonomous_system_number: 1,
          autonomous_system_organization: 1,
        },
      }
    ),
    client.db('geoip').collection('city-blocks-ipv4').findOne(
      {
        network_start_integer: {
          $lte: ipAsInteger,
        },
        network_last_integer: {
          $gte: ipAsInteger,
        },
      },
      {
        projection: {
          _id: 0,
          latitude: 1,
          longitude: 1,
          accuracy_radius: 1,
          network: 1,
          geoname_id: 1,
          registered_country_geoname_id: 1,
          postal_code: 1,
          is_anonymous_proxy: 1,
          is_satellite_provider: 1,
        },
      }
    )
  ]);
  //console.log({ip, abi, cbi});
  if (!cbi || !cbi.geoname_id) {
    return {
      ip,
      ...(!!abi) && {
        provider: {
          id: abi.autonomous_system_number,
          name: abi.autonomous_system_organization,
          network: abi.network,
        },
      },
    };
  }
  const c = await client.db('geoip').collection('city-locations-en').findOne(
    {
      geoname_id: cbi.geoname_id,
    },
    {
      projection: {
        _id: 0,
        continent_code: 1,
        continent_name: 1,
        country_iso_code: 1,
        country_name: 1,
        subdivision_1_iso_code: 1,
        subdivision_1_name: 1,
        subdivision_2_iso_code: 1,
        subdivision_2_name: 1,
        city_name: 1,
        metro_code: 1,
        time_zone: 1,
        is_in_european_union: 1,
      },
    }
  );
  return {
    id: ipAsInteger,
    ip,
    network: cbi.network,
    ...(!!abi) && {
      provider: {
        id: abi.autonomous_system_number,
        name: abi.autonomous_system_organization,
        network: abi.network,
      }
    },
    continent: {
      code: c.continent_code,
      name: c.continent_name,
    },
    country: {
      code: c.country_iso_code,
      name: c.country_name,
      id: cbi.registered_country_geoname_id,
    },
    city: {
      ...(!!c.metro_code) && { code: c.metro_code },
      ...(!!c.city_name) && { name: c.city_name },
      id: cbi.geoname_id,
    },
    ...(!!cbi.postal_code) && { postcode: cbi.postal_code },
    location: {
      latitude: cbi.latitude,
      longitude: cbi.longitude,
      accuracy: {
        radius: cbi.accuracy_radius,
      },
    },
    ...(!!c.subdivision_1_iso_code || !!c.subdivision_1_name) & ({
      subdivisions: [
        ...[{
          code: c.subdivision_1_iso_code,
          name: c.subdivision_1_name,
        }],
        /*
        ...(!!c.subdivision_2_iso_code || !!c.subdivision_2_name) & [{
          code: c.subdivision_2_iso_code,
          name: c.subdivision_2_name,
        }],
        */
      ]
    }),
    timezone: c.time_zone,
    eu: (!!c.is_in_european_union),
  };
};

/*
export const getGeoip = async (ip) => (
  await client.db('geoip').collection('ip').findOne({ ip })
);

export const putGeoip = async (geoip) => (
  await client.db('geoip').collection('ip').findOne({ ip })
);
*/
