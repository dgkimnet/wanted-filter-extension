#!/bin/bash

export OUTPUT_FILE="wanted-filter-extension.xpi"
export FILES="
manifest.json
background.js
content.js
style.css
"

zip -r $OUTPUT_FILE $FILES
