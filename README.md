# drupal-publishing-reporter
Captures the changed files in Drupal every month, then creates Taxonomy Terms in Drupal so the data is saved for reporting

## ENV vars

- `DRUPAL_API_KEY` - The user API of the Drupal site (must have publishing permissions to create Reporting Entries taxonomy terms)
- `DEBUG_MODE` - boolean - Enabled debugging output in the logs when the app runs

## JSON API data structure

Drupal expects a payload that looks like this:

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
