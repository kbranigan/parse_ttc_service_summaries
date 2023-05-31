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
const allFiles = [
  // 'service_summary_2008_03_30.pdf','service_summary_2008_06_22.pdf','service_summary_2008_08_31.pdf','service_summary_2008_11_23.pdf',
  // 'service_summary_2009_01_04.pdf','service_summary_2009_02_15.pdf','service_summary_2009_05_10.pdf','service_summary_2009_06_21-v2.pdf','service_summary_2009_09_06.pdf','service_summary_2009_10_18-rev.pdf','service_summary_2009_11_22.pdf',
  // 'service_summary_2010_01_03.pdf','service_summary_2010_03_28_v2.pdf','service_summary_2010_05_09.pdf','service_summary_2010_06_20.pdf','service_summary_2010_09_05.pdf','service_summary_2010_10_10.pdf','service_summary_2010_11_21.pdf',
  // 'service_summary_2011_01_02.pdf','service_summary_2011_03_27_rev_2.pdf','service_summary_2011_05_08.pdf',
  // // 'service_summary_2011_06_19.pdf', // this file is super fucked
  // 'service_summary_2011_09_04.pdf','service_summary_2011_10_09.pdf',
  // 'service_summary_2012_01_08.pdf','service_summary_2012_02_12.pdf','service_summary_2012_03_25.pdf','service_summary_2012_05_06.pdf','service_summary_2012_06_17.pdf','service_summary_2012_07_29.pdf','service_summary_2012_09_02.pdf','service_summary_2012_10_07.pdf','service_summary_2012_11_18.pdf',
  // "GOOD" as of May 28 2023    
  'service_summary_2013_01_06.pdf','service_summary_2013_03_31.pdf','service_summary_2013_05_12.pdf','service_summary_2013_06_23.pdf','service_summary_2013_09_01.pdf','service_summary_2013_10_13.pdf','service_summary_2013_11_24.pdf',
  // 'service_summary_2014_01_05.pdf','service_summary_2014_03_30.pdf','service_summary_2014_05_11.pdf','service_summary_2014_06_22.pdf','service_summary_2014_07_20.pdf','service_summary_2014_08_31.pdf','service_summary_2014_10_12.pdf','service_summary_2014_11_23.pdf',
  // 'service_summary_2015_01_04.pdf','service_summary_2015_02_15.pdf','service_summary_2015_03_29.pdf','service_summary_2015_05_10.pdf','service_summary_2015_06_21.pdf','service_summary_2015_09_06.pdf','service_summary_2015_10_11.pdf','service_summary_2015_11_22.pdf',
  // 'service_summary_2016_01_03.pdf','service_summary_2016_02_14.pdf','service_summary_2016_03_27.pdf','service_summary_2016_05_08.pdf','service_summary_2016_06_19.pdf','service_summary_2016_07_31.pdf','service_summary_2016_09_04.pdf','service_summary_2016_10_09.pdf','service_summary_2016_11_20.pdf',
  // 'service_summary_2017_01_08.pdf','service_summary_2017_02_12.pdf','service_summary_2017_03_26.pdf','service_summary_2017_05_07.pdf','service_summary_2017_06_18.pdf','service_summary_2017_07_30.pdf','service_summary_2017_09_03.pdf','service_summary_2017_10_15.pdf','service_summary_2017_11_26.pdf',
  // 'service_summary_2018_01_07.pdf','service_summary_2018_02_18.pdf','service_summary_2018_04_01.pdf','service_summary_2018_05_13.pdf','service_summary_2018_06_24.pdf','service_summary_2018_09_02.pdf','service_summary_2018_10_07.pdf','service_summary_2018_11_18.pdf',
  // 'service_summary_2019_01_06.pdf','service_summary_2019_02_17.pdf','service_summary_2019_03_31.pdf','service_summary_2019_05_12.pdf','service_summary_2019_06_23.pdf','service_summary_2019_08_04.pdf','service_summary_2019_09_01.pdf','service_summary_2019_10_13.pdf','service_summary_2019_11_24.pdf',
  // 'service_summary_2020_01_05.pdf','service_summary_2020_02_16.pdf','service_summary_2020_03_29.pdf','service_summary_2020_06_21.pdf','service_summary_2020_10_11.pdf','service_summary_2020_11_22.pdf',
  // 'service_summary_2021_01_03.pdf','service_summary_2021_02_14.pdf','service_summary_2021_03_28.pdf','service_summary_2021_05_09.pdf','service_summary_2021_06_20.pdf','service_summary_2021_08_01.pdf','service_summary_2021_09_05.pdf','service_summary_2021_10_10.pdf','service_summary_2021_11_21.pdf',
  // 'service_summary_2022_01_02.pdf','service_summary_2022_02_13.pdf','service_summary_2022_03_27.pdf','service_summary_2022_05_08.pdf','service_summary_2022_06_19.pdf','service_summary_2022_07_31.pdf','service_summary_2022_09_04.pdf','service_summary_2022_11_20.pdf',
  // 'service_summary_2023_01_08.pdf','service_summary_2023_02_12.pdf','service_summary_2023_03_26.pdf','service_summary_2023_05_07.pdf'
];

