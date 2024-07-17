# drupal-publishing-reporter
Captures the changed files in Drupal every month, then creates Taxonomy Terms in Drupal so the data is saved for reporting

## Requirements

- Node.js
- A Drupal user account API key with publishing access to the 'Reporting Entries' Taxonomy

## How it works

Drupal stores the 'last updated' date for Nodes (Pages, Events, News Articles etc), which is changed whenever the node is saved. This means if a page is updated on 30 June and again on 1 July, it will only appear as having being modified in July even though it was legitimately modified twice. 

Node Revisions could be used to check previous changes via Views, however as Revisions are often scrubbed to keep database sizes down, this isn't a reliable approach long-term.

This means exposing all content modified in past months is unlikely to be a reliable indicator of the actual number of changes made.

To capture a reliable record of the number of changed files in Drupal every month, the figures need to be periodically captured and stored **as** they change with time. That's where this app comes in. It:

1. queries a Drupal View via JSON API to get the number of changed files per Parks site
2. compiles the results into a single JSON object to send to Drupal
3. submits a JSON API `POST` request to create a new 'Reporting entries' Taxonomy term in Drupal

To avoid overwriting/duplicating the records, it checks if the Term name already exists before attempting to create it.

## Environment variables

- `DRUPAL_API_KEY` - string - The user API of the Drupal site (must have publishing permissions to create Reporting Entries taxonomy terms)
- `DRUPAL_DOMAIN` - string - The full URL of the Drupal site
- `DEBUG_MODE` - boolean - Enabled debugging output in the logs when the app runs

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

The [Drupal doco covers using JSON API to create content](https://www.drupal.org/docs/core-modules-and-themes/core-modules/jsonapi-module/creating-new-resources-post) in more detail.