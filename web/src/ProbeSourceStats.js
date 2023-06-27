import { Fragment, useEffect, useMemo, useState } from 'react';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Table from 'react-bootstrap/Table';
import Spinner from 'react-bootstrap/Spinner';

import {
  ComposableMap,
  Geographies,
  Geography,
  Marker
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
  const [maxValue, setMaxValue] = useState(0);
  const [data, setData] = useState(undefined);
  const [locations, setLocations] = useState(undefined);
  useEffect(() => {
    const [to, from] = [new Date(), new Date()];
    from.setDate(to.getDate() - 1);
    fetch(`https://nhxz2l8yqe.execute-api.eu-central-1.amazonaws.com/prod/overview/100/${from.toISOString()}/${to.toISOString()}`)
      .then(response => response.json())
      .then(({ sources }) => {
        setData(sources);
        const located = Object.values(sources.reduce(
          (a, { source: { location: { longitude, latitude }, city: { id } }, probes }) => (
            (!!a[id])
              ? {
                  ...a,
                  [id]: {
                    ...a[id],
                    probes: (a[id].probes + probes),
                  }
                }
              : {
                  ...a,
                  [id]: {
                    id,
                    coordinates: [longitude, latitude],
                    probes,
                  }
                }
          ),
          {}
        ));
        setMaxValue(Math.round(Math.max(...located.map((l) => l.probes)) * 0.5));
        setLocations(located);
      });
  });
  const popScale = useMemo(
    () => scaleLinear().domain([0, maxValue]).range([0, 24]),
    [maxValue]
  );
  return (
    <Fragment>
      <Row>
        <h2>deflected probe origins</h2>
        <h3>last 24 hours</h3>
      </Row>
      <Row>
        <Col>
          {
            (!!data && !!locations)
              ? (
                  <ComposableMap projectionConfig={{ rotate: [-10, 0, 0] }}>
                    <Geographies geography={'https://stats.cichlid.io/continents.json'}>
                      {
                        ({ geographies }) => geographies.map((geometry) => (
                          <Geography key={geometry.rsmKey} geography={geometry} fill="#eeeeee" />
                        ))
                      }
                    </Geographies>
                    {locations.map(({ id, coordinates, probes }) => {
                      return (
                        <Marker key={id} coordinates={coordinates}>
                          <circle fill="rgba(255, 85, 51, 0.5)" stroke="#ffffff" r={popScale(probes)} />
                        </Marker>
                      );
                    })}
                  </ComposableMap>
                )
              : (
                  <Spinner animation="border" variant="secondary" size="lg">
                    <span className="visually-hidden">lookup in progress...</span>
                  </Spinner>
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
                                      {row.source.ip}
                                      {
                                        (!!row.source.provider && !!row.source.provider.name)
                                          ? (
                                              <em className={'text-muted'} style={{marginLeft: '1em'}}>
                                                {row.source.provider.name}
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
                              (!!row.source)
                                ? (
                                    <Fragment>
                                      {row.source.location.longitude}, {row.source.location.latitude}
                                      <em className={'text-muted'} style={{marginLeft: '1em'}}>
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
                            {row.probes}
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
