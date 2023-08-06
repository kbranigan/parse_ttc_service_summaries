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
const assert = require("assert");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
const { allFiles, yards, vehicles } = require("./vars");

const debug = false;
const START_PAGE = 1;
const pdfPath = 'service_summaries/';

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
  'U', // i think this is the wheelchair symbol
  'and', // this one is gonna be a problem, with route 11 and 28
  'U and', // and sometimes this service_summary_2011_01_02.pdf
  'Continued',
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
  'moot', // service_summary_2021_11_21 page 19
  'SUBWAY SERVICES', // service_summary_2015_09_06 page 3
  'ay morning peak period', // service_summary_2018_10_07 page 15
  'then', // service_summary_2008_11_23 page 59 'then'
  't i', // service_summary_2011_09_04 page 40 'Alternates trips with 329 DUFFERIN'
];

const text_is_a_note = [
  'see 501 QUEEN',
  'Starting December 21, 2008', // service_summary_2008_11_23.pdf
  'Temporarily Suspended.',
  'Temporarily suspended.',
  'Temporarily Suspended',
  'See also 508 LAKE SHORE',
  'See 502 DOWNTOWNER',
  'No service', // 2008_03_30
  'November 23 to December 20, 2008 only',
  'For bus service on Roncesvalles',
  'For service on Kingston Road:', // service_summary_2015_10_11 page 15
  '97B operates via Yonge, Wellington, Bay, Queens', // service_summary_2017_01_08 page 41
  '97B operates via Yonge, Queens Quay, Bay,', // service_summary_2017_01_08 page 41
  'Northbound 102B buses operate as', // service_summary_2017_01_08 page 42
  'Southbound 102B buses operate as', // service_summary_2017_01_08 page 42
  '97B operates via Yonge, Queens Quay, Bay, Front', // service_summary_2017_07_30 page 42
  'AFTER', // service_summary_2017_06_18 page 49
  'BEFORE', // service_summary_2019_01_06 page 46
  'Until 11:00 a.m.', // service_summary_2019_01_06 page 32
  'After 11:00 a.m.', // service_summary_2019_01_06 page 32
  'Until 9:00 p.m.', // service_summary_2019_06_23 page 5
  'After 10:00 a.m.', // service_summary_2019_06_23 page 17
  'After 9:00 p.m.', // service_summary_2019_08_04 page 5
  'After 7:00 a.m.', // service_summary_2020_02_16 page 47
  'Until 6:00 p.m.', // service_summary_2021_10_10 page 7
  'See also 508 LAKE SHORE', // service_summary_2008_03_30 page 6
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
  '302 DANFORTH RD-McCOWAN8\x03': '302 DANFORTH RD-McCOWAN', // service_summary_2008_06_22 page 16 - weird U
  '129 McCOWAN NORTH8': '129 McCOWAN NORTH', // service_summary_2008_06_22 page 36 - weird U
  "Exhibition (Princes' Gates)": "Exhibition (Princes Gate)",
  "29B To Exhibition (Princes' Gate)": '29B To Exhibition (Princes Gate)', // service_summary_2022_09_04 page 15
  "29B Wilson Stn-Exhibition (Princes' Gate)": '29B Wilson Stn-Exhibition (Princes Gate)', // service_summary_2022_09_04 page 15
  'QUEENSWAY and WILSON DIVISIONS': 'QUEENSWAY AND WILSON DIVISIONS',
  '28 DAVISVILLE M': '28 DAVISVILLE',
  'Monday to F': 'Monday to Friday', // service_summary_2012_05_06.pdf page 11
  'Monday': 'Monday to Friday', // service_summary_2012_05_06.pdf page 11
  'Monday Friday': 'Monday to Friday', // service_summary_2012_05_06.pdf page 11
  'Monda': 'Monday to Friday', // service_summary_2012_07_29 page 36
  'to Frida': 'Monday to Friday', // service_summary_2012_07_29 page 36
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
  'Monday to Fridayto Friday': 'Mondayto Friday', // service_summary_2012_06_17
  'Sundayy': 'Sunday', // service_summary_2012_07_29 page 41
  'Saturdayy': 'Saturday', // service_summary_2012_11_18 page 19
  'Monday to Fridayy': 'Monday to Friday', // service_summary_2012_11_18 page 36
  'Eg /Q y': 'Egl/Qsy', // service_summary_2013_03_31 page 44
  'November24 to December 21, 2013': 'November 24 to December 21, 2013', // service_summary_2013_11_24 page 43
  '501 QUEEN Continued': '501 QUEEN', // service_summary_2014_11_23 page 43
  '94 WELLESLEY Continued': '94 WELLESLEY', // service_summary_2014_11_23 page 59
  '510 SPADINAcontinued': '510 SPADINA', // service_summary_2015_06_21 page 11
  'Effective June 22 to July 25, 2015': 'June 22 to July 25, 2015', // service_summary_2015_06_21 page 11
  'Effective July 27 to September 5, 2015': 'July 27 to September 5, 2015', // service_summary_2015_06_21 page 11
  'Effective June 21 to July 25, 2015': 'June 21 to July 25, 2015', // service_summary_2015_06_21 page 17
  'Effective June 21 to July 10, 2015': 'June 21 to July 10, 2015', // service_summary_2015_06_21 page 20
  'Effective June 21 to July 12, 2015': 'June 21 to July 12, 2015', // service_summary_2015_06_21 page 33
  'Effective July 26 to September 5, 2015': 'July 26 to September 5, 2015', // service_summary_2015_06_21 page 57
  'Ron/Rus u': 'Ron/Rus', // service_summary_2017_01_08 page 7
  'Effective November 26 to December 16, 2017': 'November 26 to December 16, 2017', // service_summary_2017_11_26 page 19
  'Effective December 17, 2017 to January 6, 2018': 'December 17, 2017 to January 6, 2018', // service_summary_2017_11_26 page 19
  '01-Apr.18': '01-Apr-18', // service_summary_2018_04_01 page 46
  '25-Jun.18': '25-Jun-18', // service_summary_2018_06_24 page 48
  '4-Sep=18': '4-Sep-18', // service_summary_2018_10_07 page 21
  '13--Oct-18': '13-Oct-18', // service_summary_2018_10_07 page 41
  '01-Apr.19': '01-Apr-19', // service_summary_2019_05_12 page 34
  "29C Wilson Stn-Exhibition (Princes' Gate)": "29C Wilson Stn-Exhibition (Princes Gate)", // service_summary_2020_02_16 page 17
  '22/21/2021': '22-Nov-2021', // service_summary_2022_01_02 page 8
  'DWSTN - Broadview Stn': '505 Dundas West Stn - Broadview', // service_summary_2022_02_13 page 8
  '36B Lawrence Stn-Finch Stn-Humberwood': '36B Lawrence Stn-Finch Stn via Humberwood', // service_summary_2008_06_22 page 23
  '7 Bathurst Stn to Steeles': '7 Bathurst Stn-Steeles', // service_summary_2009_11_22 page 10
  "29D To Exhibition (Princes' Gate)": '29D To Exhibition (Princes Gate)', // service_summary_2010_09_05 page 19
  "29D Wilson Stn-Exhibition (Princes' Gt)": '29D Wilson Stn-Exhibition (Princes Gate)', // service_summary_2010_09_05 page 19
  '29A Tycos Dr - Exhibition (Dufferin Gt)': '29A Tycos Dr-Exhibition (Dufferin Gate)', // service_summary_2010_09_05 page 19
  '29DTo Exhibition (Princes Gate)': '29D To Exhibition (Princes Gate)', // service_summary_2011_09_04 page 19
  '29D To Exhibition (Princes Gates)': '29D To Exhibition (Princes Gate)',
  '29D Wilson Stn-Exhibition (Princes Gates)': '29D Wilson Stn-Exhibition (Princes Gate)',
  '29-Jul 12': '29-Jul-12', // service_summary_2012_07_29 page 7
  "29D Wilson Stn-Exhibition (Princes' Gate)": "29D Wilson Stn-Exhibition (Princes Gate)", // service_summary_2012_09_02 page 18
  "29C To Exhibition (Princes' Gate)": '29C To Exhibition (Princes Gate)', // service_summary_2014_06_22 page 19
  'trippers': 'Tripper',
  'Trippers': 'Tripper',
  "29H Tycos Dr - Exhibition (Princes' Gate)": '29H Tycos Dr - Exhibition (Princes Gate)', // service_summary_2015_03_29 page 19
  'CLRVL': 'CLRV', // service_summary_2015_05_10 page 50
  'Fsc': 'LFsc', // service_summary_2015_05_10 page 50
  '29G Dufferin Stn - Exhibition (Dufferin Gt)': '29G Dufferin Stn - Exhibition (Dufferin Gate)', // service_summary_2015_06_21 page 26
  'Birr': 'Bir', // service_summary_2011_06_19 page 36 (not really)
  "121A Princes' Gate - Distillery": '121A Princes Gate - Distillery', // service_summary_2018_02_18 page 50
  "29C Wilson Stn-Exhibition (Prince' Gate)": '29C Wilson Stn-Exhibition (Prince Gate)', // service_summary_2018_10_07 page 16
  "121C Princes' Gate - Cherry Beach": '121C Princes Gate - Cherry Beach', // service_summary_2018_05_13 page 47
  '952 Lawrence Station to Terminal 3': '952 Lawrence Station - Terminal 3', // service_summary_2018_10_07 page 57
  '954 Lawrence East RT Station to Starspray': '954 Lawrence East RT Station - Starspray', // service_summary_2018_10_07 page 57
  '989 Keele Station to Steeles': '989 Keele Station - Steeles', // service_summary_2018_10_07 page 58
  '4\\': '4', // service_summary_2020_06_21 page 50
  '107C S W Stn - Steeles via Keele & Supertest': '107C Sheppard West Stn - Steeles via Keele & Supertest', // service_summary_2021_09_05 page 41
  '107D S W Stn - Steeles via Alness & Supertest': '107D Sheppard West Stn - Steeles via Alness & Supertest', // service_summary_2021_09_05 page 41
  '###': '####', // service_summary_2021_11_21 page 19
  '#####': '####', // service_summary_2022_02_13 page 19
  "501 Sunnyside-Neville Park via McCaul, Dundas, and Bvw": '501 Sunnyside-Neville Park via McCaul Dundas and Broadview', // service_summary_2023_05_07 page 6

  // below is from aggregate step
  '1 YONGE-UNIVERSITY SUBWAY': '1 YONGE-UNIVERSITY-SPADINA',
  '1 YONGE-UNIVERSITY': '1 YONGE-UNIVERSITY-SPADINA',
  '2 BLOOR-DANFORTH SUBWAY': '2 BLOOR-DANFORTH',
  '3 SCARBOROUGH': '3 SCARBOROUGH RT',
  '4 SHEPPARD SUBWAY': '4 SHEPPARD',
  '10 VAN HORNE U': '10 VAN HORNE',
  '28 DAVISVILLE U': '28 DAVISVILLE',
  '61 AVENUE RD NORTH8': '61 AVENUE RD NORTH',
  '101 PARC DOWNSVIEW PARK': '101 DOWNSVIEW PARK',
  '107 KEELE NORTH M N': '107 KEELE NORTH',
  '128 Stanley Greene': '128 STANLEY GREENE',
  '139 FINCH - DON MILLS': '139 FINCH-DON MILLS',
  "175 BLUFFER'S PARK": '175 BLUFFERS PARK',
  '224 VICTORIA PARK NORTH8': '224 VICTORIA PARK NORTH',
  '353 STEELES': '353 STEELES EAST',
  '402 PARKDALE COMMUNITYBUS': '402 PARKDALE',
  '750 STANDBY BUSES': '750 STANDBY BUSES - DOWNTOWN GAP BUSES',
  '777 SERVICE RELIEF BUSES': '777 SERVICE RELIEF BUSES - QUEENSWAY/WILSON DIVISION',
  '777 SERVICE RELIEF BUSES - QUEENSWAY AND WILSON DIVISIONS': '777 SERVICE RELIEF BUSES - QUEENSWAY/WILSON DIVISION',
  '902 Markham Road Express': '902 MARKHAM ROAD EXPRESS',
  '902 MARKHAM RD EXPRESS': '902 MARKHAM ROAD EXPRESS',
  '905 Eglinton East Express': '905 EGLINTON EAST EXPRESS',
  '913 Progress Express': '913 PROGRESS EXPRESS',
  '924 Victoria Park Express': '924 VICTORIA PARK EXPRESS',
  '925 Don Mills Express': '925 DON MILLS EXPRESS',
  '927 Highway 27 Express': '927 HIGHWAY 27 EXPRESS',
  '929 Dufferin Express': '929 DUFFERIN EXPRESS',
  '935 Jane Express': '935 JANE EXPRESS',
  '937 Islington Express': '937 ISLINGTON EXPRESS',
  '938 Highland Creek EXPRESS': '938 HIGHLAND CREEK EXPRESS',
  '939 Finch Express': '939 FINCH EXPRESS',
  '952 Lawrence West Express': '952 LAWRENCE WEST EXPRESS',
  '954 Lawrence East Express': '954 LAWRENCE EAST EXPRESS',
  '960 Steeles West Express': '960 STEELES WEST EXPRESS',
  '984 Sheppard West Express': '984 SHEPPARD WEST EXPRESS',
  '985 Sheppard East Express': '985 SHEPPARD EAST EXPRESS',
  '989 Weston Road Express': '989 WESTON ROAD EXPRESS',
  '989 WESTON EXPRESS': '989 WESTON ROAD EXPRESS',

  // branches
  '7-Bathurst Stn to Steeles': '7 Bathurst Stn-Steeles',
  '8Broadview Stn-Coxwell': '8 Broadview Stn-Coxwell',
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
  // 'Kennedy Stn', // service_summary_2013_01_06 page 3
  // 'Warden', // service_summary_2013_01_06 page 3
  // 'McCowan Stn', // service_summary_2013_01_06 page 3
  // 'Downsview Stn', // service_summary_2013_01_06 page 3
  // 'St Clair West Stn', // service_summary_2013_01_06 page 4
  // 'Steeles', // service_summary_2013_01_06 page 4
  // 'York Mills Stn', // service_summary_2013_01_06 page 4
  'Rd', // service_summary_2016_03_27 page 56
  'Stn Express', // service_summary_2016_05_08 page 24
  'via', // service_summary_2018_10_07 page 47
  'Mall', // service_summary_2018_10_07 page 47
  'College', // service_summary_2023_01_08 page 48
  'Centre', // service_summary_2023_03_26 page 55
];

