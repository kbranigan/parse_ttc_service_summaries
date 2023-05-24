#!/usr/bin/env node

/*
remaining problems:
- not parsing or using notes such as:
  - Until 11pm
  - Every 3rd blah operates as blah
  - 99 Arrow Rd has 3 different start times, the first start time is actually BEFORE the branch name
  - lots of notes are associated to the wrong branch because the note is above the target branch
  - Combined/Average and Gap Trains are poorly represented, but maybe that's ok
*/

const fs = require("fs");
const util = require("util");
const assert = require("assert");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");

const debug = false;
const START_PAGE = 1;
const pdfPath = 'service_summaries/';
// const pdfPath = '/Users/kevin/Documents/ttc/'; 
// const pdfFile = 'service_summary_2022_06_19.pdf';
const allFiles = ['service_summary_2008_03_30.pdf','service_summary_2008_06_22.pdf','service_summary_2008_08_31.pdf','service_summary_2008_11_23.pdf','service_summary_2009_01_04.pdf','service_summary_2009_02_15.pdf','service_summary_2009_05_10.pdf','service_summary_2009_06_21-v2.pdf','service_summary_2009_09_06.pdf','service_summary_2009_10_18-rev.pdf','service_summary_2009_11_22.pdf','service_summary_2010_01_03.pdf','service_summary_2010_03_28_v2.pdf','service_summary_2010_05_09.pdf','service_summary_2010_06_20.pdf','service_summary_2010_09_05.pdf','service_summary_2010_10_10.pdf','service_summary_2010_11_21.pdf','service_summary_2011_01_02.pdf','service_summary_2011_03_27_rev_2.pdf','service_summary_2011_05_08.pdf','service_summary_2011_06_19.pdf','service_summary_2011_09_04.pdf','service_summary_2011_10_09.pdf','service_summary_2012_01_08.pdf','service_summary_2012_02_12.pdf','service_summary_2012_03_25.pdf','service_summary_2012_05_06.pdf','service_summary_2012_06_17.pdf','service_summary_2012_07_29.pdf','service_summary_2012_09_02.pdf','service_summary_2012_10_07.pdf','service_summary_2012_11_18.pdf','service_summary_2013_01_06.pdf','service_summary_2013_03_31.pdf','service_summary_2013_05_12.pdf','service_summary_2013_06_23.pdf','service_summary_2013_09_01.pdf','service_summary_2013_10_13.pdf','service_summary_2013_11_24.pdf','service_summary_2014_01_05.pdf','service_summary_2014_03_30.pdf','service_summary_2014_05_11.pdf','service_summary_2014_06_22.pdf','service_summary_2014_07_20.pdf','service_summary_2014_08_31.pdf','service_summary_2014_10_12.pdf','service_summary_2014_11_23.pdf','service_summary_2015_01_04.pdf','service_summary_2015_02_15.pdf','service_summary_2015_03_29.pdf','service_summary_2015_05_10.pdf','service_summary_2015_06_21.pdf','service_summary_2015_09_06.pdf','service_summary_2015_10_11.pdf','service_summary_2015_11_22.pdf','service_summary_2016_01_03.pdf','service_summary_2016_02_14.pdf','service_summary_2016_03_27.pdf','service_summary_2016_05_08.pdf','service_summary_2016_06_19.pdf','service_summary_2016_07_31.pdf','service_summary_2016_09_04.pdf','service_summary_2016_10_09.pdf','service_summary_2016_11_20.pdf','service_summary_2017_01_08.pdf','service_summary_2017_02_12.pdf','service_summary_2017_03_26.pdf','service_summary_2017_05_07.pdf','service_summary_2017_06_18.pdf','service_summary_2017_07_30.pdf','service_summary_2017_09_03.pdf','service_summary_2017_10_15.pdf','service_summary_2017_11_26.pdf','service_summary_2018_01_07.pdf','service_summary_2018_02_18.pdf','service_summary_2018_04_01.pdf','service_summary_2018_05_13.pdf','service_summary_2018_06_24.pdf','service_summary_2018_09_02.pdf','service_summary_2018_10_07.pdf','service_summary_2018_11_18.pdf','service_summary_2019_01_06.pdf','service_summary_2019_02_17.pdf','service_summary_2019_03_31.pdf','service_summary_2019_05_12.pdf','service_summary_2019_06_23.pdf','service_summary_2019_08_04.pdf','service_summary_2019_09_01.pdf','service_summary_2019_10_13.pdf','service_summary_2019_11_24.pdf','service_summary_2020_01_05.pdf','service_summary_2020_02_16.pdf','service_summary_2020_03_29.pdf','service_summary_2020_06_21.pdf','service_summary_2020_10_11.pdf','service_summary_2020_11_22.pdf','service_summary_2021_01_03.pdf','service_summary_2021_02_14.pdf','service_summary_2021_03_28.pdf','service_summary_2021_05_09.pdf','service_summary_2021_06_20.pdf','service_summary_2021_08_01.pdf','service_summary_2021_09_05.pdf','service_summary_2021_10_10.pdf','service_summary_2021_11_21.pdf','service_summary_2022_01_02.pdf','service_summary_2022_02_13.pdf','service_summary_2022_03_27.pdf','service_summary_2022_05_08.pdf','service_summary_2022_06_19.pdf','service_summary_2022_07_31.pdf','service_summary_2022_09_04.pdf','service_summary_2022_11_20.pdf','service_summary_2023_01_08.pdf','service_summary_2023_02_12.pdf','service_summary_2023_03_26.pdf','service_summary_2023_05_07.pdf'];

