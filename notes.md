
#### Fetch data with curl:
```curl -X GET "http://localhost:3000/data?url=https://www.google.com/maps/search/dentists/@33.5674846,-7.6251137,12z&par=2" -H "accept: */*"```

#### Save output to file:
```curl -X GET "http://localhost:3000/data?url=https://www.google.com/maps/search/dentists/@33.5674846,-7.6251137,12z&par=10" -H 'Content-Type: application/json' -o result.json```

#### Use params outside url
```

curl -X GET -G "http://localhost:3000/data" \
--data-urlencode "url=https://www.google.com/maps/search/dentists/@33.5674846,-7.6251137,12z" \
--data-urlencode "par=20" \
-H 'Content-Type: application/json' \
-o result.json

curl -X GET -G "http://localhost:3000/data" \
--data-urlencode "url=https://www.google.com/maps/search/reastaurants/@33.5707614,-7.6316673,12z/data=!3m1!4b1?entry=ttu" \
--data-urlencode "par=20" \
-H 'Content-Type: application/json' \
-o restaurants.json

curl -X GET "http://localhost:3000/data" \ 
-H "Content-Type: application/json" \
-d '{
  "category": "recruiting office",
  "countryISO": "MAR",
  "city": "Casablanca",
  "par": 5,
  "email": "true"
}' \
-o recruitingOffice-casa-neighborhoods.json

```


#### parse tree
```cat result.json | jless```
```
jq '.result.data[] | select(.phone and .website!="") | [.name, .phone, .website]'  result.json | jless
jq '.result.data[] | select(.phone and .website!="") | [.name, .phone, .website]'  accountingFirm-WithEmail-v4.json | jless
```

---
**Total time:** 0:04:29

**Cluster time:** 3.8 minutes

## Local deployment
#### bash
```
bash ./script   
gmd url https://www.google.com/maps/search/dentists/@33.5674846,-7.6251137,12z par 2 -o hello678.json --p $(pwd)```
#todo: fix default destination if --p not provided

```


``` 
docker build -t gmapapi:latest .
docker run --name gmap0 -p 3000:3000 gmapapi 
#docker run -v /tmp/data:/app/data -p 3000:3000 gmapapi \                                 1 ✘  took 7s   base 🐍 
#./exec.sh url https://www.google.com/maps/search/dentists/@33.5674846,-7.6251137,12z par 2 -o zzzzu.json --p /app/data

```

```
curl -X GET "http://localhost:3000/data" \
-H "Content-Type: application/json" \
-d '{
  "category": "Accounting firm",
  "city": "Casablanca",
  "par": 5,
  "email": "true"
}' \
-o accountingFirmWithEmail.json

```
---
## Run build
```
//run with build
docker-compose build

//run without build
docker-compose up
```
