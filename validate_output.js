#!/usr/bin/env node

const fs = require("fs");
const assert = require("assert");
const { allFiles, yards, vehicles, } = require("./vars");
const outputFolder = 'output';

(async () => {

  let routes = {};
  let branches = {};

  for (var i = 0 ; i < allFiles.length ; i++) {
    const basename = allFiles[i];

    const filename = `${outputFolder}/${basename}.csv`;
    const data = new String(fs.readFileSync(filename));
    const lines = data.split('\n').map(line => line.split(','));
    const header = lines[0];

    if (lines.length < 10) console.log({ filename, 'lines.length': lines.length });

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
      const veh_type = veh_type_fields.map(f => line[f]).map(v => Object.keys(vehicles).includes(v));
      const num_veh = num_veh_fields.map(f => line[f]).map(v => parseInt(v) == v);
      const interval = interval_fields.map(f => line[f]).map(v => v.split(' ').every(k => parseInt) && v.split(' ').length === 2);
      const run_time = run_time_fields.map(f => line[f]).map(v => parseInt(v) == v);
      const term_time = term_time_fields.map(f => line[f]).map(v => parseInt(v) == v);
      const avg_spd = avg_spd_fields.map(f => line[f]).map(v => parseFloat(v) == v);

      console.log({
        file,
        page,
        route,
        branch,
        service,
        yard,
        last_change,
        rt_distance,
        veh_type,
        num_veh,
        interval,
        run_time,
        term_time,
        avg_spd,
      });
      break;
    }

    // console.log({ header, veh_type, num_veh, interval, run_time, term_time, avg_spd });
    break;
  }

  console.log(`checked ${allFiles.length} files`);

})();
