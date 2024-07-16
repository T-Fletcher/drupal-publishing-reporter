#!/bin/bash

###### DRUPAL REPORTER ######

# ====================
# Author: Tim Fletcher
# Date: 2024-07-15
# Source location: XXXX
# ====================

NOW=$(date -u +"%Y%m%dT%H:%M:%S%z")
NOW_EPOCH=$(date +%s)
# TODO: Get exact start/end dates of the previous month
LAST_MONTH=$(date -u -v-1m +"%Y-%m-%d")
LAST_MONTH_START="${LAST_MONTH}%2000:00:00"
LAST_MONTH_END="${LAST_MONTH}%2023:59:59"
START_DATE=$(date -u -v-30d +"%Y-%m-%d%2000:00:00")
END_DATE=$LAST_MONTH_END
REPORT_NAME=$(date -u -v-1d +"%Y-%m")

# TODO: Get previous month duration for view args
# YEAR=$(date +%Y);
# DAYSINMONTH=$(date -v"$MONTH_NUM"m -v"$YEAR"y -v+1m -v-1d -u +"%d")

SITE="https://parksaustralia-cms.lndo.site"
HERE=$(pwd)
DIR="$HERE/parks-websites-change-logs-$LAST_MONTH"
REPORTER_ACTIVITY_DIR="$HERE/reporter-activity"
REPORTER_EXECUTION_LOG_FILENAME="reporter-history.log"
REPORTER_SCRIPT_LOGFILE="$REPORTER_ACTIVITY_DIR/reporter-output-$NOW.log"

mkdir $DIR
mkdir $REPORTER_ACTIVITY_DIR

declare -A SITES=([amp]=400 [anbg]=0 [bnp]=0 [cinp]=0 [corp]=0 [knp]=0 [ninp]=0 [pknp]=0 [uktnp]=0)

