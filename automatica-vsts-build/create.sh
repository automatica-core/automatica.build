#!/bin/bash


rm *.vsix
cd automatica-core-plugin-build
npm i
tsc index.ts
cd ..

cd automatica-core-docker-build
npm i
tsc index.ts
cd ..

tfx extension create --manifest-globs vss-extension.json