#!/usr/bin/env zsh

CURRENT_VERSION=$(grep manifest.json -e '"version"' | sed -E 's/^.*"([0-9]+(\.[0-9]+)*)".*$/\1/')

NEXT_VERSION="${CURRENT_VERSION%.*}.$(( ${CURRENT_VERSION##*.} + 1 ))"

sed -i -E "s/(\"version\": )\"${CURRENT_VERSION}\"/\\1\"${NEXT_VERSION}\"/" manifest.json