const missing_textItems = {
  'allFiles': {
    'allPages': [
      { addStr: 'Combined/Average', afterStr: '39E Finch Stn-Neilson Express', },
      { addStr: 'Combined/Average', afterStr: '39E Finch Stn - Neilson Express', },
      { addStr: 'Combined/Average', afterStr: '38A Scarborough Centre Stn-U of T Scar.' },
      { addStr: 'Combined/Average', afterStr: '38A Scarborough Centre Stn - U of T Scar.' },
      { addStr: 'Combined/Average', afterStr: 'U of T Scarborough' }, // started service_summary_2010_10_10 page ~20
      { addStr: 'Combined/Average', afterStr: 'of T Scarborough' }, // started service_summary_2012_02_12 page ~26
      { addStr: 'Combined/Average', afterStr: '320A Queens Quay - York Mills Stn' }, // started service_summary_2010_11_21, page 4 and also page ~61
      // { addStr: 'Combined/Average', afterStr: '320A Queens Quay - York Mills Stn', index: 1 }, // started service_summary_2010_11_21, page 4 and also page ~61
      // { addStr: 'Combined/Average', afterStr: '320A Queens Quay - York Mills Stn', index: 2 }, // started service_summary_2010_11_21, page 4 and also page ~61
      { addStr: 'Combined/Average', afterStr: '96C To Thistledown via Albion' },
      { addStr: 'Combined/Average', afterStr: '96F To Tandridge and Isling. via Albion' },
      { addStr: 'Combined/Average', afterStr: '503 York - Victoria Park' }, // service_summary_2012_11_18 page 5
      { addStr: 'Combined/Average', afterStr: '503 York - Kingston Rd. & Queen' }, // service_summary_2013_06_23 page 5
      { addStr: 'Combined/Average', afterStr: '503 Spadina - Kingston Rd. & Queen' }, // service_summary_2013_06_23 page 5
      { addStr: 'Combined/Average', afterStr: '95B York Mills Stn - U of T Scarborough' }, // service_summary_2013_09_01 page 58
      { addStr: '512 Keele - St Clair Stn', afterStr: '512 Keele - St Clair Stn', index: 0 }, // kinda confusing, there's a dangling 'tripper'
      { addStr: 'Combined/Average', afterStr: '512 Keele - St Clair Stn', offset: { y: 12 }, index: 0 }, // started service_summary_2014_07_20 page 7
      { addStr: 'Combined/Average', afterStr: '95E York Mills Stn - U of T Scarborough', offset: { y: 12 }, index: 1 }, // started service_summary_2015_06_21 page 75
      { addStr: 'Combined/Average', afterStr: '95E York Mills Stn - U of T Scarborough', offset: { y: 12 }, index: 2 }, // started service_summary_2015_06_21 page 75
      { addStr: 'Combined/Average', afterStr: '199C Finch Stn - Morningside Heights', offset: { y: 12 }, }, // started service_summary_2016_03_27 page 25
      { addStr: 'Combined/Average', afterStr: 'via Kipling and John Garland', index: 4 }, // started service_summary_2016_03_27 page 62
      { addStr: 'Combined/Average', afterStr: '199C Finch Stn - Morningside Heights Express', }, // started service_summary_2017_01_08 page 56
      { addStr: 'Combined/Average', afterStr: '503 Spadina - Victoria Park', }, // started service_summary_2017_05_07 page 7
      { addStr: 'Combined/Average', afterStr: '939C Finch Stn - Morningside Heights Express', }, // service_summary_2018_10_07 page 57
      { addStr: 'Combined/Average', afterStr: '939B Finch West Stn -', offset: { y: 12 }, index: 1 }, // service_summary_2018_10_07 page 57
      { addStr: 'Combined/Average', afterStr: '939B Finch West Stn -', offset: { y: 12 }, index: 2 }, // service_summary_2018_10_07 page 57
      { addStr: 'Combined/Average', afterStr: 'SB via Birchmount', index: 0 }, // service_summary_2020_01_05 page 29
      { addStr: 'Combined/Average', afterStr: 'SB via Birchmount', index: 1 }, // service_summary_2020_01_05 page 29
      { addStr: 'Combined/Average', afterStr: 'SB via Birchmount', index: 2 }, // service_summary_2020_01_05 page 29
    ],
  },
  'service_summary_2012_09_02.pdf': { '6': [ { addStr: 'trips', afterStr: 'trips', index: 1, onCollision: 'error' } ], },

  'service_summary_2018_02_18.pdf': { '50': [ { addStr: 'Bus', afterStr: '121A Princes Gate - Distillery', offset: { x: 600, y: -6, w:9 }, index: 0, onCollision: 'delete' }]},
  'service_summary_2018_04_01.pdf': { '47': [ { addStr: 'Bus', afterStr: '121A Princes Gate - Distillery', offset: { x: 600, y: -6, w:9 }, index: 0, onCollision: 'delete' }]},
  'service_summary_2018_05_13.pdf': { '47': [ { addStr: 'Bus', afterStr: '121C Princes Gate - Cherry Beach', offset: { x: 600, y: -6, w:9 }, index: 0, onCollision: 'delete' }]},
  'service_summary_2018_06_24.pdf': {
    '22': [ { addStr: 'Bus', afterStr: '42A Finch Stn - Middlefield/Dynamic', offset: { x: 465, y: -6, w:9 }, index: 0, onCollision: 'delete' }],
    '49': [ { addStr: 'Bus', afterStr: '121D Ontario Place - Cherry Beach', offset: { x: 600, y: -6, w:9 }, index: 0, onCollision: 'delete' }],
  },
  'service_summary_2018_10_07.pdf': { '21': [ { addStr: 'Bus', afterStr: '42A Finch Stn - Middlefield/Dynamic', offset: { x: 894, y: -6, w:20 }, index: 0, onCollision: 'delete' }]},

  'service_summary_2019_01_06.pdf': {
    '9': [
      { addStr: 'Combined/Average', afterStr: '511C Bathurst Stn -Wellington & Bathurst' },
    ],
    '21': [
      { addStr: 'Bus', afterStr: '0', offset:{ x: -6}, onCollision: 'delete', index: 0 },
    ],
    '56': [
      { addStr: 'Combined/Average', afterStr: 'via Royalcrest Express', },
      { addStr: 'Combined/Average', afterStr: '925 Pape Stn - Steeles Express', offset: { y: 38 }, index: 1 },
      { addStr: '925 Pape Stn - Steeles Express', afterStr: '925 Pape Stn - Steeles Express', offset: { y: 24 }, index: 1 },
      { addStr: '925 Pape Stn - Steeles Express', afterStr: '925 Pape Stn - Steeles Express', index: 1 },
    ],
    '57': [
      { addStr: 'Combined/Average', afterStr: 'Scarborough Centre Stn Express', index: 2 },
      { addStr: 'Combined/Average', afterStr: 'Scarborough Centre Stn Express', index: 1 },
    ],
  },
  'service_summary_2019_02_17.pdf': {
    '21': [ { addStr: 'Bus', afterStr: '42A Finch Stn - Middlefield/Dynamic', offset: { x: 976, y: -6, w:9 }, index: 0, onCollision: 'delete' }],
    '56': [
      { addStr: 'Combined/Average', afterStr: '925 Pape Stn - Steeles Express', offset: { y: 38 }, index: 1 },
      { addStr: '925 Pape Stn - Steeles Express', afterStr: '925 Pape Stn - Steeles Express', offset: { y: 24 }, index: 1 },
      { addStr: '925 Pape Stn - Steeles Express', afterStr: '925 Pape Stn - Steeles Express', index: 1 },
    ],
  },
  'service_summary_2019_03_31.pdf': { '21': [ { addStr: 'Bus', afterStr: '42A Finch Stn - Middlefield/Dynamic', offset: { x: 976, y: -6, w:9 }, index: 0, onCollision: 'delete' }], },
  'service_summary_2019_05_12.pdf': { '21': [ { addStr: 'Bus', afterStr: '42A Finch Stn - Middlefield/Dynamic', offset: { x: 475, y: -1, w:9 }, index: 0, onCollision: 'delete' }], },
  'service_summary_2019_06_23.pdf': {
    '20': [ { addStr: 'Combined/Average', afterStr: 'Rouge Hill GO Stn' }],
    '21': [ { addStr: 'Bus', afterStr: '42A Finch Stn - Middlefield/Dynamic', offset: { x: 475, y: -1, w:9 }, index: 0, onCollision: 'delete' }],
  },

  'service_summary_2019_08_04.pdf': {
    '20': [ { addStr: 'Combined/Average', afterStr: 'Rouge Hill GO Stn' }],
    '21': [ { addStr: 'Bus', afterStr: '42A Finch Stn - Middlefield/Dynamic', offset: { x: 975, y: -1, w:9 }, index: 0, onCollision: 'delete' }],
  },
  'service_summary_2019_09_01.pdf': { '21': [ { addStr: 'Bus', afterStr: '42A Finch Stn - Middlefield/Dynamic', offset: { x: 475, y: -1, w:9 }, index: 0, onCollision: 'delete' }], },
  'service_summary_2019_10_13.pdf': { '21': [ { addStr: 'Bus', afterStr: '42A Finch Stn - Middlefield/Dynamic', offset: { x: 976, y: -1, w:9 }, index: 0, onCollision: 'delete' }], },
  'service_summary_2019_11_24.pdf': {
    '21': [ { addStr: 'Bus', afterStr: '42A Finch Stn - Middlefield/Dynamic', offset: { x: 475, y: -1, w:9 }, index: 0, onCollision: 'delete' }],
    '46': [ { addStr: 'Combined/Average', afterStr: '121S Union Stn - Distillery' }],
  },

  'service_summary_2020_01_05.pdf': { '21': [ { addStr: 'Bus', afterStr: '42A Finch Stn - Middlefield/Dynamic', offset: { x: 475, y: -1, w:9 }, index: 0, onCollision: 'delete' }], },
  'service_summary_2020_02_16.pdf': {
    '22': [ { addStr: 'Bus', afterStr: '42A Finch Stn - Middlefield/Dynamic', offset: { x: 485, y: -6, w:9 }, index: 0, onCollision: 'delete' }],
  },
  'service_summary_2020_03_29.pdf': {
    '22': [ { addStr: 'Bus', afterStr: '42A Finch Stn - Middlefield/Dynamic', offset: { x: 485, y: -6, w:9 }, index: 0, onCollision: 'delete' }],
  },
  'service_summary_2020_06_21.pdf': { '15': [ { addStr: 'Combined/Average', afterStr: '23 Main Street Stn - St Clair' } ], },
  'service_summary_2020_10_11.pdf': { '15': [ { addStr: 'Combined/Average', afterStr: '23 Main Street Stn - St Clair' } ], },
  'service_summary_2020_11_22.pdf': { '15': [ { addStr: 'Combined/Average', afterStr: '23 Main Street Stn - St Clair' } ], },

  'service_summary_2021_01_03.pdf': {
    '8': [
      { addStr: 'Combined/Average', afterStr: '504B Dufferin Gate - Broadview Stn', index: 1 },
      { addStr: 'Combined/Average', afterStr: '504B Dufferin Gate - Broadview Stn', index: 2 },
    ],
  },
  'service_summary_2021_02_14.pdf': {
    '8': [
      { addStr: 'Combined/Average', afterStr: '504B Dufferin Gate - Broadview Stn', index: 1 },
      { addStr: 'Combined/Average', afterStr: '504B Dufferin Gate - Broadview Stn', index: 2 },
    ],
  },
  'service_summary_2021_03_28.pdf': {
    '8': [
      { addStr: 'Combined/Average', afterStr: '504B Dufferin Gate - Broadview Stn', index: 1 },
      { addStr: 'Combined/Average', afterStr: '504B Dufferin Gate - Broadview Stn', index: 2 },
    ],
  },
  'service_summary_2021_05_09.pdf': {
    '40': [
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn - Steeles via Alness', index: 0, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn - Steeles via Alness', index: 1, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn - Steeles via Alness', index: 2, onCollision: 'error' },
    ],
  },
  'service_summary_2021_06_20.pdf': {
    '41': [
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn - Steeles via Alness', index: 0, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn - Steeles via Alness', index: 1, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn - Steeles via Alness', index: 2, onCollision: 'error' },
    ],
  },
  'service_summary_2021_08_01.pdf': {
    '41': [
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn - Steeles via Alness', index: 0, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn - Steeles via Alness', index: 1, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn - Steeles via Alness', index: 2, onCollision: 'error' },
    ],
  },
  'service_summary_2021_09_05.pdf': {
    '41': [
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn - Steeles via Alness', index: 1, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn - Steeles via Alness', index: 2, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107D Sheppard West Stn - Steeles via Alness & Supertest', onCollision: 'error' },
    ],
  },
  'service_summary_2021_10_10.pdf': {
    '43': [
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn - Steeles via Alness', index: 1, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn - Steeles via Alness', index: 2, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107D Sheppard West Stn - Steeles via Alness & Supertest', onCollision: 'error' },
    ],
  },
  'service_summary_2021_11_21.pdf': {
    '43': [
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn - Steeles via Alness', index: 1, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn - Steeles via Alness', index: 2, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107D Sheppard West Stn - Steeles via Alness & Supertest', onCollision: 'error' },
    ],
  },
  'service_summary_2022_01_02.pdf': {
    '44': [
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn - Steeles via Alness', index: 1, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn - Steeles via Alness', index: 2, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107D Sheppard West Stn - Steeles via Alness & Supertest', onCollision: 'error' },
    ],
  },
  'service_summary_2022_02_13.pdf': {
    '42': [
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn - Steeles via Alness', index: 1, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn - Steeles via Alness', index: 2, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107D Sheppard West Stn - Steeles via Alness & Supertest', onCollision: 'error' },
    ],
  },
  'service_summary_2022_03_27.pdf': {
    '42': [
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn - Steeles via Alness', index: 1, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn - Steeles via Alness', index: 2, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107D Sheppard West Stn - Steeles via Alness & Supertest', onCollision: 'error' },
    ],
  },
  'service_summary_2022_05_08.pdf': {
    '26': [
      { addStr: 'Combined/Average', afterStr: 'via Pioneer Village Stn', index: 3, onCollision: 'error' },
    ],
    '41': [
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn - Steeles via Alness', index: 1, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn - Steeles via Alness', index: 2, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: 'via Alness & Supertest', onCollision: 'error' },
    ],
  },
  'service_summary_2022_06_19.pdf': {
    '26': [
      { addStr: 'Combined/Average', afterStr: 'via Pioneer Village Stn', index: 3, onCollision: 'error' },
    ],
    '41': [
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn - Steeles via Alness', index: 1, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn - Steeles via Alness', index: 2, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: 'via Alness & Supertest', onCollision: 'error' },
    ],
  },
  'service_summary_2022_07_31.pdf': {
    '24': [
      { addStr: 'Combined/Average', afterStr: '60B Finch Stn-Martin Grove via Pioneer Village Stn', index: 2, onCollision: 'error' },
    ],
    '27': [
      { addStr: 'Combined/Average', afterStr: '69B Warden Stn-Kingston Rd SB via Birchmount', index: 0, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '69B Warden Stn-Kingston Rd SB via Birchmount', index: 1, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '69B Warden Stn-Kingston Rd SB via Birchmount', index: 2, onCollision: 'error' },
    ],
    '39': [
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn-Steeles via Alness', index: 1, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn-Steeles via Alness', index: 2, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107D Sheppard West Stn-Steeles via Alness & Supertest', onCollision: 'error' },
    ],
  },
  'service_summary_2022_09_04.pdf': {
    '26': [
      { addStr: 'Combined/Average', afterStr: '60B Finch Stn-Martin Grove via Pioneer Village Stn', index: 2, onCollision: 'error' },
    ],
    '29': [
      { addStr: 'Combined/Average', afterStr: '69B Warden Stn-Kingston Rd SB via Birchmount', index: 0, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '69B Warden Stn-Kingston Rd SB via Birchmount', index: 1, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '69B Warden Stn-Kingston Rd SB via Birchmount', index: 2, onCollision: 'error' },
    ],
    '41': [
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn-Steeles via Alness', index: 1, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn-Steeles via Alness', index: 2, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107D Sheppard West Stn-Steeles via Alness & Supertest', onCollision: 'error' },
    ],
  },
  'service_summary_2022_11_20.pdf': {
    '26': [
      { addStr: 'Combined/Average', afterStr: '60B Finch Stn-Martin Grove via Pioneer Village Stn', index: 2, onCollision: 'error' },
    ],
    '29': [
      { addStr: 'Combined/Average', afterStr: '69B Warden Stn-Kingston Rd SB via Birchmount', index: 0, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '69B Warden Stn-Kingston Rd SB via Birchmount', index: 1, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '69B Warden Stn-Kingston Rd SB via Birchmount', index: 2, onCollision: 'error' },
    ],
    '41': [
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn-Steeles via Alness', index: 1, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn-Steeles via Alness', index: 2, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107D Sheppard West Stn-Steeles via Alness & Supertest', onCollision: 'error' },
    ],
  },
  'service_summary_2023_01_08.pdf': {
    '26': [
      { addStr: 'Combined/Average', afterStr: '60B Finch Stn-Martin Grove via Pioneer Village Stn', index: 2, onCollision: 'error' },
    ],
    '29': [
      { addStr: 'Combined/Average', afterStr: '69B Warden Stn-Kingston Rd SB via Birchmount', index: 0, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '69B Warden Stn-Kingston Rd SB via Birchmount', index: 1, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '69B Warden Stn-Kingston Rd SB via Birchmount', index: 2, onCollision: 'error' },
    ],
    '41': [
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn-Steeles via Alness', index: 1, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn-Steeles via Alness', index: 2, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107D Sheppard West Stn-Steeles via Alness & Supertest', onCollision: 'error' },
    ],
  },
  'service_summary_2023_02_12.pdf': {
    '26': [
      { addStr: 'Combined/Average', afterStr: '60B Finch Stn-Martin Grove via Pioneer Village Stn', index: 2, onCollision: 'error' },
    ],
    '29': [
      { addStr: 'Combined/Average', afterStr: '69B Warden Stn-Kingston Rd SB via Birchmount', index: 0, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '69B Warden Stn-Kingston Rd SB via Birchmount', index: 1, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '69B Warden Stn-Kingston Rd SB via Birchmount', index: 2, onCollision: 'error' },
    ],
    '41': [
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn-Steeles via Alness', index: 1, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn-Steeles via Alness', index: 2, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107D Sheppard West Stn-Steeles via Alness & Supertest', onCollision: 'error' },
    ],
  },
  'service_summary_2023_03_26.pdf': {
    '26': [
      { addStr: 'Combined/Average', afterStr: '60B Finch Stn-Martin Grove via Pioneer Village Stn', index: 2, onCollision: 'error' },
    ],
    '29': [
      { addStr: 'Combined/Average', afterStr: '69B Warden Stn-Kingston Rd SB via Birchmount', index: 0, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '69B Warden Stn-Kingston Rd SB via Birchmount', index: 1, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '69B Warden Stn-Kingston Rd SB via Birchmount', index: 2, onCollision: 'error' },
    ],
    '41': [
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn-Steeles via Alness', index: 1, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn-Steeles via Alness', index: 2, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107D Sheppard West Stn-Steeles via Alness & Supertest', onCollision: 'error' },
    ],
  },
  'service_summary_2023_05_07.pdf': {
    '26': [
      { addStr: 'Combined/Average', afterStr: '60B Finch Stn-Martin Grove via Pioneer Village Stn', index: 2, onCollision: 'error' },
    ],
    '29': [
      { addStr: 'Combined/Average', afterStr: '69B Warden Stn-Kingston Rd SB via Birchmount', index: 0, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '69B Warden Stn-Kingston Rd SB via Birchmount', index: 1, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '69B Warden Stn-Kingston Rd SB via Birchmount', index: 2, onCollision: 'error' },
    ],
    '41': [
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn-Steeles via Alness', index: 1, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107B Sheppard West Stn-Steeles via Alness', index: 2, onCollision: 'error' },
      { addStr: 'Combined/Average', afterStr: '107D Sheppard West Stn-Steeles via Alness & Supertest', onCollision: 'error' },
    ],
  },
};

