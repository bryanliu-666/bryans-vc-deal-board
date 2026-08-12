#!/bin/bash

cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required to run VC Deal Board."
  echo "Download it from https://nodejs.org, then open this file again."
  echo
  read -n 1 -s -r -p "Press any key to close."
  exit 1
fi

if [ ! -d "node_modules/exceljs" ]; then
  echo "Preparing VC Deal Board for first use..."
  npm install || {
    echo
    echo "Setup did not finish. Check your internet connection and try again."
    read -n 1 -s -r -p "Press any key to close."
    exit 1
  }
fi

npm start
