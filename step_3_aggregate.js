#!/usr/bin/env node

const fs = require("fs");
const assert = require("assert");
const { allFiles, yards, vehicles, services, } = require("./vars");
const outputFolder = 'output';

const routes = {};

(async () => {
  for (var i = 0 ; i < allFiles.length ; i++) {
    const basename = allFiles[i];

    const filename = `${outputFolder}/${basename}.csv`;
    const data = new String(fs.readFileSync(filename));
    let lines = data.split('\n').map(line => line.split(','));
    const header = lines[0];
    lines = lines.slice(1);

    for (var j = 0 ; j < lines.length ; j++) {
      const line = lines[j];
      let [ fileName, pageName, routeName, branchName, serviceName, yardName, last_change, rt_distance ] = line;

      // if (parseInt(routeName) != 6) continue; // kbfu
      if (parseInt(routeName) > 10) continue; // kbfu

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
        };
      }
      const service = branch.services[serviceName];

      route.numLines++;
      branch.numLines++;
      service.numLines++;
    }
  }

  // console.log(JSON.stringify(routes, false, 4));
  console.log(routes);
  // console.log(Object.keys(routes).sort((a, b) => parseInt(a) - parseInt(b)).map(k => `${k}: ${routes[k]}`).join('\n'));

})();
