
var $ = require('jquery'),
	_ = require('underscore'),
	s = require('underscore.string'),
	latinize = require('latinize'),
	csv = require('jquery-csv'),
	L = require('leaflet'),
	Search = require('leaflet-search'),
	dissolve = require('geojson-dissolve');
	//Panel = require('leaflet-panel-layers');
	levenshtein = require('levenshtein'),
	levenshteinDamerau = require('damerau-levenshtein');
	_.mixin({str: s});


const MIN_LEV_SIMILARITY = 0.80;
const DAMERAU = true;			//use Damerau algorithm


function getLevenstein(str1, str2) {
	if(DAMERAU)	{
		var lev = levenshteinDamerau(str1, str2);
		return lev.similarity;
	}else {
		var lev = new levenshtein(str1, str2);
		return lev.distance;
	}
}

/*
String.prototype.levenshtein = function(string) {
	var a = this, b = string + "", m = [], i, j, min = Math.min;

	if (!(a && b)) return (b || a).length;

	for (i = 0; i <= b.length; m[i] = [i++]);
	for (j = 0; j <= a.length; m[0][j] = j++);

	for (i = 1; i <= b.length; i++) {
	    for (j = 1; j <= a.length; j++) {
	        m[i][j] = b.charAt(i - 1) == a.charAt(j - 1)
	            ? m[i - 1][j - 1]
	            : m[i][j] = min(
	                m[i - 1][j - 1] + 1, 
	                min(m[i][j - 1] + 1, m[i - 1 ][j]))
	    }
	}
	return m[b.length][a.length];
}*/
/*
Array.prototype.compare = function(array) {
  if (!array) {
    return false;
  }
  if (this.length !== array.length) {
    return false;
  }
  for (var i = 0, l = this.length; i < l; i++) {
    if (this[i] instanceof Array && array[i] instanceof Array) {
      if (!this[i].compare(array[i])) {
        return false;
      }
    }
    else if (this[i] !== array[i]) {
      return false;
    }
  }
  return true;
}*/

function getUncommon(text, common) {
    var words = _.str.words(text),
        commonObj = {},
        uncommonArr = [],
        word, i;

    for ( i = 0; i < common.length; i++ ) {
        commonObj[ common[i].trim() ] = true;
    }
    
    for ( i = 0; i < words.length; i++ ) {
        
        word = words[i].trim().toLowerCase();

        if ( !commonObj[word] ) {
            uncommonArr.push(word);
        }
    }
    
    return uncommonArr.join(' ');
}

function randomColor(str) {
	var letters = '0123456789ABCDEF';
	var color = '#';
	for (var i = 0; i < 6; i++) {
		color += letters[Math.floor(Math.random() * 16)];
	}
	return color;
}

var map = new L.Map('map', {
	zoom: 15,
	center: new L.latLng([46.07,11.13]),
	layers: L.tileLayer('http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
		maxZoom: 18,
		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	})
});

var blacklist = [];

$.ajax({
	async: false,
	url: 'data/highway_blacklist_name.csv',
	success: function(text) {
		blacklist = _.flatten(csv.toArrays(text));
	}
});

$.getJSON('data/highway.json', function(json) {

	//TODO normalize properties name:it short_name to only name
	
//console.log('geojson',json);

	var fgroups = _.groupBy(json.features, function(f) {
		return f.properties.name;
	});

	json.features = _.map(fgroups, function(ff) {
		//console.log(ff)

		var f1 = ff[0],
			fcc = f1.geometry.coordinates;

		for(var f in ff) {

			var cc = ff[f].geometry.coordinates;
			
			if(_.intersection( _.first(cc), _.first(f1.geometry.coordinates)).length )
				cc.reverse();

			if(_.intersection( _.last(cc), _.last(f1.geometry.coordinates)).length )
				cc.reverse();

			f1.geometry = dissolve(f1.geometry, ff[f].geometry);
		}
		return f1
	});

//console.log('dissolve: ',json);

	var geo = L.geoJSON(json, {
			style: function(f) {
				return {
					weight: 6,
					opacity: 0.8,
					color: randomColor(f.properties.cleanName)
				};
			},
			onEachFeature: function (f, layer) {

				f.properties.cleanName = getUncommon(f.properties.name, blacklist);
				
				layer.bindTooltip(f.properties.name);//+'<br /><i>'+f.properties.cleanName+'</i>');

				//layer.bindPopup('<h2>'+f.properties.name+'</h2>');
				layer.on('mouseover', function(e) {
					
					e.target.bringToFront();
					e.target.openTooltip();

					//e.target.defStyle = _.clone(e.target.style);
					e.target.setStyle({
						weight: 10,
						opacity: 1,
					});
				}).on('mouseout', function(e) {

					//e.target.setStyle(e.target.defStyle)
					//geo.resetStyle(e.target)
					e.target.setStyle({
						weight: 6,
						opacity:0.8
					});

				}).on('click', function(e) {

					L.DomEvent.stopPropagation(e);

					var selectName = e.target.feature.properties.cleanName,
						ranks = [];

					geo.eachLayer(function(l) {
						
						var lev = getLevenstein(selectName, l.feature.properties.cleanName)
						//steps: 0,
				        //relative: 0,
				        //similarity: 1
						if( lev > MIN_LEV_SIMILARITY) {
							ranks.push({
								lev: lev,
								name: l.feature.properties.name,
								cleanName: l.feature.properties.cleanName,
								layer: l,
							});
						}

						l.setStyle({
							opacity: 0.2
						});

						l.closeTooltip();
					});

					ranks = _.sortBy(ranks, 'lev').reverse();
					ranks = _.first(ranks, 10);

					var bb = ranks[0].layer.getBounds();
					
					console.clear();

					for(let r in ranks) {
						
						var lev = parseFloat( (ranks[r].lev*100).toFixed(0) ) || '';

						ranks[r].layer.setStyle({
							opacity: 1,
							weight: 10
						})
						.bindTooltip(ranks[r].name+'<br />simile al <b>'+lev+'%</b>',{permanent:true});
						
						bb.extend( ranks[r].layer.getBounds() );

						console.log('"'+selectName+'"','==', '"'+ranks[r].cleanName+'"', ' ==> '+ranks[r].lev.toFixed(2));
					}

					if(ranks.length>1) {

						map.once('moveend zoomend', function(e) {
							for(let r in ranks)
								ranks[r].layer.openTooltip();
						});
						map.fitBounds(bb,{
							padding: L.point(300, 300)
						});
					}

				});
			}
		});
	//TODO fitBounds(json.bbox)
	geo.addTo(map);
	
	
	L.control.search({
		layer: geo,
		propertyName: 'name',
		marker: false,
		initial: false,
		casesensitive: false,
		buildTip: function(text, val) {
			var name = val.layer.feature.properties.name;
			return '<a href="#">'+name+'</a>';
		},
		moveToLocation: function(latlng, title, map) {
			//var zoom = map.getBoundsZoom(latlng.layer.getBounds());
  			//map.setView(latlng, zoom); // access the zoom
  			latlng.layer.fire('click')
		}
	}).on('search:locationfound', function(e) {
		e.layer.openTooltip();
	}).addTo(map);


	map.on('click', function(e) {
		geo.eachLayer(function(l) {
			l.setStyle({
				weight: 6,
				opacity:0.8,
			});
		});
	});

});