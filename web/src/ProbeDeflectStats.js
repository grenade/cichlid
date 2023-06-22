import { Fragment, useEffect, useState } from 'react';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Form from 'react-bootstrap/Form';
import Table from 'react-bootstrap/Table';
import { Chart } from 'react-chartjs-2';
import { 
  Chart as ChartJS,
  registerables
} from 'chart.js'; 
ChartJS.register(...registerables);

function ProbeDeflectStats() {
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
            defaultValue={options.target.selected}
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
                <Chart
                  type="line"
                  data={data}
                />
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

export default ProbeDeflectStats;
