'use strict';

import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.db_readwrite);

export const top = async (from, to, limit) => (
  await client.db('cichlid').collection('probe').aggregate([
    {
      $match: {
        date: {
          $gte: from.toISOString().replace('.000Z', 'Z'),
          $lt: to.toISOString().replace('.000Z', 'Z')
        }
      }
    },
    {
      $group: {
        _id: '$source.ip',
        attempts: {
          $sum: 1
        }
      }
    },
    {
      $sort: {
        attempts: -1
      }
    },
    {
      $limit: limit
    },
    {
      $project: {
        _id: false,
        ip: '$_id',
        attempts: true
      }
    }
  ]).toArray()
);

export const recent = async (since) => (
  await client.db('cichlid').collection('probe').distinct(
    'source.ip',
    {
      date: {
        $gte: since.toISOString().replace('.000Z', 'Z')
      }
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
        date: {
          $gte: from.toISOString().replace('.000Z', 'Z'),
          $lt: to.toISOString().replace('.000Z', 'Z')
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
        attempts: {
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
        attempts: true
      }
    }
  ]).toArray()
);

/*
export const getGeoip = async (ip) => (
  await client.db('geoip').collection('ip').findOne({ ip })
);

export const putGeoip = async (geoip) => (
  await client.db('geoip').collection('ip').findOne({ ip })
);
*/
