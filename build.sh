#!/bin/bash

export OUTPUT_FILES="wanted-filter-extension.xpi wanted-filter-extension.zip"
export FILES="
manifest.json
background.js
content.js
style.css
"

for I in $OUTPUT_FILES
do
    zip -r $I $FILES
done