// const allFiles = ['service_summary_2021_10_10.pdf'];

// {
//   filename: 'service_summary_2021_10_10.pdf',
//   pageNum: 15,
//   branch: { y: 103, h: 5, str: '22A Coxwell Stn - Victoria Park' },
//   route: { y: 86, h: 5, str: '22 COXWELL' },
//   service: { y: 94, h: 5, str: 'Monday to Friday' },
//   yard: undefined,
//   last_change: { y: 94, h: 4, str: '12-Oct-21' },
//   rt_distance: { y: 102, h: 4, str: '11.34' }
// }


const yards = {
  "Arr": "Arror Road", // probably
  "Arrow": "Arror Road", // service_summary_2012_06_17 page 8
  "Qswy": "Queensway", // service_summary_2012_06_17 page 8
  "sy": "Queensway", // service_summary_2012_06_17 page 50
  "Hill": "Hillcrest", // probably
  "Arw": "Arrow Road", "Bir": "Birchmount", "DanSub": "Danforth Subway", "Egl": "Eglinton",
  "GrnSub": "Greenwood Subway", "Les": "Leslie", "Mal": "Malvern", "McN": "McNicoll",
  "MtD": "Mount Dennis", "Qsy": "Queensway", "Ron": "Roncesvalles", "Rus": "Russell", "Russ": "Russell",
  "WilSub": "Wilson Subway", "W-T": "Wheel-Trans", "Wil": "Wilson Bus",
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
  'Monday-Friday afternoon peak per od', // service_summary_2012_05_06.pdf
  'Monday Friday afternoon peak period', // service_summary_2012_05_06.pdf
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
  'Departure times',
];

const text_to_skip = [
  'Route',
  'SERVICE SUMMARY',
  'RAPID TRANSIT SERVICES',
  'STREETCAR SERVICES',
  'OVERNIGHT STREETCAR SERVICES',
  'BUS SERVICES',
  'EXPRESS BUS SERVICES',
  'OVERNIGHT BUS SERVICES',
  'COMMUNITY BUS SERVICES',
  'ALL SERVICES',
  'COMMUNITY BUS',
  'COMMUNITY LINK',
  'SUBWAY',
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
  'Starting December 21, 2008', // service_summary_2008_11_23.pdf
  'U', // i think this is the wheelchair symbol
  'and', // this one is gonna be a problem, with route 11 and 28
  'U and', // and sometimes this service_summary_2011_01_02.pdf
  'Continued',
  'See also 508 LAKE SHORE',
  'See 502 DOWNTOWNER',
  'No service', // 2008_03_30
  'November 23 to December 20, 2008 only',
  'For bus service on Roncesvalles',
  'see 501 QUEEN',
  'd', // donno, seems not visible
  'F id', // donno, seems not visible
  'M', // donno, seems not visible
  'p', // service_summary_2012_03_25.pdf, seems not visible
  'g', // service_summary_2012_03_25.pdf, seems not visible
  'y', // service_summary_2012_03_25.pdf, seems not visible
  'to Friday', // service_summary_2012_05_06.pdf page 11
  'day', // service_summary_2012_05_06.pdf page 11
  'd l )', // service_summary_2011_10_09 page 17
  'M Ni', // service_summary_2011_10_09 page 24
  'li t', // service_summary_2011_10_09 page 41
  'S t', // service_summary_2011_10_09 page 43
  '169:', // service_summary_2011_10_09 page 24
  '10:', // service_summary_2011_10_09 page 24
  'Canada s Wonderland', // service_summary_2011_10_09 page 57
  'I d', // service_summary_2012_02_12 page 46
  'hibi i', // service_summary_2012_03_25 page 17
  'U i', // service_summary_2012_03_25 page 38
  'St ines', // service_summary_2012_05_06 page 53
  'd i', // service_summary_2012_07_29 page 5 '505 Dundas West Stn - Broadview Stn'
  'i h', // service_summary_2012_09_02 page 55 '165D York Mills Stn - Major Mackenzie & Highway 400'
  'd Y', // service_summary_2012_11_18 page 58 '98A Sheppard-Yonge Stn - Peckham'
];

