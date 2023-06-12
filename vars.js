
const allFiles = [
  'service_summary_2008_03_30.pdf',
  'service_summary_2008_06_22.pdf','service_summary_2008_08_31.pdf','service_summary_2008_11_23.pdf',
  'service_summary_2009_01_04.pdf','service_summary_2009_02_15.pdf','service_summary_2009_05_10.pdf','service_summary_2009_06_21-v2.pdf','service_summary_2009_09_06.pdf','service_summary_2009_10_18-rev.pdf','service_summary_2009_11_22.pdf',
  'service_summary_2010_01_03.pdf','service_summary_2010_03_28_v2.pdf','service_summary_2010_05_09.pdf','service_summary_2010_06_20.pdf','service_summary_2010_09_05.pdf','service_summary_2010_10_10.pdf','service_summary_2010_11_21.pdf',
  'service_summary_2011_01_02.pdf','service_summary_2011_03_27_rev_2.pdf','service_summary_2011_05_08.pdf','service_summary_2011_06_19.pdf','service_summary_2011_09_04.pdf','service_summary_2011_10_09.pdf',
  'service_summary_2012_01_08.pdf','service_summary_2012_02_12.pdf','service_summary_2012_03_25.pdf','service_summary_2012_05_06.pdf','service_summary_2012_06_17.pdf','service_summary_2012_07_29.pdf',
  // // 'service_summary_2012_09_02.pdf', // page 22 has a bit of weirdness (missing field on 100D)
  // // 'service_summary_2012_10_07.pdf', // 320A is split between page 58/59, so the missing_textItems rule breaks, some problems with route 131 NUGGET
  'service_summary_2012_11_18.pdf',
  'service_summary_2013_03_31.pdf','service_summary_2013_05_12.pdf','service_summary_2013_06_23.pdf','service_summary_2013_09_01.pdf','service_summary_2013_10_13.pdf','service_summary_2013_11_24.pdf',
  'service_summary_2014_01_05.pdf','service_summary_2014_03_30.pdf','service_summary_2014_05_11.pdf',
  'service_summary_2014_06_22.pdf','service_summary_2014_07_20.pdf','service_summary_2014_08_31.pdf','service_summary_2014_10_12.pdf','service_summary_2014_11_23.pdf',
  'service_summary_2015_01_04.pdf','service_summary_2015_02_15.pdf','service_summary_2015_03_29.pdf','service_summary_2015_05_10.pdf','service_summary_2015_06_21.pdf',
  'service_summary_2016_03_27.pdf','service_summary_2016_05_08.pdf','service_summary_2016_06_19.pdf','service_summary_2016_07_31.pdf','service_summary_2016_09_04.pdf','service_summary_2016_10_09.pdf','service_summary_2016_11_20.pdf',
  'service_summary_2017_01_08.pdf','service_summary_2017_02_12.pdf','service_summary_2017_03_26.pdf','service_summary_2017_05_07.pdf','service_summary_2017_06_18.pdf','service_summary_2017_07_30.pdf','service_summary_2017_09_03.pdf','service_summary_2017_10_15.pdf','service_summary_2017_11_26.pdf',
  'service_summary_2018_01_07.pdf','service_summary_2018_02_18.pdf','service_summary_2018_04_01.pdf','service_summary_2018_05_13.pdf','service_summary_2018_06_24.pdf','service_summary_2018_10_07.pdf',
  'service_summary_2019_01_06.pdf','service_summary_2019_02_17.pdf','service_summary_2019_03_31.pdf','service_summary_2019_05_12.pdf','service_summary_2019_06_23.pdf','service_summary_2019_08_04.pdf','service_summary_2019_09_01.pdf','service_summary_2019_10_13.pdf','service_summary_2019_11_24.pdf',
  'service_summary_2020_01_05.pdf','service_summary_2020_02_16.pdf','service_summary_2020_03_29.pdf','service_summary_2020_06_21.pdf','service_summary_2020_10_11.pdf','service_summary_2020_11_22.pdf',
  'service_summary_2021_01_03.pdf','service_summary_2021_02_14.pdf','service_summary_2021_03_28.pdf','service_summary_2021_05_09.pdf','service_summary_2021_06_20.pdf','service_summary_2021_08_01.pdf','service_summary_2021_09_05.pdf','service_summary_2021_10_10.pdf','service_summary_2021_11_21.pdf',
  'service_summary_2022_01_02.pdf','service_summary_2022_02_13.pdf','service_summary_2022_03_27.pdf','service_summary_2022_05_08.pdf','service_summary_2022_06_19.pdf','service_summary_2022_07_31.pdf','service_summary_2022_09_04.pdf','service_summary_2022_11_20.pdf',
  'service_summary_2023_01_08.pdf','service_summary_2023_02_12.pdf','service_summary_2023_03_26.pdf','service_summary_2023_05_07.pdf',

  // all "good" above
  // all "bad" below

  // 'service_summary_2013_01_06.pdf', // this file is super fucked
  // 'service_summary_2015_09_06.pdf','service_summary_2015_10_11.pdf','service_summary_2015_11_22.pdf', // 33 has invalid branches called 135
  // 'service_summary_2016_01_03.pdf','service_summary_2016_02_14.pdf', // 33 has invalid branches called 135
  // 'service_summary_2018_09_02.pdf', // branch issue, 939 and branch 199 page 59
  // 'service_summary_2018_11_18.pdf', // branch issue, 941 and branch 900 page 57
];

