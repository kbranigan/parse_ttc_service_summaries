#!/usr/bin/env node

const fs = require("fs");
const assert = require("assert");
const { allFiles, yards, vehicles, services, } = require("./vars");
const outputFolder = 'output';

const routes = {};
const last = (arr) => arr[arr.length - 1];

(async () => {
  for (var i = 0 ; i < allFiles.length ; i++) {
    const basename = allFiles[i];

    const filename = `${outputFolder}/${basename}.csv`;
    const data = new String(fs.readFileSync(filename));
    let lines = data.split('\n').map(line => line.split(','));
    const header = lines[0];

    // console.log(header);asdf
    lines = lines.slice(1);

    for (var j = 0 ; j < lines.length ; j++) {
      const line = lines[j];
      let [ fileName, pageNum, routeName, branchName, serviceName, yardName, last_change, rt_distance ] = line;

      if (parseInt(routeName) != 9) continue; // kbfu
      // if (parseInt(routeName) > 10) continue; // kbfu

      if (routes[routeName] === undefined) {
        routes[routeName] = {
          numLines: 0,
          branches: {},
        };
      }
      const route = routes[routeName];

      if (route.branches[branchName] === undefined) {
        route.branches[branchName] = {
          numLines: 0,
          services: {},
        };
      }
      const branch = route.branches[branchName];

      if (branch.services[serviceName] === undefined) {
        branch.services[serviceName] = {
          numLines: 0,
          changes: new Set(),
          distances: new Set(),
          subservices: [ {}, {}, {}, {}, {} ],
        };
      }
      const service = branch.services[serviceName];

      route.numLines++;
      branch.numLines++;
      service.numLines++;
      service.changes.add(last_change);
      service.distances.add(rt_distance);

      for (var column = 0 ; column < 5 ; column++) {
        const row = line.slice(8 + column * 6, 8 + (column + 1) * 6);
        const [ veh_type, num_veh, interval, run_time, term_time, avg_spd ] = row;
        const subservice = { veh_type, num_veh, interval, run_time, term_time, avg_spd, rt_distance, };
        const subserviceJSON = JSON.stringify(subservice);

        if (service.subservices[column][subserviceJSON] == undefined) {
          service.subservices[column][subserviceJSON] = { numLines: 0, rows: [] };
        }

        service.subservices[column][subserviceJSON].numLines++;
        service.subservices[column][subserviceJSON].rows.push({ fileName, pageNum, last_change });
      }
    }
  }

  const log = ['9 BELLAMY', '9 Warden Stn-Scarborough Centre Stn', 'Saturday', '0', 1];
  const firstSubServiceJSON = Object.keys(routes[log[0]].branches[log[1]].services[log[2]].subservices[log[3]])[log[4]];
  console.log({loggin: log, firstSubServiceJSON});
  console.log(routes[log[0]].branches[log[1]].services[log[2]].subservices[log[3]][firstSubServiceJSON]);
})();