const text_to_replace = {
  'Overnight, 7 days a week': 'Overnight - 7 days a week',
  'Overnight, Monday to Friday': 'Overnight - Monday to Friday',
  'Overnight, Saturday': 'Overnight - Saturday',
  'Overnight, Sunday': 'Overnight - Sunday',
  'Mar/05': '01-Mar-05', // route 404 at (in service_summary_2015_01_04.pdf)
  'Mar-05': '01-Mar-05', // route 404 at (in service_summary_2011_01_02.pdf)
  "85 Sheppard-Yonge Stn - Mead'vale": "85 Sheppard-Yonge Station - Meadowvale",
  "85 Sheppard-Yonge Stn-Mead'vale": "85 Sheppard-Yonge Station - Meadowvale",
  "York University, Express": "York University Express",
  'Ron Arw/Bir': 'Ron/Arw/Bir',
  'Ron/Rus Qsy': 'Ron/Rus/Qsy',
  'Ron/Arw/Mt': 'Ron/Arw/MtD',
  'D/Wil': '/Wil',
  "Exhibition (Princes' Gates)": "Exhibition (Princes Gates)",
  // "29D To Exhibition (Princes' Gates)": "29D To Exhibition (Princes Gates)",
  // "29D Wilson Stn-Exhibition (Princes' Gt)": "29D Wilson Stn-Exhibition (Princes Gate)",
  'QUEENSWAY and WILSON DIVISIONS': 'QUEENSWAY AND WILSON DIVISIONS',
  '28 DAVISVILLE M': '28 DAVISVILLE',
  'Monday to F': 'Monday to Friday', // service_summary_2012_05_06.pdf page 11
  'Monday': 'Monday to Friday', // service_summary_2012_05_06.pdf page 11
  'Monday Friday': 'Monday to Friday', // service_summary_2012_05_06.pdf page 11
  'Eg /Qsy': 'Egl/Qsy',
  '06 May 12': '06-May-12', // service_summary_2012_06_17 page 11
  '28 Nov 09': '28-Nov-09', // service_summary_2011_09_04 page 19
  '29 Nov 08': '29-Nov-08', // service_summary_2011_06_19 page 21
  '04 Sep 11': '04-Sep-11', // service_summary_2011_09_04 page 8
  '15 Oct 11': '15-Oct-11', // service_summary_2011_10_09 page 5
  '08 May 11': '08-May-11', // service_summary_2011_10_09 page 15
  'E l': 'Egl', // service_summary_2011_06_19 page 21
  'onday to Friday': 'Monday to Friday', // service_summary_2011_10_09 page 51
  '504 Dundas West Stn Broadview Stn': '504 Dundas West Stn-Broadview Stn', // service_summary_2011_06_19 page 29
  'Kipling Stn - Lake Shore': '- Lake Shore', // service_summary_2011_06_19 page 30
  'MtD/Bi /': 'MtD/Bir/', // service_summary_2012_05_06 page 3
  'Bi /': 'Bir/', // service_summary_2012_05_06 page 6
  'Wi': 'Wil', // service_summary_2012_05_06 page 8
  '13 F b 12': '13 Feb 12', // service_summary_2012_05_06 page 10
  'A w/Mal': 'Arw/Mal', // service_summary_2012_05_06 page 22
  'Eg': 'Egl', // service_summary_2012_05_06 page 52
  'Combined Avera e': 'Combined/Average', // service_summary_2012_06_17 page 54
  'Se vice interval': 'Service interval', // service_summary_2012_06_17
  'Monday to Fridayto Friday': 'Monday to Friday', // service_summary_2012_06_17
  'Sundayy': 'Sunday', // service_summary_2012_07_29 page 41
  'Saturdayy': 'Saturday', // service_summary_2012_11_18 page 19
  'Monday to Fridayy': 'Monday to Friday', // service_summary_2012_11_18 page 36
};