// const allFiles = ['service_summary_2021_10_10.pdf'];

// {
//   filename: 'service_summary_2021_10_10.pdf',
//   pageNum: 15,
//   branch: { y: 103, h: 5, str: '22A Coxwell Stn – Victoria Park' },
//   route: { y: 86, h: 5, str: '22 COXWELL' },
//   service: { y: 94, h: 5, str: 'Monday to Friday' },
//   yard: undefined,
//   last_change: { y: 94, h: 4, str: '12-Oct-21' },
//   rt_distance: { y: 102, h: 4, str: '11.34' }
// }


const yards = {
  "Arw": "Arrow Road", "Bir": "Birchmount", "DanSub": "Danforth Subway", "Egl": "Eglinton",
  "GrnSub": "Greenwood Subway", "Les": "Leslie", "Mal": "Malvern", "McN": "McNicoll",
  "MtD": "Mount Dennis", "Qsy": "Queensway", "Ron": "Roncesvalles", "Rus": "Russell",
  "WilSub": "Wilson Subway", "W-T": "Wheel-Trans", "Wil": "Wilson Bus"
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

const subServiceTitles = [
  'Monday-Friday morning peak period',
  'Monday-Friday midday',
  'Monday-Friday afternoon peak period',
  'Monday-Friday early evening',
  'Monday-Friday late evening',
  'Saturday early morning',
  'Saturday morning',
  'Saturday afternoon',
  'Saturday early evening',
  'Saturday late evening',
  'Sunday early morning',
  'Sunday morning',
  'Sunday afternoon',
  'Sunday early evening', // 'Sunday evening',
  'Sunday late evening',
  'Departure times'
];

const text_to_skip = [
  'Route',
  'RAPID TRANSIT SERVICES',
  'STREETCAR SERVICES',
  'OVERNIGHT STREETCAR SERVICES',
  'BUS SERVICES',
  'EXPRESS BUS SERVICES',
  'OVERNIGHT BUS SERVICES',
  'COMMUNITY BUS SERVICES',
  'COMMUNITY BUS',
  'COMMUNITY LINK',
  ...subServiceTitles,
  'Sunday evening',
  'Saturday early evening',
  'Monday-Friday overnight',
  'Saturday overnight',
  'Sunday overnight',
  'Monday, Wednesday, and Thursday midday',
  'Mon., Wed., and Thur. afternoon peak period',
  'Tuesday and Friday midday',
  'Tuesday and Friday afternoon peak period',
  'Temporarily Suspended.',
  'Temporarily suspended.',
  'Temporarily Suspended',
  'Gap Trains',
];

const text_to_replace = {
  'Overnight, 7 days a week': 'Overnight - 7 days a week',
  'Overnight, Monday to Friday': 'Overnight - Monday to Friday',
  'Overnight, Saturday': 'Overnight - Saturday',
  'Overnight, Sunday': 'Overnight - Sunday',
};

const skip_page_strings = [
  'Data compiled by the Service Planning and Scheduling Department',
  'Introduction',
  'Quick Reference',
  'All-Day, Every Day¹',
  'SERVICE SUMMARY – Introduction',
];

const end_of_document_strings = [
  'Summary of vehicles and trains in service',
];

const testCollideX = (a, b) => {
  return a.x <= b.x + b.w && a.x + a.w >= b.x;
}

const testCollideY = (a, b) => {
  return a.y <= b.y + b.h && a.y + a.h >= b.y;
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

const parseFile = async (filename) => {

  let skippedText = [];
  const notes = [];
  const csvrows = [];

  const data = new Uint8Array(fs.readFileSync(pdfPath + filename));
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
  const numPages = doc.numPages;
  console.log({ filename, numPages });
  let done = false;

  for (let pageNum = START_PAGE; pageNum <= numPages; pageNum++) {
    if (done) break;
    // if (pageNum != 58) continue; // kbfu
    // if (pageNum > 56) continue;

    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    let column_header_cells = [];
    let row_header_cells = [];
    const data_cells = [];
    const columns = [];
    let skipPage = false;

    let states = {};
    const fields = [ 'route', 'branch', 'service', 'yard', 'last_change', 'rt_distance' ];
    fields.forEach(field => states[field] = []);

    const states_at = (cell) => {
      const branch = states.branch.find(column => testCollideY(column, cell));
      return {
        route: states.route.filter(s => s.y <= cell.y + cell.h / 2.).sort((a,b) => a.y > b.y).pop(),
        branch: branch || states.branch.filter(s => s.y <= cell.y + cell.h / 2.).sort((a,b) => a.y > b.y).pop(),
        service: states.service.filter(s => s.y <= cell.y + cell.h / 2.).sort((a,b) => a.y > b.y).pop(),
        yard: states.yard.filter(s => s.y <= cell.y + cell.h / 2.).sort((a,b) => a.y > b.y).pop(),
        last_change: states.last_change.filter(s => s.y <= cell.y + cell.h / 2.).sort((a,b) => a.y > b.y).pop(),
        rt_distance: states.rt_distance.filter(s => s.y <= cell.y + cell.h / 2.).sort((a,b) => a.y > b.y).pop(),
      };
    }

    if (textContent.items.length < 20) continue;

    // console.log({ pageNum, numItems: textContent.items.length });

    for (var j = 0 ; j < textContent.items.length ; j++) {
      const textItem = textContent.items[j];
      let { str } = textItem;

      if (str === '' || str === ' ' || str === '–' || str.slice(0, 5) == 'Page ') continue;
      // if (j < 20) {
      //   console.log({ j, str });
      // }

      if (text_to_skip.includes(str)) continue;
      if (text_to_replace[str] != null) str = text_to_replace[str];

      let { x, y, w, h } = getCoords(viewport, textItem);

      if (skip_page_strings.includes(str)) {
        skipPage = true;
        break;
      }

      if (end_of_document_strings.includes(str)) {
        done = true;
        break;
      }

      const prevRoute  = states.route[states.route.length - 1];
      const prevBranch = states.branch[states.branch.length - 1];
      const prevYard   = states.yard[states.yard.length - 1];

      if (y > 80) { // not the header
        if (x < 50) { // first column, routes / services / branches
          if (str.replace('McCOWAN', 'MCCOWAN') === str.toUpperCase() && parseInt(str)) { // all caps, starts with number
            states.route.push({ y, h, str });
          } else if (prevRoute && prevRoute.str.slice(-1) === '/') {
            prevRoute.str += ` ${str}`; prevRoute.h = y + h - prevRoute.y;
          } else if (['Monday to Friday', 'Saturday', 'Sunday'].includes(str) || str.slice(0, 9) === 'Overnight') { // it's a service
            states.service.push({ y, h, str });
          } else if (str === '301 Long Branch – Neville Park') {
            if (states.service.length === 0) states.service.push({ y: y - h, h, str: 'Overnight - 7 days a week' }); // a tasty exception
            if (states.last_change.length === 0) states.last_change.push({ y: y - h, h, str: '' }); // a tasty exception
            states.branch.push({ y, h, str });
          } else if (parseInt(str) && parseInt(str) === parseInt(prevRoute.str)) { // if line "parseInt" matches route "parseInt" then it's a branch
            states.branch.push({ y, h, str });
          } else if (str === 'GAP TRAINS') {
            states.branch.push({ y, h, str });
          } else if (prevBranch && prevBranch.str.slice(-1) === '–') { // if prev end in "-" then simply append to that
            prevBranch.str += ` ${str}`; prevBranch.h = y + h - prevBranch.y;
          } else if (prevBranch && prevBranch.str.slice(-4) === ' via') { // if prev end in "-" then simply append to that
            prevBranch.str += ` ${str}`; prevBranch.h = y + h - prevBranch.y;
          } else if (str.trim().slice(0, 7) === 'SB via ' || str.trim().slice(0, 4) === 'via ' || str.trim().slice(0, 2) === '– ') {
            prevBranch.str += ` ${str.trim()}`; prevBranch.h = y + h - prevBranch.y;
          } else {
            // console.log({ pageNum, x, y, a: str === str.toUpperCase(), b:parseInt(str) }, 'what: ' + str); // this should never console.log anything
          }
        } else if (x < 180) { // special things like 'Combined/Average'
          states.branch.push({ y, h, str });
        } else if (x < 210) { // last change, yard and round trip distance 'column'
          if (str.split('-').length === 3) {
            states.last_change.push({ y, h, str });
          } else if (parseFloat(str) == str) {
            states.rt_distance.push({ y, h, str });
          } else {
            if (states.yard.length > 0 && prevYard.str.slice(-1) == '/') {
              prevYard.str += str; prevYard.h = y + h - prevYard.y;
            } else {
              states.yard.push({ y, h, str });
            }

            if (!str.split('/').filter(yard => yard).map(yard => yards[yard] != undefined).every(yardExists => yardExists)) {
              console.log({ pageNum, one: str.split('/'), two: str.split('/').filter(yard => yard).map(yard => yards[yard] != undefined), msg: 'yard is weird', x, y, str });
            }
          }
        } else {
          str = str.replace('"', '').replace("'", '').replace("'", '').replace("'", '').replace('  ', ' ').trim();
          data_cells.push({ x, y, w, h, str });
        }
      } else if (x >= 210 && y > 50) { // header
        if (str === 'SERVICE SUMMARY') { // only happens at the end of the document
          done = true;
          break;
        }
        column_header_cells.push({ x, y, w, h, str });
      }
    }

    if (skipPage) continue;
    if (done) break;

    for (var j = 0 ; j < column_header_cells.length ; j++) {
      const cell = column_header_cells[j];

      column_header_cells[j].columns = [];
      columns.forEach((column, i) => {
        if (testCollideX(cell, column)) { // ([cell.x, cell.x + cell.w], [column.x, column.x + column.w])) {
          column_header_cells[j].columns.push(i);
          columns[i].rows[cell.y] = cell.str;
          columns[i].str = Object.values(columns[i].rows).join(' ');
        }
      });
      if (column_header_cells[j].columns.length === 0) {
        columns.push({id: columns.length, x: cell.x, w: cell.w, str: cell.str, rows: {[cell.y]: cell.str}});
        column_header_cells[j].columns = [columns.length - 1];
      }
    }

    for (var j = 0 ; j < data_cells.length ; j++) {
      const cell = data_cells[j];
      data_cells[j].columns = columns.filter(column => testCollideX(cell, column)).map(column => column.id);
      // data_cells[j].columns = columns.filter(column => testCollide([cell.x, cell.x + cell.w], [column.x, column.x + column.w])).map(column => column.id);
      if (data_cells[j].columns.length === 1) {
        data_cells[j].states = states_at(cell);
      }
    }

    if (columns.length === 0) {
      break;
    }

    if (columns.length !== 6 * 5 + 4) {
      console.log({pageNum, columns}, columns.length);
      asdf
    }

    assert(columns.length === 6 * 5 + 4);
    // console.log(data_cells.slice(5, 7));

    states.branch.every(branch => {
      let { route, service, yard, last_change, rt_distance } = states_at(branch);
      let csvrow;
      try {
        csvrow = [filename, pageNum, route.str, branch.str, service.str];
      } catch (err) {
        console.log({ filename, pageNum, branch, route, service, yard, last_change, rt_distance } );
        asdf
      }
      const row = data_cells.filter(cell => cell.states 
        && cell.states.branch === branch
        && cell.states.route === route
        && cell.states.service === service);
      // console.log({ branch, route, service, yard, last_change, rt_distance, row })
      if (row.length === 0) return true;
      try {
        csvrow.push((yard || {}).str, last_change.str, (rt_distance || {}).str);
      } catch (err) {
        console.log({ filename, pageNum, branch, route, service, yard, last_change, rt_distance } );
        asdf
      }
      for (var column = 0 ; column < 6 * 5 + 4 ; column++) {
        const cells = row.filter(cell => cell.columns.includes(column));
        cells.forEach(cell => cell.printed = true);
        if (cells.length == 0) {
          csvrow.push('');
        } else if (cells.length == 1) {
          csvrow.push(cells[0].str);
        } else {
          csvrow.push(cells.map(c => c.str).join(' '))
        }
      }
      csvrows.push(csvrow);
      return true;
    });

    const getSubService = (cell, states) => {
      if (states.service === undefined) return '';
      if (cell.columns.length > 1) {
        const distinctGroups = new Array(...new Set(cell.columns.map(column => `${Math.floor(column / 6)}`)));
        if (distinctGroups.length === 1) { // all inside one subservice
          let offset = parseInt(distinctGroups[0]);
          if (states.service.str.slice(0, 3) === 'Sat') offset += 5;
          if (states.service.str.slice(0, 3) === 'Sun') offset += 10;
          if (distinctGroups[0] == 5) offset = 15;
          return subServiceTitles[offset];
        }
        return '';
      } else {
        return '';
      }
    }

    data_cells.filter(cell => !cell.printed).forEach(cell => {
      const cellStates = states_at(cell);
      notes.push({
        pageNum,
        route: cellStates.route?.str || '',
        branch: cellStates.branch?.str || '',
        service: cellStates.service?.str || '',
        subservice: getSubService(cell, cellStates),
        // x: cell.x,
        // y: cell.y,
        // w: cell.w,
        str: cell.str
      });
    });

    const temp = new Array(...new Set(data_cells.filter(cell => !cell.printed).slice(0, 40).map(c => c.str))).sort();
    // if (temp.length == 0) {
    //   // console.log(`pageNum ${pageNum} is good`);
    // } else {
    skippedText = new Array(...new Set(skippedText), ...temp).sort();
    //   // console.log({ pageNum, skipped: data_cells.filter(cell => !cell.printed).slice(0, 40).map(c => c.str) })
    // }

    page.cleanup();
    // break;
    // if (pageNum  > 10) break;
  }

  let csvheader = 'file,page,route,branch,service,yard,last_change,rt_distance'
  for (var j = 0 ; j < 5 ; j++) {
    csvheader += ',veh_type,num_veh,interval,run_time,term_time,avg_spd';
  }
  csvheader += ',first_nb_wb,first_sb_eb,last_nb_wb,last_sb_eb';
  // console.log(csvheader);
  // console.log(csvrows.join('\n'));
  // console.log(notes.slice(0,2));

  if (notes.length > 0) {
    let notesheader = Object.keys(notes[0]);
    fs.writeFileSync('output/' + filename + '.notes.csv', Object.keys(notes[0]) + "\n" + notes.map(row => '"' + Object.values(row).map(cell => `${cell}`.replace('"', '\\"')).join('", "') + '"').join("\n"));
  }

  console.log(`${filename} - ${csvrows.length} csv lines, ${notes.length} notes`);
  fs.writeFileSync('output/' + filename + '.csv', csvheader + "\n" + csvrows.join("\n"));
  // fs.writeFileSync('output/' + filename + '.notes.csv', csvheader + "\n" + notes.join("\n"));

  // console.log(skippedText)
  // console.log(notes)

};

(async function () {
  console.log({ numFiles: allFiles.length });
  for (var i = 0 ; i < allFiles.length ; i++) {
    const filename = allFiles[i];
    console.log(filename);
    await parseFile(filename);
    // if (i > 2) break;
  }
})();

