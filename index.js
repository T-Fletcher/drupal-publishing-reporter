// Reporter
// TODO: Get env vars running to safely hold variables

require("dotenv").config();

// Ignore SSL issues for local testing
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const apiKey = process.env.DRUPAL_API_KEY;

if (!apiKey) {
  throw new Error("API key not found in environment variables");
}

// TODO: Get correct month format for when script runs
// TODO: Write function to retrieve date range of previous month, 
// TODO: including previous years and leap years
let now = new Date().toISOString();
let year = now.slice(0, 4),
  month = now.slice(5, 7),
  day = now.slice(8,10);

console.log(year);
console.log(month);
console.log(day);

let startDate = "2024-06-01 00:00:00";
let endDate = "2024-06-30 23:59:59";

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

console.log("Gathering changed pages for each site...\n");

const promises = sitesList.map(async (site, index) => {
  let url = `${domain}/jsonapi/views/publishing_report/default?views-filter%5Bchanged%5D%5Bmin%5D=${encodeURI(
    startDate
  )}&views-filter%5Bchanged%5D%5Bmax%5D=${encodeURI(
    endDate
  )}&views-filter%5Bfield_site_target_id%5D=${index + 1}`;

  const data = await fetchJsonData(url);

  if (data && data.data && data.data.length >= 0) {
    console.log(`${data.meta.count} changed pages for ${site}`);
    const targetProp = `field_reporting_${site}_figure`;
    structure.data.attributes[targetProp] = data.meta.count;
  } else {
    console.log(`No data found for ${site}`);
  }
});

Promise.all(promises)
  .then(async () => {
    console.log("\nData to send to Drupal for recording:\n");
    console.dir(structure, { depth: null });
    const headers = {
      "Content-type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
      "api-key": `${apiKey}`,
    };
    // Send data to Drupal to create a new reporting Taxonomy Term
    const drupalPost = await fetch(
      `${domain}/jsonapi/taxonomy_term/reporting_entries`,
      {
        method: "POST",
        headers: headers,
        body: JSON.stringify(structure),
      }
    );
    const drupalResponse = await drupalPost;

    console.log(
      `Drupal response: ${drupalResponse.status}: ${drupalResponse.statusText}`
    );

    console.log("\nReport generated successfully!");
  })
  .catch((error) => {
    console.error(error);
  });
