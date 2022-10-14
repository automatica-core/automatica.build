#!/bin/bash


export DOTNET_ROOT=$HOME/dotnet 
export PATH=$PATH:$HOME/dotnet
					
export INPUT_DOCKERFILE_AMD64=/mnt/c/dev/automatica.core/automatica/src/automatica.supervisor/Dockerfile
export INPUT_DOCKERFILE_ARM32=/mnt/c/dev/automatica.core/automatica/src/automatica.supervisor/Dockerfile.arm32
export INPUT_IMAGENAME=automaticacore/automatica.supervisor
export INPUT_VERSION=0.1.1.1
export INPUT_BUILDARGS=VERSION=0.1.1.1

cd /mnt/c/dev/automatica.core/automatica/src/automatica.supervisor/
node /mnt/c/dev/automatica.core/automatica/automatica.build/automatica-vsts-build/automatica-core-docker-build/index.js