const branch_text_to_always_append = [
  'Stn', 'Ave', 'Quay', 'Docks',
  'Highway 400',
  'Stn via Kingston Rd',
  'Park Stn via Kingston Rd',
  'Don Mills Stn',
  'Finch Stn replacement bus',
  'Kennedy Stn - Steeles',
  'Kennedy Stn - McNaughton',
  'Broadview Stn',
  'Broadview Stn - Coxwell',
  'Downsview Stn - Steeles',
  'Downsview Stn - McNaughton',
  'Donlands Stn - Commissioners',
  'Scarborough Centre Stn',
  'Islington Stn - Lake Shore',
  'To Exhibition (Dufferin Gate)',
  'To Exhibition (Princes Gate)',
  'Stn - Shepp', // service_summary_2012_05_06 page 47
  'ard', // service_summary_2012_05_06 page 47
  'Kipling Stn - Eglinton', // service_summary_2012_09_02 page 19
  'Warden Stn - McNicoll', // service_summary_2012_10_07 page 33
  'Kennedy Stn', // service_summary_2013_01_06 page 3
];

const additional_valid_branches = [
  'Standby - Downtown Gap Bus',
  'Standby cars',
  'Standby cars - Russell',
  'Standby cars - Roncesvalles',
  'Standby buses',
  'Standby buses - Wilson',
  'Standby buses - Malvern',
  'Standby buses - Arrow Rd',
  'Standby buses - Eglinton',
  'Standby buses - Queensway',
  'Standby buses - Birchmount',
  'Standby buses - Mount Dennis',
  'Standby buses - Mt. Dennis', // service_summary_2012_11_18 page 51
  'Service relief buses - Wilson',
  'Service relief buses - Malvern',
  'Service relief buses - Eglinton',
  'Service relief buses - Queensway',
  'Service relief buses - Eglinton West Stn',
  'Service relief buses - Arrow Road Division',
  'Combined/Average',
  'GAP TRAINS',
  'Gap Trains',
];

const text_is_a_route = [
  '11 BAYVIEW and',
  '16 McCOWAN',
  "22 COXWELL and 70 O'CONNOR",
  '129 McCOWAN NORTH',
  '169 HUNTINGWOOD and',
  '198 U of T SCARBOROUGH ROCKET',
  '302 DANFORTH RD-McCOWAN', // weird they changed the name i guess
  '302 KINGSTON RD-McCOWAN', // weird they changed the name i guess
  '502 DOWNTOWNER and',
  '302 DANFORTH RD-McCOWANU',
];

const create_route_if_not_exists = {
  '29 Wilson Stn-': '29 DUFFERIN',
  '29 Wilson Stn-Exhibition (Dufferin Gate)': '29 DUFFERIN',
  '41 Keele Stn -': '41 KEELE',
  "85 Sheppard-Yonge Station - Meadowvale": '85 SHEPPARD EAST',
  '86 Kennedy Stn-Sheppard': '86 SCARBOROUGH',
  '96A York Mills Stn - Carrier Dr': '96 WILSON',
  '96A York Mills Stn-Carrier Dr': '96 WILSON',
  '107B Downsview Stn - Rutherford Go Stn via': '107 KEELE NORTH',
  '301 Long Branch - Neville Park': '301 QUEEN',
  '301 Long Branch-Neville Park': '301 QUEEN',
  '504 Roncesvalles Car House-Broadview Stn': '504 KING',
  '504 Dundas West Stn-Broadview Stn': '504 KING',
  '505 Dundas West Stn - Broadview Stn': '505 DUNDAS',
  '512 St Clair Stn-Lansdowne': '512 ST CLAIR',
  '512 Keele - St Clair Stn': '512 ST CLAIR',
  '501 Long Branch - Neville Park': '501 QUEEN',
  '501 Long Branch - Russell Carhouse': '501 QUEEN',
  '320 Queens Quay - Steeles': '320 YONGE', // service_summary_2012_10_07 page 59
};

const create_service_if_not_exists = {
  '28 Davisville Stn - Bayview': 'Monday to Friday',
  '28 Davisville Stn-Bayview': 'Monday to Friday',
  '172 Union Stn-': 'Monday to Friday',
  '193 EXHIBITION ROCKET': 'Monday to Friday',
  '301 Long Branch - Neville Park': 'Overnight - 7 days a week',
  '301 Long Branch-Neville Park': 'Overnight - 7 days a week',
  '503 Victoria Park-York': 'Monday to Friday',
  '503 York - Victoria Park': 'Monday to Friday',
  // '407 Sunnybrook Hospital': 'Monday to Friday',
};

