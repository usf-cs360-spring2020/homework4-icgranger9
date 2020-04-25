let createCluster = function(hData) {
	// Define variables
	const radius=5;
	const pad = 14;
	const height = 500;
	const diameter =500;
	const width = 960;

	const svg = d3.select("body").select("svg#vis");
	const plot = svg.select("g#plot")
		.attr("transform", translate(width / 2, height / 2));

	const g = {
		legend:  svg.select("g#legend"),
		details: plot.select("g#details"),
		nodes: plot.select("g#nodes"),
		links: plot.select("g#links")
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

	// create the polar coordinates
	const layout = d3.cluster().size([2 * Math.PI, (diameter / 2) - pad]);
	layout(hData);

	// map to cartesian coordinates.
	hData.each(function(node) {
		node.theta = node.x;
		node.radial = node.y;

		var point = toCartesian(node.radial, node.theta);
		node.x = point.x;
		node.y = point.y;
	});

	// Create the color scale for the leaves
	const leafColor = d3.scaleQuantile()
		.domain(hData.leaves().map(d => d.data.count))
	    .range(d3.schemeGreens[5]);


	// Create line generator, either straight or curved, must test a bit.
	const generator = d3.linkVertical()
		.x(d => d.x)
		.y(d => d.y);

	// Draw Links
	const paths = g.links.selectAll('path')
		.data(hData.links())
		.enter()
		.append('path')
		.attr('d', generator)
		.attr('class', 'link');

	// Draw Nodes
	const circles = g.nodes.selectAll('circle')
		.data(hData.descendants(), node => node.data.name)
		.enter()
		.append('circle')
		.attr('r', d => radius)
		.attr('cx', d => d.x)
		.attr('cy', d => d.y)
		.attr('id', d => d.data.name)
		.attr('class', 'node')
		.style('fill', function(d)  {
			if(d.data.count) { 
				return leafColor(d.data.count);
			}

			else if (d.data.name == "root"){
				return "Maroon";
			}

			else {
				return "DarkGoldenRod";
			}
		});

	// Add interactivity
	addInteractivity();

	// Draw Legend
	drawLegend();

	function addInteractivity() {
		// Hilight the selected node
		circles.on('mouseover.highlight', function(d) {
			// returns path from d3.select(this) node to root node
			let path = d3.select(this).datum().path(circles.data()[0]);

			// select all of the nodes on the shortest path
			let update = circles.data(path, node => node.data.id);

			// highlight the selected nodes
			update.classed('selected', true);

		});

		circles.on('mouseout.highlight', function(d) {
			let path = d3.select(this).datum().path(circles.data()[0]);
			let update = circles.data(path, node => node.data.id);
			update.classed('selected', false);
		});

		// show tooltip text on mouseover (hover)
		circles.on('mouseover.tooltip', function(d) {
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

		circles.on("mousemove.tooltip", function(d) {
			const coords = d3.mouse(g.nodes.node());
			details.attr("x", coords[0]);
			details.attr("y", coords[1]);
		})

		circles.on("mouseout.tooltip", function(d) {
			details.style("visibility", "hidden");
		});


		// Filter data
		circles.on('mouseover.filter', function(d) {

			circles.filter(e => (d.data.id !== e.data.id))
				.transition()
				.delay(1500)
				.duration(500)
				.attr("fill-opacity", "0.1")
				.style("stroke", "");
		})

		// remove filer on mouse out
		circles.on('mouseout.filter', function(d) {
			circles
				.transition()
				.attr("fill-opacity", "1")
				.style('stroke', 'black');
		})
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