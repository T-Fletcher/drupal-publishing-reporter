# drupal-publishing-reporter
Captures the changed files in Drupal every month, then creates Taxonomy Terms in Drupal so the data is saved for reporting

## ENV vars

- `DRUPAL_API_KEY` - The user API of the Drupal site (must have publishing permissions to create Reporting Entries taxonomy terms)
- `DEBUG_MODE` - boolean - Enabled debugging output in the logs when the app runs

