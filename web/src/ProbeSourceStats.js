import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Table from 'react-bootstrap/Table';
import Spinner from 'react-bootstrap/Spinner';
import Fade from 'react-bootstrap/Fade'

import {
  Annotation,
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';

const columns = [
  {
    header: 'source',
    style: {}
  },
  {
    header: 'location',
    style: {}
  },
  {
    header: 'probes',
    style: {
      textAlign: 'right'
    }
  }
];

function ProbeSourceStats() {
  const [scale, setScale] = useState({ min: 0, max: 0 });
  const [data, setData] = useState(undefined);
  const [locations, setLocations] = useState(undefined);
  useEffect(() => {
  }, [locations]);
  useEffect(() => {
    const [to, from] = [new Date(), new Date()];
    from.setDate(to.getDate() - 1);
    fetch(`https://nhxz2l8yqe.execute-api.eu-central-1.amazonaws.com/prod/overview/100/${from.toISOString()}/${to.toISOString()}`)
      .then(response => response.json())
      .then(({ sources }) => {
        setData(sources);
        const located = Object.values(sources.filter((x) => (!!x.source && !!x.source.location)).reduce(
          (a, { source: { location: { longitude, latitude }, city, country }, probes }) => (
            (!!a[city.id])
              ? {
                  ...a,
                  [city.id]: {
                    ...a[city.id],
                    probes: (a[city.id].probes + probes),
                  }
                }
              : {
                  ...a,
                  [city.id]: {
                    id: city.id,
                    coordinates: [longitude, latitude],
                    probes,
                    city,
                    country,
                  }
                }
          ),
          {}
        ));
        setScale({
          min: Math.min(...located.map((l) => l.probes)),
          max: Math.max(...located.map((l) => l.probes)),
        });
        setLocations(located);
      });
  });
  const popScale = useMemo(
    () => scaleLinear().domain([scale.min, scale.max]).range([4, 24]),
    [scale.min, scale.max]
  );
  return (
    <Fragment>
      <Row>
        <h2>deflected probe origins</h2>
        {
          (!!locations)
            ? (
                <h3>
                  {
                    new Intl.NumberFormat().format(locations.reduce((sum, { probes }) => (sum + probes), 0))
                  } probes in the last 24 hours
                </h3>
              )
            : null
        }
      </Row>
      <Row>
        <Col>
          {
            (!!data && !!locations)
              ? (
                  <ComposableMap projectionConfig={{ rotate: [-10, 0, 0] }}>
                    <Geographies geography={'https://stats.cichlid.io/geography/countries.json'}>
                      {
                        ({ geographies }) => geographies.map((geography) => (
                          <Geography key={geography.rsmKey} geography={geography} style={{
                            default: {
                              fill: '#eeeeee',
                              stroke: '#ffffff',
                              strokeWidth: 1,
                            },
                            hover: {
                              fill: '#dddddd',
                              stroke: '#ffffff',
                              strokeWidth: 2,
                            },
                            pressed: {
                              fill: "#cccccc",
                              stroke: '#000000',
                              strokeWidth: 2,
                            },
                          }} />
                        ))
                      }
                    </Geographies>
                    {locations.map(({ coordinates, probes, city, country }, i) => {
                      return (
                        <Fragment key={city.id}>
                          <Marker coordinates={coordinates}>
                            <circle fill="rgba(255, 85, 51, 0.5)" stroke="#ffffff" r={popScale(probes)} />
                          </Marker>
                          <Annotation
                            subject={coordinates}
                            dx={0}
                            dy={(probes % 2) ? 60 : -60}
                            connectorProps={{
                              stroke: "rgba(0, 0, 0, 0.1)",
                              strokeWidth: 1,
                              strokeLinecap: "round"
                            }}
                          >
                            <text x="-8" textAnchor="end" alignmentBaseline="middle" fill="rgba(0, 0, 0, 0.2)" style={{fontSize: '50%'}}>
                              {(!!city && !!city.name) ? `${city.name}, ` : null}
                              {country.name}: {new Intl.NumberFormat().format(probes)}
                            </text>
                          </Annotation>
                        </Fragment>
                      );
                    })}
                  </ComposableMap>
                )
              : (
                  <Fragment>
                    <Spinner animation="border" variant="secondary" size="lg" />
                    <span style={{marginLeft: '0.5em'}}>query in progress...</span>
                  </Fragment>
                )
          }
        </Col>
      </Row>
      <Row>
        {
          (!!data)
            ? (
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      {
                        columns.map((column, columnIndex) => (
                          <th key={columnIndex} style={column.style}>
                            {column.header}
                            {
                              (column.header === 'source')
                               ? (
                                   <em className={'text-muted'} style={{marginLeft: '0.5em'}}>
                                     provider subnet
                                   </em>
                                 )
                               : null
                            }
                          </th>
                        ))
                      }
                    </tr>
                  </thead>
                  <tbody>
                    {
                      data.filter((source) => (source.probes > 999)).map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          <td>
                            {
                              (!!row.source)
                                ? (
                                    <Fragment>
                                      <Link to={`/origin/${row.source.ip}`}>{row.source.ip}</Link>
                                      {
                                        (!!row.source.provider && !!row.source.provider.name)
                                          ? (
                                              <em className={'text-muted'} style={{marginLeft: '0.5em'}}>
                                                {row.source.provider.name} {row.source.provider.network}
                                              </em>
                                            )
                                          : null
                                      }
                                    </Fragment>
                                  )
                                : null
                            }
                          </td>
                          <td>
                            {
                              (!!row.source && !!row.source.location)
                                ? (
                                    <Fragment>
                                      {row.source.location.longitude}, {row.source.location.latitude}
                                      <em className={'text-muted'} style={{marginLeft: '0.5em'}}>
                                        {
                                          (!!row.source.city && !!row.source.city.name)
                                            ? `${row.source.city.name}, `
                                            : null
                                        }
                                        {
                                          (!!row.source.country)
                                            ? row.source.country.name
                                            : null
                                        }
                                      </em>
                                    </Fragment>
                                  )
                                : null
                            }
                          </td>
                          <td style={columns.find((c) => (c.header === 'probes')).style}>
                            {new Intl.NumberFormat().format(row.probes)}
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </Table>
              )
            : null
        }
      </Row>
    </Fragment>
  );
}

export default ProbeSourceStats;
