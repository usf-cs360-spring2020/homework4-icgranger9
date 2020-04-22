
let createChoropleth = function() {
	// Necessary URl's. Using SF's Neighborhoods as the basemap
	const urls = {
		basemap: "https://data.sfgov.org/resource/6ia5-2f8k.geojson",
		vehicles: "https://data.sfgov.org/resource/vw6y-z8j6.json"
	};

	// calculate date range
	// Note: might want to double check this one
	const end = d3.timeMonth.ceil(new Date(2020, 1, 14));
	const start = d3.timeMonth.floor(new Date(2020, 1, 14));
	const format = d3.timeFormat("%Y-%m-%dT%H:%M:%S");
	console.log(format(start), format(end));

	// add parameters to vehicles url
	urls.vehicles += "?$where=starts_with(service_name, 'Abandoned Vehicle')";
	urls.vehicles += " AND requested_datetime between '" + format(start) + "'";
	urls.vehicles += " and '" + format(end) + "'";
	urls.vehicles += " AND NOT starts_with(service_details, 'DPT Abandoned Vehicles')";
	urls.vehicles += " AND neighborhoods_sffind_boundaries IS NOT NULL";

	// encode special characters
	urls.vehicles = encodeURI(urls.vehicles);

	const svg = d3.select("body").select("svg#vis");

	const g = {
		basemap: svg.select("g#basemap"),
		outline: svg.select("g#outline"),
		details: svg.select("g#details"),
		legend:  svg.select("g#legend"),
	};

	// add details on demand elements
	const details = g.details.append("foreignObject")
		.attr("id", "details")
		.attr("width", 400)
		.attr("height", 100)
		.attr("dx", -5)
		.attr("dy", -5)
		.attr("x", 0)
		.attr("y", 0);

	const body = details.append("xhtml:body")
		.html("<p>N/A</p>");

	details.style("visibility", "hidden");

	// setup projection
	const projection = d3.geoConicEqualArea();
	projection.parallels([37.692514, 37.840699]);
	projection.rotate([122, 0]);

	// setup path, neighborhood count, and color scale
	const nhoodCounts = d3.map();

	const path = d3.geoPath()
		.projection(projection);
	
	const color = d3.scaleQuantile()
	    .range(d3.schemeOrRd[7]);


	// Load the vehicle data
	d3.json(urls.vehicles).then(function(json) {

		console.log("vehicles", json);

		// get the count of abandoned vehicle for each neighborhood
		for(d of json){
			var neighborhood = d.neighborhoods_sffind_boundaries

			if (nhoodCounts.has(neighborhood)) {
				nhoodCounts.set(neighborhood, (nhoodCounts.get(neighborhood)+1));
			} 
			else {
				nhoodCounts.set(neighborhood, 1);
			}
		}


		// set the color range to that count
		color.domain([ d3.min(nhoodCounts.values()), d3.max(nhoodCounts.values())]);

		// Load map data, and call the draw function
		d3.json(urls.basemap).then(drawMap);

		// Finally, draw the legend
		drawLegend(color)
	});

	function drawMap(json) {
		console.log("basemap", json);

		// makes sure to adjust projection to fit all of our regions
		projection.fitSize([960, 600], json);

		//Draw base map
		const basemap = g.basemap.selectAll("path.land")
			.data(json.features)
			.enter()
			.append("path")
			.attr("d", path)
			.attr("fill", d => nhoodCounts.has(d.properties.name) ? color(nhoodCounts.get(d.properties.name)) : "#F5F5F5")
			.attr("class", "land");

		// Draw the outline
		const outline = g.outline.selectAll("path.neighborhood")
				.data(json.features)
				.enter()
				.append("path")
				.attr("d", path)
				.attr("class", "neighborhood")
				.each(function(d) {
					// save selection in data for interactivity
					// saves search time finding the right outline later
					d.properties.outline = this;
				});

		// add highlight
		basemap.on("mouseover.highlight", function(d) {
			d3.select(d.properties.outline).raise();
			d3.select(d.properties.outline).classed("active", true);
		});

		basemap.on("mouseout.highlight", function(d) {
			d3.select(d.properties.outline).classed("active", false);
		});
		

		//Add details on demand
		basemap.on("mouseover.details", function(d) {

			// use template literal for the detail table
			const coords = d3.mouse(g.basemap.node());
			const html = `
				<table id="detailsTable" cellspacing="0" cellpadding="2">
					<tbody>
						<tr>
							<th>Neighborhood:</th>
							<td>${d.properties.name}</td>
						</tr>
						<tr>
							<th>Abandoned Vehicles:</th>
							<td>${nhoodCounts.has(d.properties.name) ? nhoodCounts.get(d.properties.name) : 0}</td>
						</tr>
					</tbody>
				</table>
			`;

			body.html(html);
			details.attr("x", coords[0]);
			details.attr("y", coords[1]);
			details.style("visibility", "visible");
		});

		basemap.on("mousemove.details", function(d) {
			const coords = d3.mouse(g.basemap.node());
			details.attr("x", coords[0]);
			details.attr("y", coords[1]);
		})

		basemap.on("mouseout.details", function(d) {
			details.style("visibility", "hidden");
		});

		// // Add filtering
		// d3.select("#selectButton").on("change", function(d) {
		// // recover the option that has been chosen
		// 	var selectedOption = d3.select(this).property("value")
		// 	console.log(selectedOption)
		// })
	}

	function drawLegend(colorScale) {

		var legend = d3.legendColor()
			.scale(colorScale)
			.labelFormat(d3.format(".0f"))
			.useClass(true)
			.orient('horizontal')
			.shapeWidth(66)
			.title("Color Legend")
			.labelDelimiter(" - ");

		g.legend
			.attr("transform", translate(0, 20))
			.call(legend);

		// Need to actually update the color for some reason
		g.legend.selectAll("rect")
			.each(function(d){
				d3.select(this).style("fill", d)
			})

		g.legend.selectAll("text")
			.style("font-size", "small")

	}
		

};


//Helper functions, to make life easier
let translate = function(x, y) {
	return 'translate(' + x + ',' + y + ')';
};