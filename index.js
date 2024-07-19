//* *** Publishing Reporter ***

// ====================
// Author: Tim Fletcher
// Date: 2024-07-17
// Source location: https://github.com/parks-australia/drupal-publishing-reporter
// ====================

// - Fetches Views data from Drupal for each parks visitor site at
//     /jsonapi/views/publishing_report/default
// - Sends results back to Drupal via JSON API to create a record for reporting
// - NOTE: Drupal expects View date/time arguments in AEST

require("dotenv").config();

const fs = require("fs");
const util = require("util");

// Ignore SSL issues for local testing
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const apiKey = process.env.DRUPAL_API_KEY,
  drupalSite = process.env.DRUPAL_DOMAIN,
  debugMode = isStrTrue(process.env.DEBUG_MODE) | false;

function isStrTrue(str) {
  return str === "true" ? true : false;
}

// To avoid hassles with daylight savings, we convert the date to AEST and
// output it in a consistent format we can slice
// Outputs date as `dd/mm/yyyy, hh:mm:ss PM`
function convertDateToAEST(date) {
  return date.toLocaleString("en-US", {
    timeZone: "Australia/Sydney",
  });
}
function formatDate(date) {
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
const dateInit = convertDateToAEST(new Date()),
  getLastMonthStartDate = (date) => {
    let newDate = new Date(date);
    newDate.setDate(1);
    newDate.setMonth(newDate.getMonth() - 1);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
  },
  getLastMonthEndDate = (date) => {
    let newDate = new Date(getLastMonthStartDate(date));
    newDate.setMonth(newDate.getMonth() + 1);
    newDate.setDate(newDate.getDate() - 1);
    newDate.setHours(23, 59, 59, 999);
    return newDate;
  },
  startDate = formatDate(getLastMonthStartDate(dateInit)),
  endDate = formatDate(getLastMonthEndDate(dateInit));

// Build the date strings to be used in the Drupal View query parameter
const year = startDate.slice(6, 10),
  month = startDate.slice(0, 2),
  lastDay = endDate.slice(3, 5),
  dateRange = {
    start: `${year}-${month}-01 00:00:00`,
    end: `${year}-${month}-${lastDay} 23:59:59`,
  };

// Capture the script output in logs
const time = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
let log_file = fs.createWriteStream(
  __dirname + `/logs/reporter-${time}UTC.log`,
  { flags: "w" }
);
let log_stdout = process.stdout;
// Remap console.log to write to the log file
console.log = function (d) {
  log_file.write(`[INFO] ${util.format(d)}\n`);
  log_stdout.write(`[INFO] ${util.format(d)}\n`);
};
console.warn = function (d) {
  log_file.write(`[WARN] ${util.format(d)}\n`);
  log_stdout.write(`[WARN] ${util.format(d)}\n`);
};
console.error = function (d) {
  log_file.write(`[ERROR] ${util.format(d)}\n`);
  log_stdout.write(`[ERROR] ${util.format(d)}\n`);
};
console.debug = function (d) {
  log_file.write(`[DEBUG] ${util.format(d)}\n`);
  log_stdout.write(`[DEBUG] ${util.format(d)}\n`);
};
console.dir = function (d) {
  log_file.write(`${util.format(d)}\n`);
  log_stdout.write(`${util.format(d)}\n`);
};

console.log(
  `Running Drupal Publishing Reporter for ${year}-${month} at ${new Date().toISOString()} UTC...`
);

debugMode && console.debug("Debugging enabled!");

if (!apiKey) {
  console.error("API key not found in environment variables, quitting...");
  return;
}
if (!drupalSite) {
  console.error(
    "Drupal domain not found in environment variables, quitting..."
  );
  return;
}

const domain = drupalSite;
let sitesList = [
    "amp",
    "anbg",
    "bnp",
    "cinp",
    "corp",
    "knp",
    "ninp",
    "pknp",
    "uktnp",
  ],
  reportUrl = `${domain}/jsonapi/views/publishing_report/default?views-filter%5Bchanged%5D%5Bmin%5D=${encodeURI(
    dateRange.start
  )}&views-filter%5Bchanged%5D%5Bmax%5D=${encodeURI(
    dateRange.end
  )}&views-filter%5Bfield_site_target_id%5D=`;

const structure = {
  data: {
    type: "taxonomy_term--reporting_entries",
    attributes: {
      name: `${year}-${month}`,
    },
  },
};

const fetchJsonData = async (url) => {
  let options = {
    headers: {
      Method: "GET",
      Header: "Access-Control-Allow-Origin",
    },
  };
  try {
    const response = await fetch(url, options);

    if (response.status !== 200) {
      let msg = `[ERROR - Data]: No data fetched for: \n${url}\nReceived response: \n${response.status} ${response.statusText}`;
      throw new Error(msg);
    } else {
      const jsonData = await response.json();
      if (jsonData.data !== null && jsonData.data !== undefined) {
        return jsonData;
      }
    }
  } catch (error) {
    console.error(error);
  }
};

console.log(`Preparing to collect reporting data for ${year}-${month}...`);

console.log(
  `Checking if term '${year}-${month}' already exists in Drupal's 'Reporting entries' taxonomy...`
);

async function allowNewTerm() {
  let url = `${domain}/jsonapi/taxonomy_term/reporting_entries?filter%5Bname%5D%5Bvalue%5D=${year}-${month}`;
  const data = await fetchJsonData(url);

  let newTerm = new Promise((resolve, reject) => {
    data && data.data && data.data.length >= 0 && parseInt(data.meta.count) < 1
      ? resolve(`Term '${year}-${month}' does not exist, proceeding...`)
      : reject(new Error(`Term '${year}-${month}' already exists, quiting!`));
  });
  return await newTerm;
}

async function getSiteChangesData(data, site) {
  let siteChanges = new Promise((resolve, reject) => {
    if (data && data.data && data.data.length >= 0) {
      if (parseInt(data.meta.count) === 1) {
        console.log(`${data.meta.count} changed page for ${site}`);
      } else {
        console.log(`${data.meta.count} changed pages for ${site}`);
      }
      const targetProp = `field_reporting_${site}_figure`;
      structure.data.attributes[targetProp] = parseInt(data.meta.count);
      resolve(`Change data for '${site}' retrieved successfully`);
    } else {
      reject(`Failed to retrieve change data for '${site}'`);
    }
  }).catch((error) => {
    new Error(error);
  });
  return await siteChanges;
}

// Only request the rest of the data if the record doesn't exist in Drupal
Promise.all([allowNewTerm()])
  .then(async () => {
    console.log(
      `Gathering changed pages for each site from ${dateRange.start} to ${dateRange.end}...`
    );

    for (let i = 0; i < sitesList.length; i++) {
      let url = `${reportUrl}${i + 1}`;

      debugMode && console.debug(`${url}`);

      const data = await fetchJsonData(url);
      let siteData = await getSiteChangesData(data, sitesList[i]);

      debugMode && console.debug(`Promise response: ${siteData}`);
    }

    console.log("Reporting data collected!");

    debugMode && console.debug("Data to submit to Drupal:");
    debugMode && console.dir(structure, { depth: null });

    const headers = {
      "Content-type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
      "api-key": `${apiKey}`,
    };

    // Only submit report if successful

    // Build the Fetch POST request to send data to Drupal to create a new
    // reporting Taxonomy Term
    const drupalPost = await fetch(
      `${domain}/jsonapi/taxonomy_term/reporting_entries`,
      {
        method: "POST",
        headers: headers,
        body: JSON.stringify(structure),
      }
    );

    const drupalResponse = await drupalPost;

    if (parseInt(drupalResponse.status) === 201) {
      console.log(
        `Reporting term '${structure.data.attributes.name}' created successfully!`
      );
    } else {
      console.error(
        `Issue encountered while attempting to create reporting term:`
      );
      console.error(
        `Drupal response: ${drupalResponse.status}: ${drupalResponse.statusText}`
      );
    }
    console.log("Script complete!");
  })
  .catch((error) => {
    console.error(error);
  });
