#!/bin/bash
export DOTNET_ROOT=$HOME/dotnet 
export PATH=$PATH:$HOME/dotnet
					
export INPUT_PUBLISH=true
export INPUT_MANIFEST_PATH=/mnt/c/dev/p3/automatica-drivers/P3.Driver.Automatica.Remote/Automatica.Remote/automatica-manifest.json
export INPUT_VERSION=0.1.1.1
export INPUT_API_KEY=9B4771F9-411F-4D63-BE4F-AE592A9EB251
export INPUT_CLOUD_URL=https://automatica-core-cloud.azurewebsites.net
export INPUT_CONFIGURATION=Debug
export INPUT_OUTPUTDIRECTORY=/mnt/c/dev/p3/automatica-drivers/P3.Driver.Automatica.Remote/Automatica.Remote/out

node index.js