const additional_valid_branches = [
  'Combined/Average',
  'GAP TRAINS',
  'Gap Trains',
  '504/505 Broadview Stn - Queen & River', // service_summary_2014_07_20 page 5
  '504/505 BUS on Broadview', // service_summary_2015_06_21 page 7
  '504/506 Spadina Stn-Front & Cherry', // service_summary_2022_07_31 page 7
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
  '502 DOWNTOWNER and', // service_summary_2018_10_07
  '302 DANFORTH RD-McCOWANU', // service_summary_2018_10_07
  '902 Markham Road Express', // service_summary_2018_10_07
  '905 Eglinton East Express', // service_summary_2018_10_07
  '913 Progress Express', // service_summary_2018_10_07
  '924 Victoria Park Express', // service_summary_2018_10_07
  '925 Don Mills Express', // service_summary_2018_10_07
  '927 Highway 27 Express', // service_summary_2018_10_07
  '929 Dufferin Express', // service_summary_2018_10_07
  '935 Jane Express', // service_summary_2018_10_07
  '937 Islington Express', // service_summary_2018_10_07
  '939 Finch Express', // service_summary_2018_10_07
  '952 Lawrence West Express', // service_summary_2018_10_07
  '954 Lawrence East Express', // service_summary_2018_10_07
  '960 Steeles West Express', // service_summary_2018_10_07
  '984 Sheppard West Express', // service_summary_2018_10_07
  '985 Sheppard East Express', // service_summary_2018_10_07
  '989 Weston Road Express', // service_summary_2018_10_07
  '938 Highland Creek EXPRESS', // service_summary_2021_09_05 page 52
  '128 Stanley Greene', // service_summary_2023_03_26 page 46
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
  '12 Victoria Park Stn - St Clair': '12 KINGSTON RD', // service_summary_2013_11_24 page 31
  '95A York Mills Stn - Kingston Rd': '95 YORK MILLS', // service_summary_2015_06_21 page 74
  '511 Bathurst Stn-Exhibition': '511 BATHURST', // service_summary_2023_02_12 page 8
  '120 Wilson Stn-Sheppard & Jane via de Havilland': '120 CALVINGTON', // service_summary_2023_05_07 page 45
  '202 Union Stn-Cherry Beach': '202 CHERRY BEACH', // service_summary_2023_05_07 page 52
  '83 Donlands Stn - Commissioners': '83 JONES', // service_summary_2020_10_11 page 35
  '508 Long Branch - Parliament': '508 LAKE SHORE', // service_summary_2021_02_14 page 9
  '506B Parliament - Main Street Stn': '506 CARLTON', // service_summary_2021_03_28 page 9
  '134D Scarborough Centre Stn-Finch via Centennial College': '134 PROGRESS', // service_summary_2022_11_20 page 48
  '141 King & Spadina-Lawrence': '141 DOWNTOWN/MT PLEASANT EXPRESS', // service_summary_2023_03_26 page 49
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
  '10 Don Mills Stn - Victoria Park': 'Monday to Friday', // service_summary_2014_08_31 page 52
  '508 Long Branch - Parliament': 'Monday to Friday', // service_summary_2021_02_14 page 9
  '506B Parliament - Main Street Stn': '506 CARLTON', // service_summary_2021_03_28 page 9
  '134D Scarborough Centre Stn-Finch via Centennial College': 'Sunday', // service_summary_2022_11_20 page 48
  '141 King & Spadina-Lawrence': 'Monday to Friday', // service_summary_2023_03_26 page 49
  '506B Parliament - Main Street Stn': 'Sunday', // service_summary_2021_03_28 page 9 - this could be an issue maybe going forward
};

