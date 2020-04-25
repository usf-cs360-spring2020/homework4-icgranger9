let createTreemap = function(hData) {
	// Define variables
	const radius=5;
	const pad = 14;
	const height = 500;
	const diameter = 500;
	const width = 1160;

	const svg = d3.select("body").select("svg#vis");
	const plot = svg.select("g#plot")
		.attr("transform", translate(pad, pad));

	const g = {
		legend:  svg.select("g#legend"),
		details: plot.select("g#details"),
		nodes: plot.select("g#nodes"),
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

	// Sort the data
	hData.sort(function(a, b) { 

		return b.height - a.height || b.data.count - a.data.count; 
	});

	// make sure value is set
	// hData.sum(function(d) { return d.data && d.data.count ? d.data.count : 0; });
	hData.count();

	// create the polar coordinates
	let layout = d3.treemap()
		.padding(8)
		.size([width - (2 * pad + 200), height - 2 * pad]); //Kind of hack-y, the 200 is so the details table stays in the csv
	layout(hData);

	// Create the color scale for the leaves
	const leafColor = d3.scaleQuantile()
		.domain(hData.leaves().map(d => d.data.count))
	    .range(d3.schemeGreens[5]);


	// Create line generator, either straight or curved, must test a bit.
	const generator = d3.linkVertical()
		.x(d => d.x)
		.y(d => d.y);

	// Draw Nodes
	let rects = g.nodes.selectAll("rect")
		.data(hData.descendants())
		.enter()
		.append("rect")
		.attr("x", function(d) { return d.x0; })
		.attr("y", function(d) { return d.y0; })
		.attr("width", function(d) { return d.x1 - d.x0; })
		.attr("height", function(d) { return d.y1 - d.y0; })
		.attr("id", function(d) { return d.data.id; })
		.attr("class", "node")
		.style("fill", function(d)  {
			if(d.data.count) { 
				return leafColor(d.data.count);
			}

			else if (d.data.name == "root"){
				return "NavajoWhite";
			}

			else {
				return "DarkGoldenRod";
			}
		});

	// Add interactivity
	addInteractivity();

	// Draw Legend
	// drawLegend();

	function addInteractivity() {
		rects.on('mouseover.highlight', function(d) {
			// returns path from d3.select(this) node to root node
			let path = d3.select(this).datum().path(rects.data()[0]);

			// select all of the nodes on the shortest path
			let update = rects.data(path, node => node.data.id);

			// highlight the selected nodes
			update.classed('selected', true);

		});

		rects.on('mouseout.highlight', function(d) {
			let path = d3.select(this).datum().path(rects.data()[0]);
			let update = rects.data(path, node => node.data.id);
			update.classed('selected', false);
		});

		// show tooltip text on mouseover (hover)
		rects.on('mouseover.tooltip', function(d) {
			// use template literal for the detail table
			let coords = d3.mouse(g.nodes.node());

			let html = ""

			if (d.height === 2){
				html = `
					<table id="detailsTable" cellspacing="0" cellpadding="2">
						<tbody>
							<tr>
								<th>SF Fires</th>
								<td></td>
							</tr>
						</tbody>
					</table>
				`;
			}

			else if (d.height === 1){
				html = `
					<table id="detailsTable" cellspacing="0" cellpadding="2">
						<tbody>
							<tr>
								<th>Neighborhood:</th>
								<td>${d.data.name}</td>
							</tr>
						</tbody>
					</table>
				`;
			}

			else if (d.height === 0){
				html = `
					<table id="detailsTable" cellspacing="0" cellpadding="2">
						<tbody>
							<tr>
								<th>Neighborhood:</th>
								<td>${d.data.neighborhood}</td>
							</tr>
							<tr>
								<th>Emergency:</th>
								<td>${d.data.name}</td>
							</tr>
							<tr>
								<th>Count:</th>
								<td>${d.data.count}</td>
							</tr>
						</tbody>
					</table>
				`;
			}

			body.html(html);
			details.attr("x", coords[0]);
			details.attr("y", coords[1]);
			details.style("visibility", "visible");
		});

		rects.on("mousemove.tooltip", function(d) {
			const coords = d3.mouse(g.nodes.node());
			details.attr("x", coords[0]);
			details.attr("y", coords[1]);
		})

		rects.on("mouseout.tooltip", function(d) {
			details.style("visibility", "hidden");
		});
	}


	function drawLegend() {

		var legend = d3.legendColor()
			.shapeWidth(50)
			.cells(5)
			.labelFormat(d3.format(".0f"))
			.orient("horizontal")
			.title("Legend")
			.labelDelimiter(" - ")
			.scale(leafColor);

		g.legend
			.attr("transform", translate(0, 10))
			.call(legend);

		g.legend.selectAll("text")
			.style("font-size", "small")
	}
		

};


//Helper functions, to make life easier
let translate = function(x, y) {
	return 'translate(' + x + ',' + y + ')';
};

let toCartesian= function(r, theta) {
  return {
    x: r * Math.cos(theta),
    y: r * Math.sin(theta)
  };
}