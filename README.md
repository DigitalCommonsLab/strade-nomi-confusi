# strade-nomi-confusi

mappa delle strade dai nomi confusi di Trento

[Demo](https://digitalcommonslab.github.io/strade-nomi-confusi/)

# Dati

data/
├── highway.json		GeoJSON originali scaricati con overpass
├── highway.csv			Proprieta principali senza parte geometrica
├── highway.sqlite		versione sqlite del file csv, per raggruppare i nomi delle strade e filtrare la parolo comuni(via,piazza,strada)
└── highway_distinct_name.csv lista nomi univoci

highway.sqlite -> highway_distinct_name.csv:

select distinct lower(name) 
from highway 
where highway.highway <> '' 
order by name



# Usage

```
npm install
npm start
```
