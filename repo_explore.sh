#!/bin/bash
# This script explores the repo structure
curl -s "https://api.github.com/repos/AURORALAOrg/aurora-backend/contents/src" | jq -r '.[] | "\(.type) \(.path)"'
