
var $ = require('jquery'),
	_ = require('underscore'),
	s = require('underscore.string'),
	latinize = require('latinize'),
	csv = require('jquery-csv'),
	L = require('leaflet');

_.mixin({str: s});

String.prototype.levenstein = function(string) {
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
}

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

function cleanName(text) {
	var ret = ""+_.str(text).trim().toLowerCase();
	
	ret.diff(blacklist);

	return ret;
};

function randomColor() {
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
	
console.log('BEFORE',json);

	var fgroups = _.groupBy(json.features, function(f) {
		return f.properties.name;
	});

	json.features = _.map(fgroups, function(ff) {
		//console.log(ff)

		var f1 = ff[0];

		for(var f in ff) {
			
			if(f1.geometry.coordinates[0]==ff[f].geometry.coordinates[0])
				ff[f].geometry.coordinates = ff[f].geometry.coordinates.reverse();

			f1.geometry.coordinates = _.union(f1.geometry.coordinates, ff[f].geometry.coordinates);
		}

		return f1;
	});

console.log('AFTER',json);


	var geo = L.geoJSON(json, {
			style: function(f) {
				return {
					weight: 4,
					opacity: 0.8,
					color: randomColor()
				};
			},
			onEachFeature: function (f, layer) {

				f.properties.cleanName = getUncommon(f.properties.name, blacklist);
				
				layer.bindTooltip(f.properties.name);//+'<br /><i>'+f.properties.cleanName+'</i>');

				//layer.bindPopup('<h2>'+f.properties.name+'</h2>');
				layer.on('mouseover', function(e) {
					
					e.target.bringToFront();
					e.target.openTooltip();

					e.target.defStyle = f.style;
					e.target.setStyle({
						weight: 10,
						opacity: 1,
					});
				}).on('mouseout', function(e) {
					e.target.setStyle({
						weight:4,
						opacity:0.8
					});
				}).on('click', function(e) {

					L.DomEvent.stopPropagation(e)

					var ranks = [];

					geo.eachLayer(function(l) {
						
						var lev = e.target.feature.properties.cleanName.levenstein( l.feature.properties.cleanName );

						if( lev < 4) {
							ranks.push({
								lev: lev,
								name: l.feature.properties.name,
								layer: l,
							});
						}

						l.setStyle({
							opacity: 0.2
						});
					});

					ranks = _.sortBy(ranks, 'lev');//.reverse();
					ranks = _.first(ranks, 10);

					for(let r in ranks) {
						
						ranks[r].layer.setStyle({
							opacity: 1,
							weight: 10
						}).bindTooltip(ranks[r].name+'<br />diff: <b>'+ranks[r].lev+'</b>').openTooltip();
					}

				});
			}
		});
	//TODO fitBounds(json.bbox)
	geo.addTo(map);

	map.on('click', function(e) {
		geo.eachLayer(function(l) {
			l.setStyle({
				weight:4,
				opacity:0.8,
			});
		});
	});

});