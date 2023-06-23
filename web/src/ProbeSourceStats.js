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

function getColor(d) {
  const z = d.start[2];
  const r = z / 10000;

  return [255 * (1 - r * 2), 128 * r, 255 * r, 255 * (1 - r)];
}

function getSize(fqdn) {
  const domain = fqdn.slice(fqdn.indexOf('.') + 1);
  //console.log(domain, fqdn);
  switch (domain) {
    case 'calamari.systems':
      return 90;
    case 'manta.systems':
      return 60;
    default:
      return 30;
  }
}

function getTooltip({object}) {
  //console.log(object);
  return (!!object)
    ? (!!object.fqdn && !!object.ip)
      ? `${object.fqdn} ${object.ip}`
      : (!!object.name)
        ? `${object.name}`
        : null
    : null;
}

function ProbeSourceStats({
  //targets = `https://nhxz2l8yqe.execute-api.eu-central-1.amazonaws.com/prod/targets/${encodeURI('.*')}/${encodeURI('.*')}/${(new Date('2023-06-22')).toISOString()}/${(new Date('2023-06-23')).toISOString()}`,
  targets = 'https://gist.githubusercontent.com/grenade/c33c57a551bbf5abb8f5f3af42a0110f/raw/06ebd8f1714b49d60c5a320e4e1816058ffb2db3/nodes.json',
  probes = 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/line/heathrow-flights.json',
  mapStyle = 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json',
  getWidth = 3,
  initialViewState = {
    latitude: 47.65,
    longitude: 7,
    zoom: 4.5,
    maxZoom: 16,
    pitch: 50,
    bearing: 0
  }
}) {
  const layers = [
    new ScatterplotLayer({
      id: 'targets',
      data: targets,
      radiusScale: 20,
      getPosition: (target) => target.coordinates,
      getFillColor: [255, 140, 0],
      getRadius: d => getSize(d.fqdn),
      pickable: true
    }),
    new LineLayer({
      id: 'probes',
      data: probes,
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
            value={options.target.selected}
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
                <option key={optionIndex} value={optionIndex}>
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
        <Col style={{ minHeight: '600px', width: '50vw', position: 'relative' }}>
          {
            (!!data)
              ? (
                  <DeckGL
                    layers={layers}
                    initialViewState={initialViewState}
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
        </Col>
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
