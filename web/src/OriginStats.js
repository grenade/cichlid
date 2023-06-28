import { Fragment, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Row from 'react-bootstrap/Row';
import Table from 'react-bootstrap/Table';
import Spinner from 'react-bootstrap/Spinner';

import {
  ComposableMap,
  Geographies,
  Geography,
  Line,
  Marker,
} from 'react-simple-maps';

const endpoint = 'https://nhxz2l8yqe.execute-api.eu-central-1.amazonaws.com';
//const endpoint = 'http://localhost:3001';

function OriginStats() {
  const location = useLocation();
  const ip = location.pathname.split('/')[2];

  const [data, setData] = useState(undefined);
  useEffect(() => {
    const [to, from] = [new Date(), new Date()];
    from.setTime(to.getTime() - (24 * 60 * 60 * 1000));
    fetch(`${endpoint}/prod/targets/${encodeURIComponent(ip.replaceAll('.', '\\.'))}/.*/.*/${from.toISOString()}/${to.toISOString()}`)
      .then(response => response.json())
      .then((list) => {
        const sources = [...new Set(list.map(({ source: { ip }}) => ip))]
          .map((ip) => {
            const source = list.find(({source}) => source.ip === ip).source;
            return {
              ip,
              coordinates: [source.location.location.longitude, source.location.location.latitude],
              provider: source.location.provider,
              city: source.location.city,
              country: source.location.country,
            };
          });
        const targets = [...new Set(list.map(({ target: { ip }}) => ip))]
          .map((ip) => {
            const {longitude, latitude, fqdn} = list.find(({target}) => target.ip === ip).target;
            return {
              ip,
              fqdn,
              coordinates: [longitude, latitude],
            };
          });
        const trajectories = [...new Set(list.map(({ target, source }) => ({ to: [target.longitude, target.latitude], from: [source.location.location.longitude, source.location.location.latitude] })))]
          .map(({ to, from }) => {
            return {
              to,
              from,
              probes: list.filter((x) => (
                x.target.longitude === to[0]
                && x.target.latitude === to[1]
                && x.source.location.location.longitude === from[0]
                && x.source.location.location.latitude === from[1]
              )).reduce((a, { probes }) => (a + probes), 0)
            };
          });
        setData({
          sources,
          targets,
          trajectories,
          list,
        });
      });
  });
  return (
    <Fragment>
      <Row>
        <h2>
          {ip}
          {
            (!!data && !!data.sources && !!data.sources.length)
              ? (
                  <em className="text-muted" style={{marginLeft: '0.5em'}}>
                    {
                      (!!data.sources[0].city && !!data.sources[0].city.name)
                        ? `${data.sources[0].city.name}, `
                        : null
                    }
                    {
                      (!!data.sources[0].country)
                        ? data.sources[0].country.name
                        : null
                    }
                    {
                      (!!data.sources[0].provider && !!data.sources[0].provider.name)
                        ? (
                            <span style={{marginLeft: '0.5em'}}>
                              - {data.sources[0].provider.name} {data.sources[0].provider.network}
                            </span>
                          )
                        : null
                    }
                  </em>
                )
              : null
          }
        </h2>
        <h3>last 24 hours</h3>
      </Row>
      <Row>
        {
          (!!data && !!data.sources && !!data.sources.length)
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
                  {
                    data.sources.map(({ ip, coordinates }) => {
                      return (
                        <Marker key={ip} coordinates={coordinates}>
                          <circle fill="rgba(255, 85, 51, 0.5)" stroke="#ffffff" r={4} />
                        </Marker>
                      );
                    })
                  }
                  {
                    data.targets.map(({ ip, coordinates }) => {
                      return (
                        <Marker key={ip} coordinates={coordinates}>
                          <circle fill="rgba(0, 255, 0, 0.5)" stroke="#ffffff" r={4} />
                        </Marker>
                      );
                    })
                  }
                  {
                    /*
                    data.targets.map(({ fqdn, coordinates }) => {
                      return (
                        <Marker key={fqdn} coordinates={coordinates}>
                          <circle fill="rgba(0, 255, 0, 0.5)" stroke="#ffffff" r={4} />
                        </Marker>
                      );
                    })
                    */
                  }
                  {
                    data.trajectories.map(({ to, from, probes }, index) => {
                      return (
                        <Line
                          key={index}
                          from={from}
                          to={to}
                          stroke="rgba(255, 85, 51, 0.1)"
                          strokeWidth={1}
                          strokeLinecap="round"
                        />
                      );
                    })
                  }

                </ComposableMap>
              )
            : (
                <Spinner animation="border" variant="secondary" size="lg">
                  <span className="visually-hidden">lookup in progress...</span>
                </Spinner>
              )
        }
      </Row>
      <Row>
        <Table>
          <thead>
            <tr>
              <th>target</th>
              <th>probe</th>
              <th>coordinates</th>
              <th>count</th>
            </tr>
          </thead>
          <tbody>
            {
              (!!data && !!data.list && !!data.list.length)
                ? (
                    data.list.map((item, listIndex) => (
                      <tr key={listIndex}>
                        <td>
                          {item.target.fqdn}:{item.target.port}
                          <em className="text-muted" style={{marginLeft: '0.5em'}}>
                            {item.target.ip}:{item.target.port}
                          </em>
                        </td>
                        <td>
                          {item.note.replace('drop', 'deflect')}
                        </td>
                        <td>{item.target.longitude}, {item.target.latitude}</td>
                        <td>{item.probes}</td>
                      </tr>
                    ))
                  )
                : null
            }
          </tbody>
        </Table>
      </Row>
    </Fragment>
  );
}

export default OriginStats;
