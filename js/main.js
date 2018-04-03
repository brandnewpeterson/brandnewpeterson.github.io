var data = d3.csv("data/t10_routes.csv", function(error, data) {

    var bifinal = 0;
    var selected_element = 'all';
    var city_pairs;


    if (error) throw error;

    data_as_array = [];
    data.forEach(function(d,i){
        data_as_array[i] = Object.values(d);
    })

    var label_offset = 20;

    //Bipartate Viz

    data = data_as_array;

    var r1 = d3.select("#chart-area1").node().getBoundingClientRect(),
    width1 = r1.width, height1 = 800;

    var color = d3.scaleOrdinal(d3.schemeCategory10);
    var svg = d3.select("#chart-area1").append("svg")
    .attr("width", width1).attr("height", height1);

    var g = svg.append("g")
    .attr("transform", "translate(" + 100 + "," + 0 + ")" );

    var bp=viz.bP()
    .data(data)
    .min(12)
    .width(width1-100-160)
    .pad(1)
    .barSize(15)
    .fill(d=>color(d.primary));

    g.call(bp);

    g.selectAll(".mainBars")
    .on("mouseover",mouseover)
    .on("mouseout",mouseout)

    g.selectAll(".mainBars").append("text").attr("class","label")
    .attr("x",d=>(d.part=="primary"? -20: 20))
    .attr("y",d=>+6)
    .text(d=>d.key)
    .attr("text-anchor",d=>(d.part=="primary"? "end": "start"));


    g.selectAll(".mainBars").append("text").attr("class","perc")
    .attr("x",d=>(d.part=="primary"? -80: 140))
    .attr("y",d=>+6)
    .text(function(d){return d.value})
    .attr("text-anchor",d=>(d.part=="primary"? "end": "start"));

    function mouseover(d){
        bp.mouseover(d);
        selected_element = $(this).closest('.mainBars')['0']['__data__']['key'];
        update(city_pairs);
        g.selectAll(".mainBars")
        .select(".perc")
        .text(function(d){ return d.value})

    }
    function mouseout(d){
        bp.mouseout(d);
        selected_element = "all"
        update(city_pairs);
        g.selectAll(".mainBars")
        .select(".perc")
        .text(function(d){ return d.value})
    }

    var rects = g.selectAll(".mainBars").select('rect');
    rects.text(function(r, i) {
        if (r.x < width1/2){
            bifinal_h = r.y;
        }
    });

    //d3.select(self.frameElement).style("height", "800px");

    //World Map Viz
    var margin = {top: 0, left: 0, bottom: 0, right: 0}
    , width2 = parseInt(d3.select('#chart-area2').style('width'))
    , height2 = 800
    , width2 = width2 - margin.left - margin.right
    //, mapRatio = .5
    , height2 = bifinal_h - margin.top - margin.bottom

    var svg2 = d3.select("#chart-area2").append("svg")
    .attr('width', width2)
    .attr('height', height2);

    var projection = d3.geoMercator()
    .scale((width2 - 3) / (2 * Math.PI))
    .translate([width2/2,height2/2]);

    var path = d3.geoPath()
    .projection(projection);

    svg2.append("defs").append("path")
    .datum({type: "Sphere"})
    .attr("id", "sphere")
    .attr("d", path);


    d3.queue()
    .defer(d3.json, "data/50m.json")
    .defer(d3.csv, "data/t10_city_routes.csv")
    .await(makeMap);

    function makeMap(error, world, routes) {
        if (error) throw error;

        svg2.insert("path")
        .datum(topojson.feature(world, world.objects.land))
        .attr("class", "land")
        .attr("d", path);

        svg2.insert("path")
        .datum(topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; }))
        .attr("class", "boundary")
        .attr("d", path);

        city_pairs = routes;

        update(city_pairs);

    }


    function update(city_pairs){

        if (selected_element != 'all'){
            if(selected_element.indexOf('.') == -1 & selected_element != "Caribbean"){
                filtered_city_pairs = city_pairs.filter(function(d){return d.source_city == selected_element;});
            }
            else{
                filtered_city_pairs = city_pairs.filter(function(d){return d.target_region == selected_element;});
            }
        }

        //Join

        var paths = svg2.selectAll(".airport-arc")
        .data((selected_element == "all") ? [] : filtered_city_pairs,
        function(d) { return d.source_lat + d.source_lon + d.target_lat + d.target_lon; } );

        //Update

        //var land = svg2.selectAll(".land").attr("d", path);
        //svg2.selectAll(".boundary").attr("d", path);


        //Exit
        paths.exit().transition()
        .duration(500)
        .attrTween("stroke-dasharray", function() {
            var len = this.getTotalLength();
            return function(t) {
                return (d3.interpolateString(len + ",0", "0," + len))(t)
            };
        })
        .remove();

        svg2.selectAll(".airport-circle")
        .transition()
        .duration(200)
        .attr('r', 0)
        .remove();


        //Enter and Update
        paths.enter().append("path")
        .attr("class", "airport-arc")
        .attr("d", function(d) {
            return path(
                {
                    type: "LineString",
                    coordinates:
                    [
                        [+d.source_lon, +d.source_lat],
                        [+d.target_lon, +d.target_lat]
                    ]
                });
            })
            .style("stroke", function(d){return color(d.source_city);})
            .style("stroke-width", 0.5)
            .style("opacity", 0.75)
            .style("fill", "none")
            .transition()
            .duration(500)
            .attrTween("stroke-dasharray", function() {
                var len = this.getTotalLength();
                return function(t) {
                    return (d3.interpolateString("0," + len, len + ",0"))(t)
                };
            })
            .on('end', function(d) {
                var c = projection([+d.target_lon, +d.target_lat])
                svg2.append('circle')
                .attr("class", "airport-circle")
                .attr('cx', c[0])
                .attr('cy', c[1])
                .attr('r', 0)
                .style('fill', color(d.source_city))
                .style('opacity', 0.5)
                .transition()
                .duration(200)
                .attr('r', 2)
            });

        }

    });
    window.onresize = function(){ location.reload(); };
