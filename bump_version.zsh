#!/usr/bin/env zsh

gsb_first_line=$(git status -sb | head -n1 | awk '{print $2}')
upstream_branch=${gsb_first_line#*...}
if ! git diff ${upstream_branch} manifest.json | grep '"version"' &> /dev/null; then

    CURRENT_VERSION=$(grep manifest.json -e '"version"' | sed -E 's/^.*"([0-9]+(\.[0-9]+)*)".*$/\1/')

    NEXT_VERSION="${CURRENT_VERSION%.*}.$(( ${CURRENT_VERSION##*.} + 1 ))"

    sed -i -E "s/(\"version\": )\"${CURRENT_VERSION}\"/\\1\"${NEXT_VERSION}\"/" manifest.json
else
    touch manifest.json
fi
