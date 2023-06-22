import { Fragment, useEffect, useState } from 'react';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Form from 'react-bootstrap/Form';
import Table from 'react-bootstrap/Table';

import {Map} from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import DeckGL from '@deck.gl/react';
import {LineLayer, ScatterplotLayer} from '@deck.gl/layers';
import GL from '@luma.gl/constants';

// Source data CSV
const DATA_URL = {
  AIRPORTS:
    'https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/line/airports.json', // eslint-disable-line
  FLIGHT_PATHS:
    'https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/line/heathrow-flights.json' // eslint-disable-line
};

const INITIAL_VIEW_STATE = {
  latitude: 47.65,
  longitude: 7,
  zoom: 4.5,
  maxZoom: 16,
  pitch: 50,
  bearing: 0
};

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json';

function getColor(d) {
  const z = d.start[2];
  const r = z / 10000;

  return [255 * (1 - r * 2), 128 * r, 255 * r, 255 * (1 - r)];
}

function getSize(type) {
  if (type.search('major') >= 0) {
    return 100;
  }
  if (type.search('small') >= 0) {
    return 30;
  }
  return 60;
}

function getTooltip({object}) {
  return (
    object &&
    `\
  ${object.country || object.abbrev || ''}
  ${object.name.indexOf('0x') >= 0 ? '' : object.name}`
  );
}

function ProbeSourceStats({
  airports = DATA_URL.AIRPORTS,
  flightPaths = DATA_URL.FLIGHT_PATHS,
  getWidth = 3,
  mapStyle = MAP_STYLE
}) {
  const layers = [
    new ScatterplotLayer({
      id: 'airports',
      data: airports,
      radiusScale: 20,
      getPosition: d => d.coordinates,
      getFillColor: [255, 140, 0],
      getRadius: d => getSize(d.type),
      pickable: true
    }),
    new LineLayer({
      id: 'flight-paths',
      data: flightPaths,
      opacity: 0.8,
      getSourcePosition: d => d.start,
      getTargetPosition: d => d.end,
      getColor,
      getWidth,
      pickable: true
    })
  ];

  const [options, setOptions] = useState({
    period: {
      selected: 1,
      available: [
        {
          label: 'minute',
          value: 'minute',
        },
        {
          label: 'hour',
          value: 'hour',
        },
        {
          label: 'day',
          value: 'day',
        },
        {
          label: 'month',
          value: 'month',
        },
        {
          label: 'year',
          value: 'year',
        },
      ]
    },
    target: {
      selected: 0,
      available: [
        {
          label: 'calamari archive',
          // eslint-disable-next-line
          value: '^(a[0-9]|avocado|bokkeum|fritti|pasta|salad|smoothie)\.calamari\.systems$',
        },
        {
          label: 'calamari collator',
          // eslint-disable-next-line
          value: '^c[0-9]\.calamari\.systems$',
        },
        {
          label: 'calamari full',
          // eslint-disable-next-line
          value: '^f[0-9]\.calamari\.systems$',
        },
        {
          label: 'manta archive',
          // eslint-disable-next-line
          value: '^a[0-9]\.manta\.systems$',
        },
        {
          label: 'manta collator',
          // eslint-disable-next-line
          value: '^c[0-9]\.manta\.systems$',
        },
      ]
    },
    //listener: '^(ssh|ssl|www)$',
    listener: '.*',
  });
  const [data, setData] = useState(undefined);
  useEffect(() => {
    const [to, from] = [new Date(), new Date()];
    from.setDate(to.getDate() - 1);
    fetch(`https://nhxz2l8yqe.execute-api.eu-central-1.amazonaws.com/prod/stats/${encodeURI(options.target.available[options.target.selected].value)}/${encodeURI(options.listener)}/${from.toISOString()}/${to.toISOString()}/${options.period.available[options.period.selected].value}`)
      .then(response => response.json())
      .then(container => {
        const labels = [...new Set(container.stats.map((x) => x[options.period.available[options.period.selected].value]))].sort();
        const targets = [...new Set(container.stats.map((x) => x.target))].sort();
        const datasets = targets.map(target => ({
          label: target,
          data: labels.map((label) => {
            const x = container.stats.find((x) => x.target === target && x[options.period.available[options.period.selected].value] === label);
            return (!!x) ? x.attempts : 0;
          }),
        }));
        setData({ labels, targets, datasets })
      });
  });
  return (
    <Fragment>
      <Row>
        <Col>
          
          <Form.Select
            onChange={({ target: { value } }) => {
              setOptions(x => ({
                ...x,
                target: {
                  ...x.target,
                  selected: value
                }
              }));
            }}
          >
            {
              options.target.available.map((option, optionIndex) => (
                <option key={optionIndex} value={optionIndex} selected={options.target.selected === optionIndex}>
                  {option.label}
                </option>
              ))
            }
          </Form.Select>
        </Col>
        <Col>
          period
        </Col>
      </Row>
      <Row>
        {
          (!!data)
            ? (
                <DeckGL
                  layers={layers}
                  initialViewState={INITIAL_VIEW_STATE}
                  controller={true}
                  pickingRadius={5}
                  parameters={{
                    blendFunc: [GL.SRC_ALPHA, GL.ONE, GL.ONE_MINUS_DST_ALPHA, GL.ONE],
                    blendEquation: GL.FUNC_ADD
                  }}
                  getTooltip={getTooltip}
                >
                  <Map reuseMaps mapLib={maplibregl} mapStyle={mapStyle} preventStyleDiffing={true} />
                </DeckGL>
              )
            : null
        }
      </Row>
      <Row>
        {
          (!!data)
            ? (
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th></th>
                      {
                        data.datasets.map((dataset, datasetIndex) => (
                          <th key={datasetIndex} style={{textAlign: 'right'}}>
                            {dataset.label.split('.')[0]}
                          </th>
                        ))
                      }
                    </tr>
                  </thead>
                  <tbody>
                    {
                      data.labels.map((label, labelIndex) => (
                        <tr key={labelIndex}>
                          <th>
                            {label}
                          </th>
                          {
                            data.targets.map((target, targetIndex) => (
                              <td key={targetIndex} style={{textAlign: 'right'}}>
                                {data.datasets[targetIndex].data[labelIndex]}
                              </td>
                            ))
                          }
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
