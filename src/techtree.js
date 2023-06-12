// Vision:
// Tech tree works like this:
// At the beginning, only the broad categories of tech development are available.
// you have some facilities that enable unlocking certain techs.  Eg.
// engine test stand facility enables unlocking thruster technologies.
// once a tech is unlocked, future techs become available, if suitable facilities are present to implement.
// maybe test stand needs an upgrade to use pumps and tanks for liquid propellants?
// maybe vac chamber or electronics testing chamber need upgrades to develop later techs?
// also would be cool:
//   build and fly something with this tech to make the next tech on the tree unlock faster or cheaper, perhaps?
//   

// for now:
// create the tree with prerequesites and have it display in a not completely horrible fashion.  And then improve it.
// try using a tree layout from d3js.  I know you can make those things expand dynamically and format them to look pretty.

// First make the heirarchy:
const techTree = {
  name: "SpaceTech",
  description: "A variety of technologies useful in exploration utilization of the solar system",
  prerequisites: [],
  components: [],
  research: 100
}

function addTechnology(tech, prerequisites) {
  // Find the parent node(s) for the new technology
  prerequisites.forEach((p) => {
    const parentNode = findNode(techTree, p);
    // Add the new technology as a child node of the parent
    if (parentNode) {
      if (!parentNode.children) {
        parentNode.children = [];
      }
      const newChild = tech
      tech.parents = []
      tech.parents.push(parentNode)
      parentNode.children.push(newChild);
    }
  })
}

function findNode(node, name) {
  // Check if the current node matches the name
  if (node.name === name) {
    return node;
  }
  // Recursively check the child nodes
  if (node.children) {
    for (const child of node.children) {
      const foundNode = findNode(child, name);
      if (foundNode) {
        return foundNode;
      }
    }
  }
  return null;
}

//Technologies 
var techs = [
  { 
    name: "NOZZLES", 
    description: "We can direct gasses through a nozzle to produce thrust.",
    prerequisites: ["SpaceTech"],
    components: [{"Cold gas thruster":5},{"Hot gas thruster":2}],
    research: 25
  },
  {
    name: "CHEMICAL PROPULSION", 
    description: "Checmical reactions can produce large volumes of hot gas to direct through a nozzle, or for other purposes.",
    prerequisites: ["NOZZLES"],
    components: [{"Explosive Separation Bolts":1}],
    research: 45

  },
  { 
    name: "SOLID ROCKETS",
    description: "By mixing together a fuel and oxidizer and forming a stable combusting substance, we can construct inexpensive but low efficiency thrusters.",
    prerequisites: ["CHEMICAL PROPULSION"],
    components: [{"Ammonium perchlorate rocket":5},{"Nitrate sugar rocket":3},{"High energy composite rocket":3},{"Electric Solid Rocket":1}]
    research: 55
  },
  {
    name: "BIPROP THRUSTERS",
    description: "Thrust is achieved by combining a liquid or gaseous fuel and oxidizer in a combustion chamber and igniting the mixture",
    prerequisites: ["CHEMICAL PROPULSION"],
    components: [{"Lox Hydrogen engine":3},{"Lox Kerosene engine":5},{"N2F4 Pentaborane engine":3},{"N2O2 MMH engine":1}],
    research: 85
  },
  {
    name: "MONOPROP THRUSTERS",
    description: "Some chemical compounds contain a lot of energy and just need to be catalyzed to release it.",
    prerequisites: ["CHEMICAL PROPULSION"],
    components: [{"Hydrazine":3},{"Hot gas rocket":5},{"Peroxide":3}],
    research: 85
  }
]


for (tech of techs) {
  addTechnology(tech[0],tech[1])
}

// // TODO: fill these things out
// addTechnology("ELECTRIC", ["SpaceTech"])
// addTechnology("NUCLEAR", ["SpaceTech"])
// addTechnology("MECHANISMS", ["SpaceTech"])
// addTechnology("ENERGY STORAGE", ["SpaceTech"])
// addTechnology("LIFE SUPPORT", ["SpaceTech"])
// addTechnology("ELECTRONICS", ["SpaceTech"])
// addTechnology("ISRU", ["SpaceTech"])

// Maybe another way to look at this is to consider some spacecraft 
// components/vessels that we'd like in the game, and then back out what techs
// are required to support those components

// Components - relevant performance numbers - techs required?

// Propulsion techs

// INERT THRUSTERS
//   Cold gas - (.1N to 1kN thrust),(40-300s ISP), 5:1 thrust/weight (nozzle only)
//   Hot gas - (.1N to 2kN thrust),(80-500s ISP), 10:1 thrust/weight (nozzle only)
// CHEMICAL
//   Solid rocket - (1N to 1MN thrust),(100-250s ISP),(1-10% mass fraction), 3:1 thrust/weight at start of burn
//   monoprop - (.1N to 5kN thrust),(150-500S ISP), 20:1 thrust/weight (nozzle only)
//   biprop - (1N to 100MN thrust),(250-530 ISP), 1000:1 thrust/weight (nozzle only)
// ELECTRIC
//   Hall effect 
//   gridded ion 
//   vasimir 
// NUCLEAR
//   orion
//   nuclear-pile-warmed-fluid
//   fusion lightbulb 

// MECHANISMS
//    dock components together (requires fueled maneuver thrusters on one component stack?)
//    personnel passthrough? (is this separate from normal component docking.)
//    deployable antennae / solar panels / radiators (or is this too fine-grained? are these different from other techs?)
//    in-space assembly (bolts/clamps)
//    in-space construction (welding/cutting)
//    in-space fabrication (forging, fab, raw material refinement)

// Electronics / energy storage
//   Generators
//   Battery techs (old school lead / iron up to)
//   fuel cells
//   flywheels
//   capacitors

// heirarchy made.  Now draw out the tree.  Code provided by chatgpt.

const width = 800;
const height = 600;
const svg = d3.select("svg")
  .attr("width", width)
  .attr("height", height);

const treeLayout = d3.tree()
  .size([width, height]);

const rootNode = d3.hierarchy(techTree);

const links = treeLayout(rootNode).links();
const nodes = rootNode.descendants();

svg.selectAll(".link")
  .data(links)
  .enter()
  .append("path")
  .attr("class", "link")
  .attr("d", d3.linkHorizontal()
    .x(d => d.y)
    .y(d => d.x));

const node = svg.selectAll(".node")
  .data(nodes)
  .enter()
  .append("g")
  .attr("class", "node")
  .attr("transform", d => `translate(${d.y}, ${d.x})`);

node.append("circle")
  .attr("r", 5);

node.append("text")
  .attr("x", 10)
  .attr("y", 5)
  .text(d => d.data.name);


