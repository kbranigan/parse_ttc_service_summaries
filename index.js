#!/usr/bin/env node

const fs = require("fs");
const util = require("util");
const assert = require("assert");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");

const debug = true;
const START_PAGE = 5;
// const pdfPath = '/Users/kevin/Documents/ttc/service_summary_2008_03_30.pdf';
const pdfPath = '/Users/kevin/Documents/ttc/'; 
const pdfFile = 'service_summary_2022_06_19.pdf';
const data = new Uint8Array(fs.readFileSync(pdfPath + pdfFile));

const abbr = {
  "Arw": "Arrow Road",
  "Bir": "Birchmount",
  "DanSub": "Danforth Subway",
  "Egl": "Eglinton",
  "GrnSub": "Greenwood Subway",
  "Les": "Leslie/Russell",
  "Mal": "Malvern",
  "McN": "McNicoll",
  "MtD": "Mount Dennis",
  "Qsy": "Queensway",
  "Ron": "Roncesvalles",
  "Rus": "Russell/Leslie",
  "WilSub": "Wilson Subway",
  "W-T": "Wheel-Trans",
  "Wil": "Wilson Bus",
};

const vehicleNames = {
  "6carT": "Six-car train of T- or TR-series 23-metre subway cars (Lines 1 and 2)",
  "4carT": "Four-car train of TR-series 23-metre subway cars (Line 4)",
  "4carS": "Four-car train of S-series 13-metre subway cars (Line 3)",
  "LFsc": "30-metre low-floor streetcar (Bombardier Flexity)",
  "Bus": "12-metre bus (Orion VII, Nova LFS)",
  "ABus": "18-metre articulated bus (Nova LFS Artic)",
  "CB": "8-metre Community Bus (Friendly Bus)",
  "WT": "8-metre Wheel-Trans bus (Friendly Bus, ProMaster)",
}

const loadingTask = pdfjsLib.getDocument({ data });

const testCollide = (a, b) => {
  const [min_a, max_a] = a;
  const [min_b, max_b] = b;
  return min_a <= max_b && max_a >= min_b;
}

const getCoords = (viewport, item) => {
  const p = pdfjsLib.Util.transform(
    pdfjsLib.Util.transform(viewport.transform, item.transform),
    [1, 0, 0, -1, 0, 0]
  );
  return {
    x: Math.floor(p[4]),
    y: Math.floor(p[5]),
    w: Math.floor(item.width),
    h: Math.floor(item.height)
  };
}

const combineColumns = (a, b) => ({ x: a.x, w: b.x + b.w - a.x });
const combineRows = (a, b) => ({ y: a.y, h: b.y + b.h - a.y });
const combineCoords = (a, b) => ({ ...combineColumns(a, b), ...combineRows(a, b) });

