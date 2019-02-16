#!/bin/bash

baseDir=$(pwd)
outputDir=$baseDir/Drivers
outputDirRules=$baseDir/Rules

rm -rf $outputDir
mkdir $outputDir -p


rm -rf $outputDirRules
mkdir $outputDirRules -p

i=0;

while read p; do
 
 echo $p;
  git clone $p "current$i";
  
  cd current$i;
  
  git checkout develop
  
  pwd=$(pwd)
 
  for line in $(find ./ -name "automatica-manifest.json"); do

	manifest=$line
  
	projectDir=$(dirname $manifest)
	echo $projectDir
	  
	cd $projectDir
	  
	automatica-cli publish linux-arm Debug ./publish
	automatica-cli deploy ./deploy ./publish
	  
	basename=${PWD##*/}
	echo $basename
	  
	cp -avr ./deploy $outputDir/$basename
	  
	  
	
	cd $pwd
	
  done
  
	cd $baseDir
	i=$[$i +1]
done < drivers.txt


$i=0
while read p; do
 
 echo $p;
  git clone $p "buildRules$i";
  
  cd buildRules$i;
  
  git checkout develop
  
  pwd=$(pwd)
 
  for line in $(find ./ -name "automatica-manifest.json"); do

	manifest=$line
  
	projectDir=$(dirname $manifest)
	echo $projectDir
	  
	cd $projectDir
	  
	automatica-cli publish $1 $2 ./publish
	automatica-cli deploy ./deploy ./publish
	  
	  
	cp -avr ./deploy/* $outputDirRules/.
	  
	  
	
	cd $pwd
	
  done
  
	cd $baseDir
	i=$[$i +1]
done < rules.txt