JSON="{
    "data": {
        "type": "taxonomy_term--reporting_entries",
        "attributes": {
            "title": "$REPORT_NAME",
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
}"

echo -e "[INFO] Starting REPORTER at $NOW"

trap cleanUp EXIT

function cleanUp() {
    cd $HERE
    echo -e "[INFO] Switching to $(pwd)"
    if [[ ! -f $REPORTER_EXECUTION_LOG_FILENAME ]]; then
        touch $REPORTER_EXECUTION_LOG_FILENAME
    fi
    
    # Track the daily success/failure of the script, in a place that isn't
    # affected by the cleanup steps
    if [[ $EXIT_CODE -ne 0 ]]; then
        echo -e "$(date -u +"%Y%m%dT%H:%M:%S%z") - [FAIL] - REPORTER failed to complete, exit code: $EXIT_CODE" >> $REPORTER_EXECUTION_LOG_FILENAME
    else
        echo -e "$(date -u +"%Y%m%dT%H:%M:%S%z") - [SUCCESS] - REPORTER completed successfully" >> $REPORTER_EXECUTION_LOG_FILENAME
    fi
    
    echo -e "[OWNER] Cleaning up script artifacts..."
    
    rm -rf $DIR;
    rm -rf parks-websites-change-logs-*
    rm -rf parksaustralia-cms-drupal-logs-*
    
    echo -e "[OWNER] Clean up complete!"
    
    COMPLETE_TIME=$(date +%s)
    echo -e "[INFO] Finished REPORTER in $(($COMPLETE_TIME - $NOW_EPOCH)) seconds, at $(date -u +"%Y%m%dT%H:%M:%S%z")"
}

function testLogin() {
    local SERVICE=$1
    if [[ $EXIT_CODE -ne 0 ]]; then
        echo -e "[ERROR] Could not log into $SERVICE (Exit code $EXIT_CODE), quitting..."
        exit 1
    else
        echo -e "[INFO] $SERVICE login successful!"
    fi
}

function receivedData() {
    local message=$1
    if [[ $EXIT_CODE -ne 0 ]]; then
        echo -e "[WARN] Failed to get $message, exit code $EXIT_CODE"
    else
        echo -e "[INFO] $message received!"
    fi
}

function replaceLogFolder() {
    local DIRECTORY=$1
    if [[ $EXIT_CODE -ne 0 ]]; then
        echo -e "[ERROR] Failed to remove $DIRECTORY, exit code $EXIT_CODE. Quitting..."
        exit 2
    fi
}

if [[ ! -d $REPORTER_ACTIVITY_DIR ]]; then
    echo -e "[ERROR] $REPORTER_ACTIVITY_DIR directory not found, quitting..."
    exit 6
fi
if [[ -d $DIR ]]; then
    echo -e "[INFO] Log folder '$DIR' already exists, deleting it to start fresh..."
    rm -rf $DIR
    EXIT_CODE=$? replaceLogFolder $DIR
    mkdir $DIR
else
    echo -e "[INFO] Log folder not found, creating '$DIR'..."
    mkdir $DIR
fi

if [[ ! -d $DIR ]]; then
    echo -e "[ERROR] No $DIR found, quitting..."
    exit 3
fi

cd $DIR
echo -e "[INFO] Switching to $(pwd)"
echo -e "[INFO] Getting changed Drupal nodes View..."

# TODO: Also fetch changed Documents/images/files

for INDEX in "${!SITES[@]}"; do
    SITE_ID=${!$INDEX}
    
    # echo "key: $INDEX"
    # echo ${!SITES[@]}
    
    echo -e "[INFO] Processing $INDEX..."
    
    echo -e ""
    # Get request working and save data,
    URL="$SITE/jsonapi/views/publishing_report/default?views-filter%5Bchanged%5D%5Bmin%5D=$START_DATE&views-filter%5Bchanged%5D%5Bmax%5D=$END_DATE&views-filter%5Bfield_site_target_id%5D=$SITE_ID"
    echo -e "[INFO] Requesting data from: \n$URL"
    # Request the data from $URL, and save it to output.txt
    DATA=$(curl -sqk "$URL"  | jq -r '.meta.count')
    EXIT_CODE=$? receivedData 'changed Drupal nodes View'
    
    echo 'Changed files: '$(($DATA))
    SITES[$INDEX]=$((DATA))
    # echo -e ""
    # # echo -e $JSON | jq ".data.attributes.field_reporting_${SITES[$INDEX]}_figure |= .+6"
    # echo $JSON
    echo "value: ${SITES[$INDEX]}"
    echo -e ""
done;

echo $SITES

JSON_STRING=$( jq -n \
    --arg name "$REPORT_NAME" \
    --arg amp "$AMP_COUNT" \
    --arg anbg "$ANBG_COUNT" \
    --arg bnp "$BNP_COUNT" \
    --arg cinp "$CINP_COUNT" \
    --arg corp "$CORP_COUNT" \
    --arg knp "$KNP_COUNT" \
    --arg ninp "$NINP_COUNT" \
    --arg pknp "$PKNP_COUNT" \
    --arg uktnp "$UKTNP_COUNT" \
    '{
    "data": {
        "type": "taxonomy_term--reporting_entries",
        "attributes": {
            "title": "$name",
            "field_reporting_amp_figure": $amp,
            "field_reporting_anbg_figure": $anbg,
            "field_reporting_bnp_figure": $bnp,
            "field_reporting_cinp_figure": $cinp,
            "field_reporting_corp_figure": $corp,
            "field_reporting_knp_figure": $knp,
            "field_reporting_ninp_figure": $ninp,
            "field_reporting_pknp_figure": $pknp,
            "field_reporting_uktnp_figure": $uktnp
        }
    }
}' )


echo -e "Building JSON object to send to Drupal..."

echo $JSON


cd $HERE
echo -e "[INFO] Switching to $(pwd)"


exit 0
