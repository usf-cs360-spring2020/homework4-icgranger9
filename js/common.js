let cleanData = function(sourceFile, callback=null){

	var sourceData = d3.csv(sourceFile, function(d) {
		// Clean it up a bit first
		return {
			"id": "root__" + d["Neighborhooods - Analysis Boundaries"]  +"__"+ d["Call Type"],
			"parent": "root__" + d["Neighborhooods - Analysis Boundaries"],
			"neighborhood": d["Neighborhooods - Analysis Boundaries"],
			"name": d["Call Type"],
			"count": +d["Call Number"]
		}

	}).then(function(data){
		// create a list of all nodes, using the data and recursively creating any needed parents
		var nodeSet = new Set();
		var nodeList = new Array();

		// Define the recursive function
		function addNode(d, index) {
			// Skip base case
			if (d.id ==="") {
				return;
			}

			// If no parent exists, we need to add it
			else if (!nodeSet.has(d.parent)) {
				addNode({
					"id": d.parent,
					"parent": d.parent.substring(0, d.parent.lastIndexOf("__")),
					"name": d.parent.includes("__") ? d.parent.substring(d.parent.lastIndexOf("__")+2) : d.parent.substring(d.parent.lastIndexOf("__"))
				})
			}

			// Either way, now simply add the node
			nodeSet.add(d.id)
			nodeList.push(d)
		}

		// Call it
		data.forEach(addNode);

		// Finally, stratify it.
		var cleanedData = d3.stratify()
			.id(d => d.id)
			.parentId(d => d.parent)
			(nodeList);

		console.log(cleanedData);

		if (callback instanceof Function){
			callback(cleanedData);
		}
	});

}