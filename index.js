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

// Ignore SSL issues for local testing
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const apiKey = process.env.DRUPAL_API_KEY,
  debugMode = isStrTrue(process.env.DEBUG_MODE);

if (!apiKey) {
  throw new Error("API key not found in environment variables");
}

function isStrTrue(str) {
  return str === "true" ? true : false;
}

if (debugMode) {
  console.log("\n[DEBUG] Debugging enabled!\n");
}
  // To avoid hassles with daylight savings, we convert the date to AEST and
  // output it in a consistent format we can slice
  // Outputs date as `dd/mm/yyyy, hh:mm:ss PM`
  function convertDate(date) {
    return date.toLocaleString("en-US", {
      timeZone: "Australia/Sydney",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

const getLastMonthEndDate = () => {
    let date = new Date();
    date.setDate(1);
    date.setDate(date.getDate() - 1);
    date.setHours(23, 59, 59, 999);
    return date;
  },
  endDate = convertDate(getLastMonthEndDate()),
  getLastMonthStartDate = () => {
    let date = new Date(endDate);
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  },
  startDate = convertDate(getLastMonthStartDate());

// Build the date strings to be used in the Drupal View query parameter
const year = startDate.slice(6, 10),
  month = startDate.slice(0, 2),
  lastDay = endDate.slice(3, 5),
  dateRange = {
    start: `${year}-${month}-01 00:00:00`,
    end: `${year}-${month}-${lastDay} 23:59:59`,
  };

const domain = "https://parksaustralia-cms.lndo.site";
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
];

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
      throw new Error(
        `[ERROR - Data]: No data fetched for: \n${url}\nReceived response: \n${response.status} ${response.statusText}`
      );
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

console.log(
  `\n[INFO] Gathering changed pages for each site from ${dateRange.start} to ${dateRange.end}...\n`
);

const promises = sitesList.map(async (site, index) => {
  let url = `${domain}/jsonapi/views/publishing_report/default?views-filter%5Bchanged%5D%5Bmin%5D=${encodeURI(
    dateRange.start
  )}&views-filter%5Bchanged%5D%5Bmax%5D=${encodeURI(
    dateRange.end
  )}&views-filter%5Bfield_site_target_id%5D=${index + 1}`;

  if (debugMode) {
    console.log(`[DEBUG] ${url}`);
  }

  const data = await fetchJsonData(url);

  if (data && data.data && data.data.length >= 0) {
    if (parseInt(data.meta.count) === 1) {
      console.log(`[INFO] ${data.meta.count} changed page for ${site}`);
    } else {
      console.log(`[INFO] ${data.meta.count} changed pages for ${site}`);
    }
    const targetProp = `field_reporting_${site}_figure`;
    structure.data.attributes[targetProp] = parseInt(data.meta.count);
  } else {
    console.log(`[WARNING] No data found for ${site}`);
  }
});

Promise.all(promises)
  .then(async () => {
    submitReport = true;

    console.log("\n[INFO] Reporting data collected!\n");

    if (debugMode) {
      console.log("[DEBUG] Data to submit to Drupal:");
      console.dir(structure, { depth: null });
    }

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
      console.log(`[INFO] Reporting term '${structure.data.attributes.name}' created successfully!`);
    } else {
      console.log(
        `[ERROR] Issue encountered while attempting to create reporting term:`
      );
      console.log(
        `[ERROR] Drupal response: ${drupalResponse.status}: ${drupalResponse.statusText}`
      );
    }
    console.log("\n[INFO] Script complete!");
  })
  .catch((error) => {
    console.error(error);
  });
