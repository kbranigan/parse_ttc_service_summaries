#!/usr/bin/env node

const fs = require("fs");
const assert = require("assert");
const { allFiles, yards, vehicles, services, } = require("./vars");
const outputFolder = 'output';

const ignore_branches = [
  'Combined/Average',
  'Gap Trains',
  'Standby cars',
  'Service relief buses',
  'Standby buses',
];

(async () => {

  let routes = {};
  let branches = {};
  let bad = {};

  let filesProcessed = 0;

  for (var i = 0 ; i < allFiles.length ; i++) {
    const basename = allFiles[i];

    const filename = `${outputFolder}/${basename}.csv`;
    const data = new String(fs.readFileSync(filename));
    let lines = data.split('\n').map(line => line.split(','));
    const header = lines[0];

    if (lines.length < 10) console.log({ filename, 'lines.length': lines.length });

    console.log(lines.length);

    lines = lines.slice(1).filter(line => {
      if (ignore_branches.includes(line[3])) return 0;
      if (line.includes('Tripper')) return 0;
      if (line.includes('Trips')) return 0;
      if (line.includes('trips')) return 0;
      return 1;
    });

    const veh_type_fields = header.map((e, i) => e === 'veh_type' ? i : '').filter(String);
    const num_veh_fields = header.map((e, i) => e === 'num_veh' ? i : '').filter(String);
    const interval_fields = header.map((e, i) => e === 'interval' ? i : '').filter(String);
    const run_time_fields = header.map((e, i) => e === 'run_time' ? i : '').filter(String);
    const term_time_fields = header.map((e, i) => e === 'term_time' ? i : '').filter(String);
    const avg_spd_fields = header.map((e, i) => e === 'avg_spd' ? i : '').filter(String);

    for (var j = 1 ; j < lines.length ; j++) {
      const line = lines[j];
      assert(line.length === 42);

      routes[line[2]] = (routes[line[2]] || 0) + 1;
      branches[line[3]] = (branches[line[3]] || 0) + 1;
    }

    routes = Object.entries(routes).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
    branches = Object.entries(branches).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

    const branches_without_dashes = branches.filter(branch => branch.indexOf('-') !== -1);
    if (branches_without_dashes.length) console.log({ filename, branches_without_dashes });

    for (var j = 1 ; j < lines.length ; j++) {
      const line = lines[j];

      const [ file, page, route, branch, service, yard, last_change, rt_distance ] = line.slice(0, 8);
      // const veh_type = veh_type_fields.map(f => line[f]).map(v => Object.keys(vehicles).includes(v));
      // const num_veh = num_veh_fields.map(f => line[f]).map(v => parseInt(v) == v);
      // const interval = interval_fields.map(f => line[f]).map(v => v.split(' ').every(k => parseInt) && v.split(' ').length === 2);
      // const run_time = run_time_fields.map(f => line[f]).map(v => parseInt(v) == v);
      // const term_time = term_time_fields.map(f => line[f]).map(v => parseInt(v) == v);
      // const avg_spd = avg_spd_fields.map(f => line[f]).map(v => parseFloat(v) == v);

      if (branch.replace('Sheppard-Yonge', 'SheppardYonge').replace('Shep-Yonge', 'SheppardYonge').split('-').length !== 2) {
        const index = (bad.branch || []).findIndex(b => b.branch === branch);
        if (index !== -1) bad.branch[index].count ++;
        else bad.branch = (bad.branch || []).concat([{ file, page, route, branch, service, count: 1 }]);
      }

      if (!services.includes(service)) {
        const index = (bad.service || []).findIndex(b => b.service === service);
        if (index !== -1) bad.service[index].count ++;
        else bad.service = (bad.service || []).concat([{ file, page, route, branch, service, count: 1 }]);
      }

      veh_type_fields.map(f => line[f]).forEach(veh_type => {
        if (veh_type !== '' && !veh_type.split('/').every(vt => vehicles.includes(vt))) {
          const index = (bad.veh_type || []).findIndex(b => b.veh_type === veh_type);
          if (index !== -1) bad.veh_type[index].count ++;
          else bad.veh_type = (bad.veh_type || []).concat([{ file, page, route, branch, veh_type, count: 1 }]);
        }
      });

      num_veh_fields.map(f => line[f]).forEach(num_veh => {
        if (num_veh != '' && parseFloat(num_veh) != num_veh) {
          const index = (bad.num_veh || []).findIndex(b => b.num_veh === num_veh);
          if (index !== -1) bad.num_veh[index].count ++;
          else bad.num_veh = (bad.num_veh || []).concat([{ file, page, route, branch, num_veh, count: 1 }]);
        }
      });

      interval_fields.map(f => line[f]).forEach(interval => {
        if (interval != '' && interval.split(' ').length != 2) {
          const index = (bad.interval || []).findIndex(b => b.interval === interval);
          if (index !== -1) bad.interval[index].count ++;
          else bad.interval = (bad.interval || []).concat([{ file, page, route, branch, interval, count: 1 }]);
        }
      });

      run_time_fields.map(f => line[f]).forEach(run_time => {
        if (run_time != '' && parseInt(run_time) != run_time) {
          const index = (bad.run_time || []).findIndex(b => b.run_time === run_time);
          if (index !== -1) bad.run_time[index].count ++;
          else bad.run_time = (bad.run_time || []).concat([{ file, page, route, branch, run_time, count: 1 }]);
        }
      });

      term_time_fields.map(f => line[f]).forEach(term_time => {
        if (term_time != '' && parseInt(term_time) != term_time) {
          const index = (bad.term_time || []).findIndex(b => b.term_time === term_time);
          if (index !== -1) bad.term_time[index].count ++;
          else bad.term_time = (bad.term_time || []).concat([{ file, page, route, branch, term_time, count: 1 }]);
        }
      });

      avg_spd_fields.map(f => line[f]).forEach(avg_spd => {
        if (avg_spd != '' && parseFloat(avg_spd) != avg_spd) {
          const index = (bad.avg_spd || []).findIndex(b => b.avg_spd === avg_spd);
          if (index !== -1) bad.avg_spd[index].count ++;
          else bad.avg_spd = (bad.avg_spd || []).concat([{ file, page, route, branch, avg_spd, count: 1 }]);
        }
      });

      // break;
    }

    filesProcessed++;
    // break;

    // console.log({ header, veh_type, num_veh, interval, run_time, term_time, avg_spd });
  }
  // console.log(Object.keys(bad))

  Object.entries(bad).forEach(([key, values]) => {
    console.log({
      // bad: key,
      // first10: bad[key].slice(0, 10).map(v => v[key]),
      [key]: bad[key].map(v => `file ${v.file} page ${v.page} - ${v[key]}`),
      // count: values.length
    });
  });
  // console.log(Object.entries(bad).map(([key, value]) => ([key, value.length])));

  console.log(`processed ${filesProcessed} of ${allFiles.length} files`);

})();