const create_blank_states_if_blank = [
  '407 Sunnybrook Hospital',
];

const dont_append = [
  'First dep',
];

const ignore_branch_if_last_branch_was = {
  '29 To Exhibition (Dufferin Gate)': [
    '29 Wilson Stn-Exhibition (Dufferin Gate)', 
    '29A Tycos Dr-Exhibition (Dufferin Gate)',
    '29A Tycos Dr - Exhibition (Dufferin Gate)',
    '29B Tycos Dr - Exhibition (Dufferin Gate)',
  ],
  '29 To Wilson Stn': [
    '29 Wilson Stn-Queen',
    '29 Wilson Stn-Exhibition (Dufferin Gate)',
    '29D Wilson Stn-Exhibition (Princes Gate)',
  ],
  '29 To Queen': [
    '29 Wilson Stn-Queen',
    '29A Tycos Dr - Queen',
  ],
  '29 Exhibition (Dufferin Gate)': [
    '29 Wilson Stn-to Exhibition (Dufferin Gate)',
  ],
  '29A To Wilson Stn': [
    '29A Wilson Stn-Exhibition (Dufferin Gate)',
    '29C Wilson Stn-Exhibition (Princes Gate)',
    '29C Wilson Stn-Exhibition (Prince Gate)',
  ],
  '29A To Exhibition (Dufferin Gate)': [
    '29A Wilson Stn-Exhibition (Dufferin Gate)',
    '29B Tycos Dr - Exhibition (Dufferin Gate)',
    '29G Dufferin Stn - Exhibition (Dufferin Gate)',
  ],
  '29A To Tycos': [
    '29A Tycos Dr - Queen',
    '29A Tycos Dr-Exhibition (Dufferin Gate)',
    '29A Tycos Dr - Exhibition (Dufferin Gate)',
  ],
  '29B To Exhibition (Dufferin Gate)': [
    '29A Wilson Stn-Exhibition (Dufferin Gate)',
    '29B Tycos Dr - Exhibition (Dufferin Gate)',
  ],
  '29B To Exhibition (Princes Gate)': [
    '29B Wilson Stn-Exhibition (Princes Gate)',
  ],
  '29B To Tycos': [
    '29B Tycos Dr - Exhibition (Dufferin Gate)',
    '29H Tycos Dr - Exhibition (Princes Gate)',
  ],
  '29B To Liberty Village': [
    '29B Wilson Stn-Liberty Village',
    '29B Wilson Stn - Liberty Village',
  ],
  '29B Ontario Place': [
    '29B Wilson Stn-to Ontario Place',
  ],
  '29B To Ontario Place': [
    '29B Wilson Stn-Ontario Place',
  ],
  '29C To Exhibition (Princes Gate)': [
    '29C Wilson Stn-Exhibition (Dufferin Gate)',
    '29C Wilson Stn-Exhibition (Princes Gate)',
    '29C Wilson Stn-Exhibition (Prince Gate)',
    '29H Tycos Dr - Exhibition (Princes Gate)',
  ],
  '29D To Exhibition (Princes Gate)': [
    '29D Wilson Stn-Exhibition (Princes Gate)',
    '29D Wilson Stn - Exhibition (Princes Gate)',
  ],
  '29G To Dufferin Station': [
    '29G Dufferin Stn - Exhibition (Dufferin Gate)',
  ],
  
  '36 to Finch Stn': [
    '36A Finch Stn-Finch West Stn',
    '36B Finch Stn - Finch West Stn',
    '36J Finch Stn-Humberwood',
    '36J Finch Stn - Humberwood',
  ],
  '36A to Finch West Stn': [
    '36B Finch Stn - Finch West Stn',
  ],
  '36A to Humberwood': [
    '36J Finch Stn - Humberwood',
  ],
  '36B to Humberwood': [
    '36J Finch Stn-Humberwood',
  ],

  '85 To Sheppard-Yonge Stn': [
    "85 Sheppard-Yonge Station - Meadowvale",
    '85 Sheppard-Yonge Stn - Meadowvale',
    '85B Sheppard-Yonge Stn-Trnto Zoo',
    '85B Sheppard-Yonge Stn-Toronto Zoo',
    '85B Sheppard-Yonge Stn - Toronto Zoo',
    '85C Don Mills Stn-Meadowvale',
    '85G Shep-Yonge Stn - Rouge Hill GO Stn',
    '85G Sheppard-Yonge Stn - Rouge Hill GO Stn',
    '85J Shep-Yonge Stn-Don Mills Stn',
    '85J Sheppard-Yonge Stn-Don Mills Stn',
    '85J Sheppard-Yonge Stn - Don Mills Stn',
  ],
  '85 To Meadowvale': [
    "85 Sheppard-Yonge Station - Meadowvale",
    "85C Don Mills Stn-Mead'vale",
    '85C Don Mills Stn-Meadowvale',
    '85C Don Mills Stn - Meadowvale',
  ],
  '85A To Don Mills Stn': [
    '85A Don Mills Stn-Rouge Hill GO Stn',
    '85A Don Mills Stn - Rouge Hill GO Stn',
    "85C Don Mills Stn-Mead'vale",
    '85C Don Mills Stn-Meadowvale',
    '85C Don Mills Stn - Meadowvale',
    '85F Don Mills Stn-Toronto Zoo',
    '85F Don Mills Stn - Toronto Zoo',
    '85J Shep-Yonge Stn-Don Mills Stn',
    '85J Sheppard-Yonge Stn - Don Mills Stn',
  ],
  '85A To Rouge Hill GO Stn': [
    '85A Don Mills Stn-Rouge Hill GO Stn',
    '85A Don Mills Stn - Rouge Hill GO Stn',
    '85G Shep-Yonge Stn - Rouge Hill GO Stn',
  ],
  '85A To Don Mills Stn via Toronto Zoo': [
    '85D Don Mills Stn-Rouge Hill GO Stn via Toronto Zoo',
    '85D Don Mills Stn - Rouge Hill GO Stn via Toronto Zoo',
  ],
  '85A To Rouge Hill GO Stn via Toronto Zoo': [
    '85D Don Mills Stn - Rouge Hill GO Stn via Toronto Zoo',
  ],
  '85B To Toronto Zoo': [
    '85B Sheppard-Yonge Stn - Toronto Zoo',
    '85F Don Mills Stn - Toronto Zoo',
    '85F Don Mills Stn-Toronto Zoo',
  ],
  '85G To Sheppard Stn': [
    '85G Sheppard Stn-Rouge Hill GO Stn',
  ],

  '96C To Wilson Stn': [
    '96H Wilson Stn-Thistledown via Albion',
  ],
  '96C To Thistledown via Albion': [
    '96H Wilson Stn-Thistledown via Albion',
    '96H Wilson Stn - Thistled. via Albion',
  ],
  '96F To Tandridge and Isling. via Albion': [
    '96K Wilson Stn - Tandridge & Islington',
    '96K Wilson Stn-Tandridge and Islington',
  ],
  '96S to Wilson Stn': [
    '96H Wilson Stn-Thistledown via Albion',
    '96H Wilson Stn - Thistled. via Albion',
    '96K Wilson Stn-Tandridge and Islington',
    '96K Wilson Stn - Tandridge & Islington',
  ],
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
  console.log({ in: filename, pages: numPages });
  let done = false;
  let processedPages = 0;

  for (let pageNum = START_PAGE; pageNum <= numPages; pageNum++) {
    if (done) break;
    // if (pageNum != 50) { if (pageNum === START_PAGE) console.log(`\n################################\n PROCESSING ONLY A SINGLE PAGE! \n################################`); continue; } // kbfu

    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    let column_header_cells = [];
    let row_header_cells = [];
    const data_cells = [];
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

      if (text_to_skip.includes(str)) continue;
      if (text_to_replace[str] != null) str = text_to_replace[str];

      if (w == 0 || h == 0) continue; // junk

      const spaceBits = str.split(' ');

      // something like 'August 6 to 30'
      if (spaceBits.length === 4 && months.includes(spaceBits[0])
        && [1,3].every(i => parseInt(spaceBits[i]) == spaceBits[i].replace(',',''))) continue;

      // something like 'August 6 to August 30'
      if (spaceBits.length === 5 && months.includes(spaceBits[0]) && months.includes(spaceBits[3])
        && [1,4].every(i => parseInt(spaceBits[i]) == spaceBits[i].replace(',',''))) continue;

      // something like 'August 6 to 30, 2013'
      if (spaceBits.length === 5 && months.includes(spaceBits[0])
        && [1,3,4].every(i => parseInt(spaceBits[i]) == spaceBits[i].replace(',',''))) continue;

      // something like 'February 14 to March 21, 2010'
      if (spaceBits.length === 6 && months.includes(spaceBits[0]) && months.includes(spaceBits[3])
        && [1,4,5].every(i => parseInt(spaceBits[i]) == spaceBits[i].replace(',',''))) continue;

      // something like 'December 14, 2010 to January 21, 2011'
      if (spaceBits.length === 7 && months.includes(spaceBits[0]) && months.includes(spaceBits[4])
        && [1,2,5,6].every(i => parseInt(spaceBits[i]) == spaceBits[i].replace(',',''))) continue;

      const sameIndex = cellsSortedByLength.findIndex((t) => t.x === x && t.y === y && t.str === str);
      if (sameIndex !== -1) { // duplicate found in service_summary_2011_06_19.pdf, page 11 'Scarborough Centre Stn', how annoying
        continue;
      }

      if (str === '' || str === ' ' || str === '-' || str.slice(0, 5) == 'Page ') continue;
      
      const prevIndex = cellsSortedByLength.findIndex((t) => t.y === y && t.h === h && Math.abs(t.x - x + t.w) <= 2);
      const nextIndex = cellsSortedByLength.findIndex((t) => t.y === y && t.h === h && Math.abs(x - t.x - t.w) <= 2);

      if (filename === 'service_summary_2023_06_18.pdf') {
        if (pageNum === 37) {
          if (str === '98') str = '98 WILLOWDALE-SENLAC';
          else if (str === 'WILLOWDALE') continue;
          else if (str === 'SENLAC') continue;
        } else if (pageNum === 46) {
          if (str === '135') str = '135 Warden Stn-Main Street Stn';
          else if (str === 'Warden Stn') continue;
          else if (str === 'Main Street Stn') continue;
        } else if (pageNum === 47) {
          if (str === '162') str = '162 LAWRENCE-DONWAY';
          else if (str === 'LAWRENCE') continue;
          else if (str === 'DONWAY') continue;
        } else if (pageNum === 51) {
          if (str === '929') str = '929 Wilson Stn-Exhibition (Dufferin Gate) Express';
          else if (['Wilson Stn', 'Exhibition', '(', 'Dufferin Gate', ')', 'Express'].includes(str)) continue;
        } else if (pageNum === 55) {
          if (str === '312') str = '312 ST CLAIR-JUNCTION';
          else if (['ST CLAIR', 'JUNCTION'].includes(str)) continue;
        }
      }

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

    // const sum = (arr) => arr.reduce((partialSum, a) => partialSum + a, 0);
    // const nonSpaceCount = (str) => sum(str.split('').map(c => c != ' ' ? 1 : 0));

    for (var i = 0 ; i < cellsSortedByLength.length ; i++) {
      const a = cellsSortedByLength[i];
      let indices = cellsSortedByLength.map((b, j) => 
        j != i && 
        a.x === b.x && 
        a.y === b.y// && 
        // a.str === b.str
        ? j : '').filter(String);
      if (indices.length === 0) continue;
      indices.push(i);
      // sort matches by length and then length of non-space characters
      indices = indices.sort((a, b) => 
        cellsSortedByLength[b].str.length === cellsSortedByLength[a].str.length
        ? cellsSortedByLength[b].str.replaceAll(' ', '').length - cellsSortedByLength[a].str.replaceAll(' ', '').length
        : cellsSortedByLength[b].str.length - cellsSortedByLength[a].str.length);
      // delete everything that's not the biggest
      indices.slice(1).forEach(j => { cellsSortedByLength.splice(j, 1); i--; });
    }

    const toAdd = [
      ...missing_textItems.allFiles?.allPages || [],
      ...missing_textItems.allFiles?.[pageNum] || [],
      ...missing_textItems[filename]?.allPages || [],
      ...missing_textItems[filename]?.[pageNum] || [],
    ];

    toAdd.forEach(add => {
      let anchorsIndices = cellsSortedByLength.map((cell, i) => cell.str === add.afterStr ? i : '').filter(String);
      if (anchorsIndices.length === 0) return;
      let anchors = anchorsIndices.map(i => cellsSortedByLength[i]);
      if (add.index !== undefined && add.index < anchors.length) anchors = [anchors[add.index]];
      if (add.index !== undefined && add.index < anchorsIndices.length) anchorsIndices = [anchorsIndices[add.index]];
      const newCells = anchors.map(anchor => ({
        ...anchor,
        ...{
          x: anchor.x + (add.offset?.x || 0),
          y: anchor.y + (add.onCollision === 'delete' ? 0 : anchor.h) + (add.offset?.y || 1),
          w: add.offset?.w || anchor.w,
          h: add.offset?.h || anchor.h,
          str: add.addStr,
          j: cellsSortedByLength.length,
        }
      }));

      const collisions = newCells.map(cell => cellsSortedByLength.map((t, i) => testCollideX(cell, t) && testCollideY(cell, t) ? i : '').filter(String));

      if (add.onCollision === 'delete') {
        // console.log(collisions)
        console.log(`deleting: [${collisions.map(coll => coll.map(i => `'${cellsSortedByLength[i].str}'`)).join(', ')}]`)
        collisions.forEach(coll => coll.sort((a, b) => b - a).forEach(i => { cellsSortedByLength.splice(i, 1); }));
      } else if (add.onCollision === 'nothing') {
        // don't add
        return;
      } else if (add.onCollision === 'error' && collisions[0].length > 0) {
        console.log(cellsSortedByLength.length);
        console.log({ add, anchorsIndices, anchors, newCells, collisionsI: collisions, collisions: collisions.map(c => c.map(d => JSON.stringify(cellsSortedByLength[d]))) });
        console.log(cellsSortedByLength.length);
        asdf
      }

      console.log(`inserting '${add.addStr}' anchored to ${add.afterStr}`)
      // default ignore collision, add
      // console.log(cellsSortedByLength.length);
      cellsSortedByLength.push(...newCells);
    });

    cellsSortedByLength.sort((a, b) => b.w === a.w ? a.j - b.j : b.w - a.w);

    if (primaryCorner.x === 0) {
      // console.log(`skipping page ${pageNum} (header not found)`);
      continue;
    }

    let cellsFiltered = [];
    for (var i = 0 ; i < cellsSortedByLength.length ; i++) {
      let { x, y, w, h, j, str } = cellsSortedByLength[i];

      const collidesWith = cellsFiltered
        .filter(t => t.x < 900) // solves the weird problem where lots of first/last departures overlap a bit
        .filter(t => t.y === y) // sigh, this is bad, but solves the problem where branch names are just barely touching
        .filter((t) => testCollideX({ x, w }, t) && testCollideY({ y, h }, t));
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

      // too wide for any branch or anything, gotta be a note
      if (w > secondaryCorner.x) {
        continue;
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

      cellsFiltered.push({ x, y, w, h, j, str });
    }

    const cellsSortedYX = cellsFiltered.sort((a, b) => a.y === b.y ? a.x - b.x : a.y - b.y);

    for (var i = 0 ; i < cellsSortedYX.length ; i++) {
      let { x, y, w, h, j, str } = cellsSortedYX[i];

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

      const prevService = states.service[states.service.length - 1];
      const prevRoute = states.route[states.route.length - 1];
      const prevBranch = states.branch[states.branch.length - 1];
      const prevYard = states.yard[states.yard.length - 1];

      if (ignore_branch_if_last_branch_was[str] !== undefined && prevBranch && ignore_branch_if_last_branch_was[str].includes(prevBranch.str)) {
        continue;
      }

      const spaceSplit = str.trim().replaceAll(',', '').split(' ');
      if (spaceSplit.length === 4 && spaceSplit[0] === 'Beginning' && months.includes(spaceSplit[1]) && parseInt(spaceSplit[3]) == spaceSplit[3]) {
        // something like 'Beginning November 20 2011'
        continue;
      }

      // kbfu
      if (1
          // && pageNum == 23

          // && (
          //   str == '501 Sunnyside-Neville Park via McCaul Dundas and Broadview'
          //   || str == '501 Sunnyside-Neville Park via McCaul'
          //   || str == ' Dundas'
          //   || str == ' and Bvw'
          //   || str.slice(0, 13) == '501 Sunnyside'
          // )
      //     prevService.str === 'Saturday'
      ) {
      //   // console.log(states);
        // console.log({ x, y, w, h, pageNum, str, prevBranch, prevService });
        // asdf
      }

      // if (pageNum == 23 && str == 'Combined/Average') {
      //   console.log({ x, y, w, h, str, prevBranch });
      //   // asdf
      // }

      if (text_is_a_note.includes(str)) continue;

      if (y > primaryCorner.y) { // not part of the header at all
        if (x < secondaryCorner.x - 40) { // first column, routes / services / branches
          if (str === '8' || str === '8\x03') { // some sort of shit encoding thing for a wheelchair logo
            // console.log("'8' isn't a route/service/branch on it's own");
          } else if (text_is_a_route.includes(str) || (str === str.toUpperCase() && parseInt(str) && str.length > 3)) { // all caps, starts with number
            if (str.slice(-1) === '8') str = str.slice(0, -1);
            states.route.push({ x, y, h, str });
            if (str.search(',') !== -1) console.log(`new route "${str}" has a comma`);
            if (debug) console.log(`new route ${str}`);
          } else if (prevRoute && prevRoute.str.slice(-1) === '/') {
            prevRoute.str += str.trim();
            prevRoute.h = y + h - prevRoute.y;
            if (str.search(',') !== -1) console.log(`append route "${str}" has a comma`);
            if (debug) console.log(`append route ${str}`);
          } else if (['Monday to Friday', 'Saturday', 'Sunday'].includes(str) || str.slice(0, 9) === 'Overnight') { // it's a service
            states.service.push({ y, h, str: str.replace(',', '') });
            if (debug) console.log(`new service ${str}`);
          } else if (prevRoute && parseInt(str) && parseInt(str) === parseInt(prevRoute.str)) { // if line "parseInt" matches route "parseInt" then it's a branch
            states.branch.push({ y, h, str: str.replaceAll(' - ', '-').replaceAll(' -', '-').replaceAll('- ', '-') });
          } else if (str.slice(0, 8) === 'Standby ' || str.slice(0, 15) === 'Service relief ') {
            states.branch.push({ y, h, str: str.replaceAll(' - ', '-').replaceAll(' -', '-').replaceAll('- ', '-') });
          } else if (additional_valid_branches.includes(str)) {
            states.branch.push({ y, h, str: str.replaceAll(' - ', '-').replaceAll(' -', '-').replaceAll('- ', '-') });
          } else if (prevRoute && parseInt(str) && parseInt(str) != undefined && parseInt(prevRoute.str) != undefined) { // if line "parseInt" doesn't matches but it's still a number at least
            if ((conjoined_routes_for_some_reason[`${parseInt(str)}`] || []).includes(parseInt(prevRoute.str))) {
              // console.log({ msg: `branch is weird, route: ${prevRoute.str}`, pageNum, x, y, str }); // this should never console.log anything
              states.branch.push({ y, h, str: str.replaceAll(' - ', '-').replaceAll(' -', '-').replaceAll('- ', '-') });
              if (str.search(',') !== -1) console.log(`new branch "${str}" has a comma`);
              if (debug) console.log(`new branch ${str}`);
            } else {
              console.log({ msg: `branch is extra weird`, prevRoute, prevBranch, pageNum, x, y, str }); // this should never console.log anything
              asdf
              // states.branch.push({ y, h, str });
            }
          } else if (prevBranch && branch_text_to_always_append.includes(str)) {
            prevBranch.str += ` ${str}`;
            prevBranch.str = prevBranch.str.replaceAll(' - ', '-').replaceAll(' -', '-').replaceAll('- ', '-');
            prevBranch.h = y + h - prevBranch.y;
            if (str.search(',') !== -1) console.log(`append branch "${str}" has a comma`);
            if (debug) console.log(`append branch ${str}`);
          } else if (prevBranch && (prevBranch.str.slice(-1) === '-' || prevBranch.str.slice(-1) === '-')) {
            prevBranch.str += str;
            prevBranch.str = prevBranch.str.replaceAll(' - ', '-').replaceAll(' -', '-').replaceAll('- ', '-');
            prevBranch.h = y + h - prevBranch.y;
            if (str.search(',') !== -1) console.log(`append branch "${str}" has a comma`);
            if (debug) console.log(`append branch ${str}`);
          } else if (prevBranch && prevBranch.str.slice(-4) === ' and') { // if prev end in "-" then simply append to that
            prevBranch.str += ` ${str}`;
            prevBranch.str = prevBranch.str.replaceAll(' - ', '-').replaceAll(' -', '-').replaceAll('- ', '-');
            prevBranch.h = y + h - prevBranch.y;
            if (str.search(',') !== -1) console.log(`append branch "${str}" has a comma`);
            if (debug) console.log(`append branch ${str}`);
          } else if (prevBranch && prevBranch.str.slice(-4) === ' via') { // if prev end in "-" then simply append to that
            prevBranch.str += ` ${str}`;
            prevBranch.str = prevBranch.str.replaceAll(' - ', '-').replaceAll(' -', '-').replaceAll('- ', '-');
            prevBranch.h = y + h - prevBranch.y;
            if (str.search(',') !== -1) console.log(`append branch "${str}" has a comma`);
            if (debug) console.log(`append branch ${str}`);
          } else if (str.indexOf('via ') != -1
                  || str.indexOf('Via ') != -1
                  || str.slice(0, 2) === '- '
                  || str.slice(0, 1) === '('
                  || str.slice(0, 4) === 'and '
                  || str.slice(0, 7) === 'Express') {
            if (prevBranch === undefined) {
              console.log('oh no', {pageNum, str, states});
              asdf
            }
            prevBranch.str += ` ${str.trim()}`;
            prevBranch.str = prevBranch.str.replaceAll(' - ', '-').replaceAll(' -', '-').replaceAll('- ', '-');
            prevBranch.h = y + h - prevBranch.y;
            if (str.search(',') !== -1) console.log(`append branch "${str}" has a comma`);
            if (debug) console.log(`append branch ${str}`);
          } else if (prevRoute && str === str.toUpperCase()) {
            prevRoute.str += ` ${str}`;
            if (str.search(',') !== -1) console.log(`append route "${str}" has a comma`);
            if (debug) console.log(`append route ${str}`);
          } else {
            // console.log('bad', j);
            states.branch.push({ y, h, str });
            // console.log(states);

            // for (var k = i - 10 ; k < i + 10 ; k++) {
            //   console.log(k, cellsSortedYX[k]);
            // }

            console.log({ primaryCorner, secondaryCorner, msg: 'branch is weird', prevRoute, prevBranch, pageNum, x, y, w, h, j, str }); // this should never console.log anything
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
              str = new Array(...new Set(str.replaceAll(' ', '').split('/'))).sort().join('/');
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
        column_header_cells.push({ x, y, w, h, j, str });
      }
    }

    // console.log(states)

    if (skipPage) continue;
    if (done) break;

    let columns = [];
    for (var j = 0 ; j < column_header_cells.length ; j++) {
      const cell = column_header_cells[j];

      column_header_cells[j].columns = [];
      columns.forEach((column, i) => {
        if (testCollideX(cell, column)) {
          column_header_cells[j].columns.push(i);
          columns[i].x = Math.min(columns[i].x, cell.x);
          columns[i].rows[cell.y] = cell.str;
          columns[i].str = Object.values(columns[i].rows).join(' ');
        }
      });
      if (column_header_cells[j].columns.length === 0) {
        columns.push({x: cell.x, w: cell.w, j: cell.j, str: cell.str, rows: {[cell.y]: cell.str}});
        column_header_cells[j].columns = [columns.length - 1];
      }
    }

    columns = columns.sort((a, b) => a.x - b.x);
    columns.forEach((column, i) => column.id = i);

    for (var j = 0 ; j < data_cells.length ; j++) {
      const cell = data_cells[j];
      data_cells[j].columns = columns.filter(column => testCollideX(cell, column)).map(column => column.id);

      if (text_is_a_note.includes(cell.str)) continue;

      if (data_cells[j].columns.length === 1) {
        data_cells[j].states = states_at(cell);
      } else {
        // prolly a note (automatically made a note)
      }
    }

    if (columns.length === 0) { // page isn't data
      break;
    }

    if (columns.length !== 6 * 5 + 4) {
      console.log({pageNum, columns}, columns.length);
      asdf
    }

    assert(columns.length === 6 * 5 + 4);
    // console.log(data_cells.slice(5, 7));

    // 'Veh type', 'No. of Veh', 'Service interval', 'Run time (min)', 'Term time (min)', 'Avg spd (km/h)', 
    // 'Veh type', 'No. of Veh', 'Service interval', 'Run time (min)', 'Term time (min)', 'Avg spd (km/h)', 
    // 'Veh type', 'No. of Veh', 'Service interval', 'Run time (min)', 'Term time (min)', 'Avg spd (km/h)', 
    // 'Veh type', 'No. of Veh', 'Service interval', 'Run time (min)', 'Term time (min)', 'Avg spd (km/h)', 
    // 'Veh type', 'No. of Veh', 'Service interval', 'Run time (min)', 'Term time (min)', 'Avg spd (km/h)', 
    // 'First dep NB or WB', 'First dep SB or EB', 'Last dep NB or WB', 'Last dep SB or EB'

    const veh_type_column_ids  = [ 0, 6, 12, 18, 24 ];
    // const num_veh_column_ids   = veh_type_column_ids.map(i => i + 1);
    // const interval_column_ids  = veh_type_column_ids.map(i => i + 2);
    // const run_time_column_ids  = veh_type_column_ids.map(i => i + 3);
    // const term_time_column_ids = veh_type_column_ids.map(i => i + 4);
    // const avg_spd_column_ids   = veh_type_column_ids.map(i => i + 5);

    states.branch.every(branch => {
      let { route, service, yard, last_change, rt_distance } = states_at(branch);

      const row = data_cells.filter(cell => cell.states 
        && cell.states.branch === branch
        && cell.states.route === route
        && cell.states.service === service);

      let cells = Object.fromEntries(row.filter(cell => cell.columns.length === 1).map(cell => ([parseInt(cell.columns[0]), cell])));
      
      const a = [0,1,2,3,4,5].map(i => cells[i]).filter(a => a);
      const b = [6,7,8,9,10,11].map(i => cells[i]).filter(a => a);
      const c = [12,13,14,15,16,17].map(i => cells[i]).filter(a => a);
      const d = [18,19,20,21,22,23].map(i => cells[i]).filter(a => a);
      const e = [24,25,26,27,28,29].map(i => cells[i]).filter(a => a);
      const f = [30,31,32,33].map(i => cells[i]).filter(a => a);

      // if it doesn't have a full summary for a timeframe, well make it a note i guess
      if (a.length != 0 && a.length != 6) { a.forEach(cell => cell.note = true); }
      if (b.length != 0 && b.length != 6) { b.forEach(cell => cell.note = true); }
      if (c.length != 0 && c.length != 6) { c.forEach(cell => cell.note = true); }
      if (d.length != 0 && d.length != 6) { d.forEach(cell => cell.note = true); }
      if (e.length != 0 && e.length != 6) { e.forEach(cell => cell.note = true); }
      if (f.length != 0 && f.length != 4) { f.forEach(cell => cell.note = true); }

      return true; // for the 'every'
    });

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
        && cell.states.service === service
        && cell.note == undefined);
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
        // let val = cells.map(c => c.str.slice(-1) === '-' ? c.str : `${c.str} `).join('').trim() || '';
        let val = cells.map(c => c.str).join(' ') || '';

        if (veh_type_column_ids.includes(column)) {
          val = val.replaceAll(' ', '/')
            .split('/').map(c => c.trim()).filter(c => c).sort().join('/');
          if (val === 'A/Bus/Bus') val = 'ABus/Bus'; // service_summary_2016_03_27 page 22
        }

        csvrow.push(val);
      }
      csvrows.push(csvrow);
      return true; // for the 'every'
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
        columns: cell.columns,
        x: cell.x,
        y: cell.y,
        w: cell.w,
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
    processedPages++;

    page.cleanup();
  }

  let csvheader = 'file,page,route,branch,service,yard,last_change,rt_distance'
  for (var j = 0 ; j < 5 ; j++) {
    csvheader += ',veh_type,num_veh,interval,run_time,term_time,avg_spd';
  }
  csvheader += ',first_nb_wb,first_sb_eb,last_nb_wb,last_sb_eb';

  const outputFile = `output/${filename}.csv`;
  const outputNoteFile = `output/${filename}.notes.csv`;

  console.log({ out: `${filename}.csv`, lines: csvrows.length, processedPages });

  if (notes.length > 0) {
    let notesheader = Object.keys(notes[0]);
    fs.writeFileSync(outputNoteFile, Object.keys(notes[0]) + "\n" + notes.map(row => '"' + Object.values(row).map(cell => `${cell}`.replace('"', '\\"')).join('", "') + '"').join("\n"));
    console.log({ out: `${filename}.notes.csv`, notes: notes.length });
  }

  fs.writeFileSync(outputFile, csvheader + "\n" + csvrows.join("\n"));
  // fs.writeFileSync('output/' + filename + '.notes.csv', csvheader + "\n" + notes.join("\n"));

  // console.log(skippedText)
  // console.log(notes)

};

(async function () {
  console.log('=================');
  console.log({ operation: 'Parse PDFs', numFiles: allFiles.length });
  for (var i = 0 ; i < allFiles.length ; i++) {
    const filename = allFiles[i];
    // console.log(filename);
    await parseFile(filename);
    // if (i > 2) break;
  }
})();