const create_blank_states_if_blank = [
  '407 Sunnybrook Hospital',
];

const dont_append = [
  'First dep',
];

const ignore_branch_if_last_branch_was = {
  '85 To Sheppard-Yonge Stn': "85 Sheppard-Yonge Station - Meadowvale",
  '85 To Meadowvale': "85 Sheppard-Yonge Station - Meadowvale",

  '85A To Don Mills Stn': '85A Don Mills Stn - Rouge Hill GO Stn',
  '85A To Rouge Hill GO Stn': '85A Don Mills Stn - Rouge Hill GO Stn',

  '85A To Don Mills Stn': '85C Don Mills Stn - Meadowvale',
  '85 To Meadowvale': '85C Don Mills Stn - Meadowvale',

  '85A To Don Mills Stn via Toronto Zoo': '85D Don Mills Stn - Rouge Hill GO Stn via Toronto Zoo',
  '85A To Rouge Hill GO Stn via Toronto Zoo': '85D Don Mills Stn - Rouge Hill GO Stn via Toronto Zoo',

  '85A To Don Mills Stn': '85F Don Mills Stn - Toronto Zoo',
  '85B To Toronto Zoo': '85F Don Mills Stn - Toronto Zoo',

  '85 To Sheppard-Yonge Stn': '85J Sheppard-Yonge Stn - Don Mills Stn',
  '85A To Don Mills Stn': '85J Sheppard-Yonge Stn - Don Mills Stn',

  '85 To Sheppard-Yonge Stn': '85G Shep-Yonge Stn - Rouge Hill GO Stn',
  '85A To Rouge Hill GO Stn': '85G Shep-Yonge Stn - Rouge Hill GO Stn',

  '85 To Sheppard-Yonge Stn': '85B Sheppard-Yonge Stn - Toronto Zoo',
  '85B To Toronto Zoo': '85B Sheppard-Yonge Stn - Toronto Zoo',

  '29 To Exhibition (Dufferin Gate)': '29 Wilson Stn-Exhibition (Dufferin Gate)',
  '29 To Wilson Stn': '29 Wilson Stn-Exhibition (Dufferin Gate)',

  '29D To Exhibition (Princes Gates)': '29D Wilson Stn-Exhibition (Princes Gates)',
  '29 To Wilson Stn': '29D Wilson Stn-Exhibition (Princes Gates)',

  '29 To Exhibition (Dufferin Gate)': '29A Tycos Dr-Exhibition (Dufferin Gate)',
  '29A To Tycos': '29A Tycos Dr-Exhibition (Dufferin Gate)',
};

const conjoined_routes_for_some_reason = {
  '10':  [169], '169': [10],
  '11':  [28],  '28':  [11],
  '22':  [70],  '70':  [22],
  '501': [301], '301': [501],
  '502': [503], '503': [502],
  '506': [306], '306': [506],
};

const skip_page_strings = [
  'Data compiled by the Service Planning and Scheduling Department',
  'Introduction',
  'Quick Reference',
  'All-Day, Every Day¹',
  'SERVICE SUMMARY - Introduction',
];

