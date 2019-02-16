#!/bin/bash
i=0;
for line in $(find $1 -name "*.opencover.xml"); do
 
	cp $line $2/$i.opencover.xml
 
	i=$[$i +1]
done