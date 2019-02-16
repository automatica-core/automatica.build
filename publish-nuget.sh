for line in $(find $1 -name "*.nupkg"); do

       echo "publish $line..."
	   apiKey=$2
       url="https://www.myget.org/F/automaticacore/auth/$2/api/v3/index.json"

	dotnet nuget push $line -s $url

done