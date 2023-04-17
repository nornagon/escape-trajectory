// Vision:
// Tech tree maybe works like this:
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
}

function addTechnology(name, prerequisites) {
  // Find the parent node(s) for the new technology
  prerequisites.forEach((p) => {
    const parentNode = findNode(techTree, p);
    // Add the new technology as a child node of the parent
    if (parentNode) {
      if (!parentNode.children) {
        parentNode.children = [];
      }
      const newChild = { name };
      newChild.parent = parentNode;
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


addTechnology("AERO", ["SpaceTech"])
addTechnology("Aerodynamics", ["AERO"])
addTechnology("Jet Engines", ["Aerodynamics"])
addTechnology("Parachutes", ["AERO"])
addTechnology("Heat Shields", ["Parachutes"])
addTechnology("Perspiration Cooling", ["Heat Shields"])

addTechnology("CHEMICAL", ["SpaceTech"])
addTechnology("Cold gas thrusters", ["CHEMICAL"])
addTechnology("Hot gas thrusters", ["Cold gas thrusters"])
addTechnology("Solid rockets", ["CHEMICAL"])
addTechnology("Hybrid rockets", ["Solid rockets"])
addTechnology("Monoprop", ["CHEMICAL"])
addTechnology("Biprop", ["Solid rockets"])

// TODO: fill these things out
addTechnology("ELECTRIC", ["SpaceTech"])
addTechnology("NUCLEAR", ["SpaceTech"])
addTechnology("MECHANISMS", ["SpaceTech"])
addTechnology("ENERGY STORAGE", ["SpaceTech"])
addTechnology("LIFE SUPPORT", ["SpaceTech"])
addTechnology("ELECTRONICS", ["SpaceTech"])
addTechnology("ISRU", ["SpaceTech"])


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