(async function () {

  let csvheader = 'file,page,route,branch,service,yard,last_change,rt_distance'
  for (var j = 0 ; j < 5 ; j++) {
    csvheader += ',veh_type,num_veh,interval,run_time,term_time,avg_spd';
  }
  console.log(csvheader);

  const doc = await loadingTask.promise;
  const numPages = doc.numPages;
  if (debug) console.log(`Number of Pages: ${numPages}`);
  let done = false;

  const skipped = [];

  for (let pageNum = START_PAGE; pageNum <= numPages; pageNum++) {
    if (done) break;
    // if (pageNum != 11) continue; // kbfu
    if (pageNum != 20) continue;

    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    let column_header_cells = [];
    let row_header_cells = [];
    const data_cells = [];

    const routes = [];
    let states = {
      routes: [],
      branches: [],
      services: [],
      yards: [],
      last_changes: [],
      rt_distances: [],
    };

    for (var j = 0 ; j < textContent.items.length ; j++) {

      const textItem = textContent.items[j];
      let { str } = textItem;
      if (str === '' || str === ' ' || str.slice(0, 5) == 'Page ') { skipped.push(str); continue; }

      let {x,y,w,h} = getCoords(viewport, textItem);

      const bits = str.split(' ');
      if (x < 50 && bits.length > 1 && parseInt(bits[0]) == bits[0] && parseInt(bits[1]) != bits[1] && str.toUpperCase() === str) {
        let route = str.trim();
        if (route.substr(-9) === 'DOWNTOWN/') { // && textContent.items[j+1].str == '') {
          for (var i = 1 ; i < 5 ; i++) {
            if (textContent.items[j+i].str.slice(-7) === 'EXPRESS') {
               const p = getCoords(viewport, textContent.items[j+i]);
               route += textContent.items[j+i].str.trim();
               const newCoord = combineRows({y, h}, p);
               h = newCoord.h;
               break;
            }
          }
          if (route === str.trim()) {
            console.log({ states, jerks: textContent.items.slice(j,j+5).map(i=>i.str) });
          }
        }
        if (debug) console.log(`route ${route} at ${y}`);
        states.routes.push({ y, str: route });
        row_header_cells.push({ x, y, w, h, str:route });
        continue;
      }

      if (y < 45) { skipped.push(str); continue; } // ignore top-top header

      if (str.slice(-6) == 'period') { skipped.push(str); continue; }
      if (str.slice(-6) == 'midday') { skipped.push(str); continue; }
      if (str.slice(-7) == 'morning') { skipped.push(str); continue; }
      if (str.slice(-7) == 'evening') { skipped.push(str); continue; }
      if (str.slice(-9) == 'afternoon') { skipped.push(str); continue; }
      if (str.slice(-9) == 'overnight') { skipped.push(str); continue; }
      if (str === 'RAPID TRANSIT SERVICES') { skipped.push(str); continue; }
      if (str === 'STREETCAR SERVICES') { skipped.push(str); continue; }
      if (str === 'OVERNIGHT STREETCAR SERVICES') { skipped.push(str); continue; }
      if (str === 'BUS SERVICES') { skipped.push(str); continue; }
      if (str === 'EXPRESS BUS SERVICES') { skipped.push(str); continue; }
      if (str === 'OVERNIGHT BUS SERVICES') { skipped.push(str); continue; }
      if (str === 'COMMUNITY BUS SERVICES') { skipped.push(str); continue; }
      if (str === 'Combined/Average') { skipped.push(str); continue; } // kbfu this is likely important information
      if (str === 'Italicised branch names are for internal use only.') { skipped.push(str); continue; }
      if (str === 'Service operating on temporary route structure.') { skipped.push(str); continue; }
      if (str === '7 days a week') { skipped.push(str); continue; }
      if (str === 'Overnight') { skipped.push(str); continue; }
      if (str === '75A branch name is for internal use only.') { skipped.push(str); continue; }
      if (str === '') { skipped.push(str); continue; }
      if (str === '') { skipped.push(str); continue; }
      if (str === '') { skipped.push(str); continue; }

      if (x < 180 && (str.slice(0, 4) === 'via ' || str[0] === '–')) {
        const newCoord = combineRows(row_header_cells[row_header_cells.length - 1], {y, h});
        row_header_cells[row_header_cells.length - 1].y = newCoord.y;
        row_header_cells[row_header_cells.length - 1].h = newCoord.h;
        row_header_cells[row_header_cells.length - 1].str += ` ${str}`;
        states.branches[states.branches.length - 1].str += ` ${str}`;
        if (debug) console.log(`route append ${str} at ${y}`);
        continue;
      }

      if (abbr[str] != undefined && x > 150 && x < 250) {
        states.yards.push({ y, str });
        if (debug) console.log(`  yard becomes ${str} at ${y}`);
        continue;
      }

      if (str === 'Summary of vehicles and trains in service') { // this is on the first page after vehicle service summaries
        done = true;
        break;
      }

      if (str.slice(0, 18) === 'Overnight service ') { skipped.push(str); continue; }
      if (str.slice(0, 10) === 'Temporary S') { skipped.push(str); continue; }
      if (str.slice(0, 12) === 'Temporarily S') { skipped.push(str); continue; }
      if (str.slice(0, 10) === 'Gap Trains') { skipped.push(str); continue; }
      if (str.slice(0, 7) === 'Tripper') { skipped.push(str); continue; }
      if (str.slice(0, 18) === 'Additional running') { skipped.push(str); continue; }
      if (str.slice(0, 17) === 'Express service p') { skipped.push(str); continue; }
      if (str.slice(0, 17) === 'Seasonal service ') { skipped.push(str); continue; }
      if (str.slice(0, 6) === 'Until ') { skipped.push(str); continue; }
      if (str.slice(0, 6) === 'After ') { skipped.push(str); continue; }
      if (str.slice(0, 4) === 'See ') { skipped.push(str); continue; }
      if (str.slice(0, 6) === 'Every ') { skipped.push(str); continue; }

      if (w > 150) { skipped.push(str); continue; } // { console.log(`Skipping Long String: ${str}`); continue; }
      // if (x > 150) continue; // only the left big column

      if (x < 50 && str === 'Monday to Friday' || str === 'Saturday' || str === 'Sunday') {
        states.services.push({ y, str });
        if (debug) console.log(`  service becomes ${str} at ${y}`);
      }

      if (y < 80) {
        column_header_cells.push({ x, y, w, h, str });
      } else if (x < 180) {
        if (!(str === 'Monday to Friday' || str === 'Saturday' || str === 'Sunday') 
          && states.routes[states.routes.length - 1].str.split('/')[1] !== str) {
          states.branches.push({ y, str });
          if (debug) console.log(`    branch becomes ${str} at ${y}`);
          row_header_cells.push({ x, y, w, h, str });
        }
      } else {
        data_cells.push({ x, y, w, h, str });
      }
    }
    if (done) break;

    // console.log(`column_header_cells.length = ${column_header_cells.length}`);
    // console.log(`row_header_cells.length = ${row_header_cells.length}`);
    // console.log(`data_cells.length = ${data_cells.length}`);

    // row_header_cells = data_cells.filter(c => c.x < 180);
    const to_delete = row_header_cells.map((c, i) => c.str.slice(-1) === '–');
    row_header_cells = row_header_cells.map((c, i) => to_delete[i] ? {...c, ...{ str: c.str + ' ' + row_header_cells[i+1].str }} : c);
    row_header_cells = row_header_cells.filter((c, i) => !to_delete[i-1]);

    const columns = [];
    for (var j = 0 ; j < column_header_cells.length ; j++) {
      const cell = column_header_cells[j];

      column_header_cells[j].columns = [];
      columns.forEach((column, i) => {
        if (testCollide([cell.x, cell.x + cell.w], [column.x, column.x + column.w])) {
          column_header_cells[j].columns.push(i);
          columns[i].rows[cell.y] = cell.str;
          columns[i].str = Object.values(columns[i].rows).join(' ');
        }
      });
      if (column_header_cells[j].columns.length === 0) {
        columns.push({x: cell.x, w: cell.w, str: cell.str, rows: {[cell.y]: cell.str}});
        column_header_cells[j].columns = [columns.length - 1];
      }
    }
    assert(columns.length === 36);
    assert(columns[2].str === 'Veh type');
    assert(columns[8].str === 'Veh type');
    assert(columns[14].str === 'Veh type');
    assert(columns[20].str === 'Veh type');
    assert(columns[26].str === 'Veh type');

    const superColumns = [
      combineColumns(columns[0], columns[1]),
      combineColumns(columns[2], columns[7]),
      combineColumns(columns[8], columns[13]),
      combineColumns(columns[14], columns[19]),
      combineColumns(columns[20], columns[25]),
      combineColumns(columns[26], columns[31]),
      combineColumns(columns[32], columns[33]),
      combineColumns(columns[34], columns[35]),
    ];

    let rows = [];
    for (var j = 0 ; j < row_header_cells.length ; j++) {
      const cell = row_header_cells[j];

      row_header_cells[j].rows = [];
      rows.forEach((column, i) => {
        if (column == null) return;
        if (testCollide([cell.y, cell.y + cell.h], [column.y, column.y + column.h])) {
          row_header_cells[j].rows.push(i);
          rows[i].columns[row.x] = row.str; // .push({x: cell.x, str: cell.str});
        }
      });
      if (row_header_cells[j].rows.length === 0) {
        rows.push({y: cell.y, h: cell.h, columns: {[cell.x]: cell.str}});
        row_header_cells[j].rows = [rows.length - 1];
      }
    }
    // console.log(row_header_cells.map(c => c.str));
    // console.log(rows.slice(0, 3));
    // console.log(vehicles);

    // console.log(row_header_cells.length, row_header_cells.map(c => c.str));
    // console.log(rows.slice(0, 5))

    for (var j = 0 ; j < data_cells.length ; j++) {
      const cell = data_cells[j];

      data_cells[j].row = rows.findIndex(row => testCollide([cell.y, cell.y + cell.h], [row.y, row.y + row.h]));
      if (data_cells[j].row == -1) {
        // console.log(cell);
        // console.log(row_header_cells.findIndex(row => testCollide([cell.y, cell.y + cell.h], [row.y, row.y + row.h])));
      }
      data_cells[j].column = columns.findIndex(column => testCollide([cell.x, cell.x + cell.w], [column.x, column.x + column.w]));
      data_cells[j].superColumn = superColumns.findIndex(column => testCollide([cell.x, cell.x + cell.w], [column.x, column.x + column.w]));
    }

    // console.log(data_cells.filter(c => c.str === '632p'));
    // console.log(data_cells.filter(c => c.row === -1).length);

    for (var j = 0 ; j < data_cells.length ; j++) {
      const cell = data_cells[j];

      const bits = cell.str.split('-');
      if (cell.superColumn === 0 && bits.length === 3) { // "last change"
        bits[2] = `20${bits[2]}`;
        cell.str = new Date(bits.join(' ')).toISOString().slice(0, 10);
        states.last_changes.push({y: cell.y, str: cell.str});
      } else if (cell.superColumn === 0) {

        states.rt_distances.push({y: cell.y, str: cell.str});
        // console.log(cell.y, cell.str);
      } else if ([4, 10, 16, 22, 28].includes(cell.column)) {
        const bit = cell.str.slice(0, 3);
        if (!['Mon','Sat','Sun'].includes(bit)) {
          if (isNaN(parseInt(cell.str))) {
            console.log(cell.str);
            asdf
          }
          // cell.str = (parseInt(cell.str.split(" ' ")[0]) + (parseInt(cell.str.split(" ' ")[1]) / 60.).toFixed(2)).toString();
        }
      }
    }

    const states_at = (y) => ({
      route: states.routes.filter(s => s.y <= y).sort((a,b) => a.y > b.y).pop().str,
      branch: states.branches.filter(s => s.y <= y).sort((a,b) => a.y > b.y).pop()?.str,
      service: states.services.filter(s => s.y <= y).sort((a,b) => a.y > b.y).pop()?.str,
      yard: states.yards.filter(s => s.y <= y).sort((a,b) => a.y > b.y).pop()?.str,
      last_change: states.last_changes.filter(s => s.y <= y).sort((a,b) => a.y > b.y).pop()?.str,
      rt_distance: states.rt_distances.filter(s => s.y <= y).sort((a,b) => a.y > b.y).pop()?.str,
    });

    for (var j = 0 ; j < rows.length ; j++) {

      let csvrow = [];
      for (var k = 2 ; k < columns.length ; k++) {
        const cells = data_cells.filter(c => c.row == j && c.column == k);
        let str = cells.map(c => c.str).join(' ');
        if (str.slice(0, 4) === 'Temp') str = '';
        
        csvrow.push(str.trim());
        // break;
      }

      if (csvrow.filter(c=>c != '').length === 0) {
        // console.log(`skipping row ${j}`);
        continue;
      }

      const currentState = states_at(rows[j].y);
      csvrow = [
        pdfFile,
        pageNum,
        currentState.route,
        currentState.branch,
        currentState.service,
        currentState.yard,
        currentState.last_change,
        currentState.rt_distance
      ].concat(csvrow);

      console.log(csvrow.join(','));
    }

    page.cleanup();
    // if (pageNum > 4) break; // kbfu
  }

})();

