# drupal-publishing-reporter
Captures the changed files in Drupal every month, then creates Taxonomy Terms in Drupal so the data is saved for reporting.

## Requirements

- Node.js
- A Drupal user account API key with publishing access to the 'Reporting Entries' Taxonomy
- an `.env` file containing the variables mentioned below

## How it works

Drupal stores the 'last updated' date for Nodes (Pages, Events, News Articles etc), which is changed whenever the node is saved. This means if a page is updated on 30 June and again on 1 July, it will only appear as having being modified in July even though it was legitimately modified twice. This makes it hard to capture the amount of work done to the site.

Node Revisions could be used to check previous changes via Views, however as Revisions are often scrubbed to keep database sizes down, this isn't a reliable approach long-term.

This means exposing all content modified in past months is unlikely to be a reliable indicator of the actual number of changes made.

To capture a reliable record of the number of changed files in Drupal every month, the figures need to be periodically captured and stored **as** they change with time. That's where this app comes in:

1. It checks no record for the previous month already exists in Drupal
2. It queries a Drupal View via JSON API to get the number of changed files per Parks site
3. It compiles the results into a single JSON object to send to Drupal
4. It submits a JSON API `POST` request to create a new 'Reporting entries' Taxonomy term in Drupal

The figures for that month is then available in Drupal as a Taxonomy term to be used in Views or however it's needed. You could send it elsewhere via JSON API if you wanted. 

## Logs

A record of each run of the app is stored under `/logs/reporter-*`.

## Environment variables

- `DRUPAL_API_KEY` - string - The user API of the Drupal site (must have publishing permissions to create Reporting Entries taxonomy terms)
- `DRUPAL_DOMAIN` - string - The full URL of the Drupal site
- `DEBUG_MODE` - boolean - Enabled debugging output in the logs when the app runs. Disabled by default. 

## JSON API data structure

To create the Taxonomy terms, Drupal expects a payload that looks like this:

```json
{
  "data": {
    "type": "taxonomy_term--reporting_entries",
    "attributes": {
      "title": "YYYY-MM",
      "field_reporting_amp_figure": 0,
      "field_reporting_anbg_figure": 0,
      "field_reporting_bnp_figure": 0,
      "field_reporting_cinp_figure": 0,
      "field_reporting_corp_figure": 0,
      "field_reporting_knp_figure": 0,
      "field_reporting_ninp_figure": 0,
      "field_reporting_pknp_figure": 0,
      "field_reporting_uktnp_figure": 0
    }
  }
}
```

If any fields are missing, Drupal will return a 422 error when you attempt to create the Term, indicating a malformed object. This is because all fields are required. 

The [Drupal doco covers using JSON API to create content](https://www.drupal.org/docs/core-modules-and-themes/core-modules/jsonapi-module/creating-new-resources-post) in more detail.

## Running via crontab

If running the script using a crontab e.g. on Linux, you'll need to:
1. specify the full path of Node's installation (`$ which node`)
2. jump into the script's directory as part of running it so it finds the `.env` file

```bash
23 07 * * * cd /home/<user>/reporter; ~/.nvm/versions/node/v20.15.1/bin/node /home/<user>/reporter/index.js
```