const yards = {
  "Arr": "Arrow Road", // probably
  "Arrow": "Arrow Road", // service_summary_2012_06_17 page 8
  "Qswy": "Queensway", // service_summary_2012_06_17 page 8
  "sy": "Queensway", // service_summary_2012_06_17 page 50
  "s": "Queensway", // service_summary_2012_06_17 page 50, dang it man
  "Hill": "Hillcrest", // probably
  "Arw": "Arrow Road", "Bir": "Birchmount", "DanSub": "Danforth Subway", "Egl": "Eglinton",
  "GrnSub": "Greenwood Subway", "Les": "Leslie", "Mal": "Malvern", "McN": "McNicoll",
  "MtD": "Mount Dennis", "Qsy": "Queensway", "Ron": "Roncesvalles", "Rus": "Russell", "Russ": "Russell",
  "WilSub": "Wilson Subway", "W-T": "Wheel-Trans", "Wil": "Wilson Bus",
  "Will": "Wilson Subway", // service_summary_2013_11_24 page 6, 25
  "Ronc": "Roncesvalles", // service_summary_2019_02_17 page 9
};

const vehicles = [
  "6carT", "4carT", "4carS", "LFsc", "LF", "Bus", "ABus", "CB", "WT", // newest
  "6carHT", "HF", "LF", "Lift", "CLRV", "ALRV", // old
  "Artic", "Abus",
];

const vehicles_names = {
  "6carT": "Six-car train of T- or TR-series 23-metre subway cars (Lines 1 and 2)",
  "4carT": "Four-car train of TR-series 23-metre subway cars (Line 4)",
  "4carS": "Four-car train of S-series 13-metre subway cars (Line 3)",
  "LFsc": "30-metre low-floor streetcar (Bombardier Flexity)",
  "Bus": "12-metre bus (Orion VII, Nova LFS)",
  "ABus": "18-metre articulated bus (Nova LFS Artic)",
  "CB": "8-metre Community Bus (Friendly Bus, Orion II)",
  "WT": "8-metre Wheel-Trans bus (Friendly Bus, ProMaster)",

  "Artic": "18-metre low-floor articulated accessible bus (Nova)", // service_summary_2014_03_30 page 9

  // older
  "6carHT": "Six-car train of H- or T- or TR-series 23-metre subway cars",
  "CLRV": "15-metre high-floor streetcar (Canadian Light Rail Vehicle)",
  "ALRV": "Articulated 23-metre high-floor streetcar (Articulated Light Rail Vehicle)",
  "LF": "12-metre low-floor accessible bus (New Flyer D40LF, Orion VII)",
  "Lift": "12-metre high-floor lift-equipped accessible bus (Orion V with lift and Nova RTS with lift)",
  "HF": "12-metre high-floor bus (GM “New Look,” GM/MCI Classic, and Orion V)",
};

const services = [
  'Monday to Friday',
  'Saturday',
  'Sunday',
  'Overnight',
  'Overnight - 7 days a week',
  'Overnight - Monday to Friday',
  'Overnight - Saturday',
  'Overnight - Sunday',
  'Overnight Monday to Friday',
  'Overnight Saturday and Sunday',
];

module.exports = {
  allFiles,
  yards,
  vehicles,
  services,
};
