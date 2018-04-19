# strade-nomi-confusi

Map of the streets with the confused names in Trento

[Demo](https://digitalcommonslab.github.io/strade-nomi-confusi/)

# Algorithms

* [Damerau–Levenshtein distance](https://en.wikipedia.org/wiki/Damerau%E2%80%93Levenshtein_distance)
* [Dissolve](https://github.com/digidem/geojson-dissolve)


# Data

```
data/
├── highway.json		GeoJSON original data downloaded from Openstreetmap by Overpass
├── highway.csv			Main properties without geometries
├── highway.sqlite	Sqlite version from csv, to group streets by names and filter commons *bad words* (via,piazza,strada...)
└── highway_distinct_name.csv list of distinct names
```

## Bad words
```
select distinct lower(name) 
from highway 
where highway.highway <> '' 
order by name
```
highway.sqlite -> highway_distinct_name.csv:



# Usage

```
npm install
npm start
```