const end_of_document_strings = [
  'Summary of vehicles and trains in service',
];

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
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
    // if (pageNum != 29) continue; // kbfu
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

    if (textContent.items.length < 20) {
      // console.log(`skipping page ${pageNum} (too few items)`);
      continue;
    }

    let primaryCorner = { x: 0, y: 0 }; // start of summary data (excludes header text, excludes route name, round trip distances, last changes, yards)
    let secondaryCorner = { x: 1000, y: 1000 }; // top left corner of "RT Dist (km)"

    let cellsSortedByLength = [];
    for (var j = 0 ; j < textContent.items.length ; j++) {
      const textItem = textContent.items[j];
      let { str } = textItem;
      str = str.replaceAll('–', '-');

      let { x, y, w, h } = getCoords(viewport, textItem);

      if (str === 'Route') {
        primaryCorner.y = Math.max(primaryCorner.y, y + h);
      } else if (str === 'RT dist (km)') {
        primaryCorner.x = Math.max(primaryCorner.x, x + w);
        secondaryCorner.x = Math.min(secondaryCorner.x, x);
        secondaryCorner.y = Math.min(secondaryCorner.y, y);
      } else if (str === 'last change') {
        primaryCorner.x = Math.max(primaryCorner.x, x + w);
        primaryCorner.y = Math.max(primaryCorner.y, y + h);
        secondaryCorner.x = Math.min(secondaryCorner.x, x);
      }

      if (w == 0 || h == 0) continue; // junk

      // something like 'February 14 to March 21, 2010' or 'February 14, 2010 to March 21, 2010'
      if ([6, 7].includes(str.split(' ').length)) {
        const bits = str.split(' ');
        if (months.includes(bits[0]) && months.includes(bits[bits.length - 3])) continue;
      }

      const sameIndex = cellsSortedByLength.findIndex((t) => t.x === x && t.y === y && t.str === str);
      if (sameIndex !== -1) { // duplicate found in service_summary_2011_06_19.pdf, page 11 'Scarborough Centre Stn', how annoying
        continue;
      }
      
      if (str === '' || str === ' ' || str === '-' || str.slice(0, 5) == 'Page ') continue;
      
      const prevIndex = cellsSortedByLength.findIndex((t) => t.y === y && t.h === h && Math.abs(t.x - x + t.w) <= 2);
      const nextIndex = cellsSortedByLength.findIndex((t) => t.y === y && t.h === h && Math.abs(x - t.x - t.w) <= 2);

      // found a element this text is part of
      if (prevIndex !== -1) {
        const prevCell = cellsSortedByLength[prevIndex];
        if (!dont_append.includes(str) || text_to_skip.includes(prevCell.str + str)) {
          prevCell.w += w;
          prevCell.str += str;
          if (text_to_replace[prevCell.str] != null) prevCell.str = text_to_replace[prevCell.str];
          continue;
        }
      }

      if (nextIndex !== -1) {
        const nextCell = cellsSortedByLength[nextIndex];
        if (!dont_append.includes(str)) {
          console.log([str, nextCell.str]);
          asdf
        }
      }

      if (text_to_skip.includes(str)) continue;
      if (text_to_replace[str] != null) str = text_to_replace[str];

      cellsSortedByLength.push({ x, y, w, h, j, str });
    }
    cellsSortedByLength.sort((a, b) => b.w === a.w ? a.j - b.j : b.w - a.w);

    if (primaryCorner.x === 0) {
      // console.log(`skipping page ${pageNum} (header not found)`);
      continue;
    }

    let cellsFiltered = [];
    for (var j = 0 ; j < cellsSortedByLength.length ; j++) {
      let { x, y, w, h, j: origJ, str } = cellsSortedByLength[j];

      const collidesWith = cellsFiltered.filter((t) => testCollideX({ x, w }, t) && testCollideY({ y, h }, t));
      if (collidesWith.length > 1) {
        console.log({ pageNum, x, y, w, h, origJ, str, collidesWith });
        asdf
      } else if (collidesWith.length === 1) {
        const c = collidesWith[0];
        if (c.y != y || c.h != h) {
          console.log({ pageNum, x, y, w, h, str, collidesWith });
          asdf
        } else if (x >= c.x && x <= c.x + c.w && c.str.indexOf(str) != -1) { // entirely inside and string is inside collision as well
          continue;
        }
      }

      // // const nextIndex = cellsFiltered.findIndex((t) => t.y === y && t.h === h && (t.x === x + w - 1 || t.x === x + w || t.x === x + w + 1));
      // const prevIndex = cellsFiltered.findIndex((t) => t.y === y && t.h === h && Math.abs(t.x - x + t.w) <= 1);
      // const nextIndex = cellsFiltered.findIndex((t) => t.y === y && t.h === h && Math.abs(x - t.x - t.w) <= 1);

      // // found a element this text is part of
      // if (prevIndex !== -1) {
      //   const prevCell = cellsFiltered[prevIndex];
      //   prevCell.w += w;
      //   prevCell.str += str;
      //   continue;
      // }

      // if (nextIndex !== -1) {
      //   console.log({x,y,w,h,pageNum})
      //   const nextCell = cellsFiltered[nextIndex];
      //   console.log({nextCell, diff: Math.abs(x - nextCell.x - nextCell.w)})
      //   console.log(`'${nextCell.str}' prepend '${str}'`);
      //   console.log('dang');
      //   asdf
      // }

      cellsFiltered.push({ x, y, w, h, j:origJ, str });
    }

    const cellsSortedYX = cellsFiltered.sort((a, b) => a.y === b.y ? a.x - b.x : a.y - b.y);

    for (var j = 0 ; j < cellsSortedYX.length ; j++) {
      let { x, y, w, h, str } = cellsSortedYX[j];

      if (text_to_skip.includes(str)) continue;

      if (skip_page_strings.includes(str)) {
        skipPage = true;
        break;
      }

      if (end_of_document_strings.includes(str)) {
        done = true;
        break;
      }

      if (create_route_if_not_exists[str] !== undefined && states.route.length === 0) {
        states.route.push({ y: y - h, h, str: create_route_if_not_exists[str] });
      }

      if (create_service_if_not_exists[str] !== undefined && states.service.length === 0) {
        states.service.push({ y: y - h, h, str: create_service_if_not_exists[str] });
        if (states.last_change.length === 0) states.last_change.push({ y: y - h, h, str: '' });
      }

      if (create_blank_states_if_blank.includes(str)) {
        if (states.last_change.length === 0) states.last_change.push({ y: y - h, h, str: '' });
        if (states.rt_distance.length === 0) states.rt_distance.push({ y: y - h, h, str: '' });
      }

      const prevRoute = states.route[states.route.length - 1];
      const prevBranch = states.branch[states.branch.length - 1];
      const prevYard = states.yard[states.yard.length - 1];

      if (ignore_branch_if_last_branch_was[str] !== undefined && prevBranch && prevBranch.str === ignore_branch_if_last_branch_was[str]) {
        continue;
      }

      const spaceSplit = str.trim().replaceAll(',', '').split(' ');
      if (spaceSplit.length === 4 && spaceSplit[0] === 'Beginning' && months.includes(spaceSplit[1]) && parseInt(spaceSplit[3]) == spaceSplit[3]) {
        // something like 'Beginning November 20 2011'
        continue;
      }

      if (y > primaryCorner.y) { // not part of the header at all
        if (x < secondaryCorner.x) { // first column, routes / services / branches
          if (str === '8' || str === '8\x03') { // some sort of shit encoding thing for a wheelchair logo
            // console.log("'8' isn't a route/service/branch on it's own");
          } else if (text_is_a_route.includes(str) || (str === str.toUpperCase() && parseInt(str) && str.length > 3)) { // all caps, starts with number
            states.route.push({ x, y, h, str });
            if (str.search(',') !== -1) console.log(`new route "${str}" has a comma`);
            if (debug) console.log(`new route ${str}`);
          } else if (prevRoute && prevRoute.str.slice(-1) === '/') {
            prevRoute.str += str.trim();
            prevRoute.h = y + h - prevRoute.y;
            if (str.search(',') !== -1) console.log(`append route "${str}" has a comma`);
            if (debug) console.log(`append route ${str}`);
          } else if (['Monday to Friday', 'Saturday', 'Sunday'].includes(str) || str.slice(0, 9) === 'Overnight') { // it's a service
            states.service.push({ y, h, str });
            if (str.search(',') !== -1) console.log(`new service "${str}" has a comma`);
            if (debug) console.log(`new service ${str}`);
          } else if (prevRoute && parseInt(str) && parseInt(str) === parseInt(prevRoute.str)) { // if line "parseInt" matches route "parseInt" then it's a branch
            states.branch.push({ y, h, str });
          } else if (prevRoute && parseInt(str) && parseInt(str) != undefined && parseInt(prevRoute.str) != undefined) { // if line "parseInt" doesn't matches but it's still a number at least
            if ((conjoined_routes_for_some_reason[`${parseInt(str)}`] || []).includes(parseInt(prevRoute.str))) {
              // console.log({ msg: `branch is weird, route: ${prevRoute.str}`, pageNum, x, y, str }); // this should never console.log anything
              states.branch.push({ y, h, str });
              if (str.search(',') !== -1) console.log(`new branch "${str}" has a comma`);
              if (debug) console.log(`new branch ${str}`);
            } else {
              console.log({ msg: `branch is extra weird`, prevRoute, prevBranch, pageNum, x, y, str }); // this should never console.log anything
              asdf
              // states.branch.push({ y, h, str });
            }
          } else if (additional_valid_branches.includes(str)) {
            states.branch.push({ y, h, str });
          } else if (prevBranch && branch_text_to_always_append.includes(str)) {
            prevBranch.str += ` ${str}`;
            prevBranch.h = y + h - prevBranch.y;
            if (str.search(',') !== -1) console.log(`append branch "${str}" has a comma`);
            if (debug) console.log(`append branch ${str}`);
          } else if (prevBranch && (prevBranch.str.slice(-1) === '-'
                  || prevBranch.str.slice(-1) === '-'
                  || prevBranch.str.slice(-4) === ' and')) { // if prev end in "-" then simply append to that
            prevBranch.str += ` ${str}`;
            prevBranch.h = y + h - prevBranch.y;
            if (str.search(',') !== -1) console.log(`append branch "${str}" has a comma`);
            if (debug) console.log(`append branch ${str}`);
          } else if (prevBranch && prevBranch.str.slice(-4) === ' via') { // if prev end in "-" then simply append to that
            prevBranch.str += ` ${str}`;
            prevBranch.h = y + h - prevBranch.y;
            if (str.search(',') !== -1) console.log(`append branch "${str}" has a comma`);
            if (debug) console.log(`append branch ${str}`);
          } else if (str.indexOf('via ') != -1
                  || str.indexOf('Via ') != -1
                  || str.slice(0, 2) === '- '
                  || str.slice(0, 1) === '('
                  || str.slice(0, 4) === 'and '
                  || str.slice(0, 7) === 'Express') {
            prevBranch.str += ` ${str.trim()}`;
            prevBranch.h = y + h - prevBranch.y;
            if (str.search(',') !== -1) console.log(`append branch "${str}" has a comma`);
            if (debug) console.log(`append branch ${str}`);
          } else if (prevRoute && str === str.toUpperCase()) {
            prevRoute.str += ` ${str}`;
            if (str.search(',') !== -1) console.log(`append route "${str}" has a comma`);
            if (debug) console.log(`append route ${str}`);
          } else {
            console.log('bad', j);
            states.branch.push({ y, h, str });
            // console.log(states);

            for (var i = j - 10 ; i < j + 10 ; i++) {
              console.log(i, cellsSortedYX[i]);
            }

            console.log({ msg: 'branch is weird', prevRoute, prevBranch, pageNum, x, y, w, h, str }); // this should never console.log anything
            asdf
          }
        } else if (x <= primaryCorner.x) { // last change, yard and round trip distance 'column'
          if (str.split('-').length === 3) {
            states.last_change.push({ y, h, str });
          } else if (parseFloat(str) == str) {
            states.rt_distance.push({ y, h, str });
          } else {
            if (prevYard && prevYard.str === 'Ron/Arw/Mt' && str == 'D/Wil') { // exceptions why not
              prevYard.str += str.trim();
              prevYard.h = y + h - prevYard.y;
              str = prevYard.str;
            } else if (states.yard.length > 0 && prevYard.str.slice(-1) == '/') {
              prevYard.str += str.trim();
              prevYard.h = y + h - prevYard.y;
            } else {
              states.yard.push({ y, h, str });
            }

            if (str.indexOf('/') == -1 && str.split(' ').length === 2) {
              const bits = str.split(' ');
              if (parseInt(bits[0]) == bits[0] && parseInt(bits[1]) == bits[1]) {
                data_cells.push({ x, y, w, h, str: str.replaceAll(' ', '.') });
              }
            } else if (str.indexOf('/') == -1 && str.split(' ').length === 3) {
              const bits = str.split(' ');
              if (parseInt(bits[0]) == bits[0] && months.includes(bits[1]) && parseInt(bits[2]) == bits[2]) {
                data_cells.push({ x, y, w, h, str: str.replaceAll(' ', '-') });
              }
            } else if (!str.split('/').filter(yard => yard).map(yard => yards[yard.trim()] != undefined).every(yardExists => yardExists)) {
              // console.log([pageNum, prevYard.str, str]);
              console.log({ pageNum, one: str.split('/'), two: str.split('/').filter(yard => yard).map(yard => yards[yard] != undefined), msg: 'yard is weird', x, y, str });
            }
          }
        } else {
          str = str.replace('"', '').replace("'", '').replace("'", '').replace("'", '').replace('  ', ' ').trim();
          data_cells.push({ x, y, w, h, str });
        }
      } else if (x >= primaryCorner.x && y >= secondaryCorner.y) { // header
        if (str === 'SERVICE SUMMARY') { // only happens at the end of the document
          done = true;
          break;
        }
        column_header_cells.push({ x, y, w, h, str });
      }
    }

    // console.log(states)

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
        console.log({ filename, pageNum, branch, route, service, yard, last_change, rt_distance });
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

