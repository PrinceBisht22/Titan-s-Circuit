class Board {
    constructor() { // The constructor method is called when a new instance of the Board class is created.
      this.nodes = []; // Array to store all nodes on the board
      this.edges = []; // Array to store all edges on the board
      this.boardElement = document.getElementById("game-board"); // The game board element
      this.unlockedCircuits = [0]; // Start with only the outer circuit unlocked
      this.selectedNode = null; // The currently selected node
    }
  
    initialize() { // The initialize method is reponsible for setting up the game board.
      this.createNodes(); // Create nodes on the board
      this.createEdges(); // Create edges between nodes
      this.render(); // Render the initial board
    }
  
    createNodes() {
      // Create nodes for each circuit
      // the outer loop iterates through each circuit,
      // and the inner loop iterates through each node within that circuit.
      for (let circuitIndex = 0; circuitIndex < CIRCUIT_COUNT; circuitIndex++) {
        const radius = CIRCUIT_RADII[circuitIndex]; // Get the radius for this circuit
        const centerX = this.boardElement.offsetWidth / 2; // x-axis of the Center of the board
        const centerY = this.boardElement.offsetHeight / 2; // y-axis of the Center of the board
  
        // Code for positioning of each node within the circuit.
        // The nodes are positioned around the circumference of the circle using polar coordinates.
        // first the polar coordinates are calculated and then converted to cartesian coordinates.
        // The angle is calculated by dividing the curent node index by the total number of nodes 
        // and multiplying by 2Ï (the circumference of a circle).
        for (let nodeIndex = 0; nodeIndex < NODES_PER_CIRCUIT; nodeIndex++) {
          // Calculate anle for each node (in radians)
          // Subtracting Math.PI/2 rotates the starting position by 90 degrees counterclockwise,
          // making the first node appear at the top of the circle instead of at the right side
          const angle = (nodeIndex * 2 * Math.PI) / NODES_PER_CIRCUIT - Math.PI / 2;
  
          // Calculate x and y coordinates
          const x = centerX + radius * Math.cos(angle); // x-coordinate of the node
          const y = centerY + radius * Math.sin(angle); // y-coordinate of the node
  
          // finally, a node object is created and all the properties added to the nodes array for each node.
          
          /* Each node has:
  
          - A unique id (based on the current length of the nodes array)
          - The circuitIndex it belongs to (outer, middle, inner)
          - Its nodeIndex position within that circuit
          - Its x and y coordinates for positioning on the board
          - A titan property that starts as null but will hold a player color when occupied
  
          */
          this.nodes.push({
            id: this.nodes.length,
            circuitIndex,
            nodeIndex,
            x,
            y,
            titan: null, // Will be set to player color when occupied
          });
        }
      }
    }
  
    createEdges() {
      // Create edges within each circuit
      // The outer loop iterates through each circuit,
      // and the inner loop iterate through each node within that circuit.
      for (let circuitIndex = 0; circuitIndex < CIRCUIT_COUNT; circuitIndex++) {
          // filter the nodes array to only include nodes that belong to the current circuitIndex.
        const circuitNodes = this.nodes.filter(
          (node) => node.circuitIndex === circuitIndex 
        );
  
        // Connect node within the same circuit
        for (let i = 0; i < circuitNodes.length; i++) {
          const node1 = circuitNodes[i];
          const node2 = circuitNodes[(i + 1) % circuitNodes.length];
          // The epression (i + 1) % circuitNodes.length is important
          // it creates a circular connection. When i reaches the last node,
          // this formula connects it back to the first node, completing the circuit.
  
          // Set edge weights based on circuitIndex
          let weight;
          if (circuitIndex === 0) { // Outer circuit
            // Weights for outer circuit: 1, 2, 3, 1, 1, 1 (clockwise from top)
            const outerWeights = [2, 1, 1, 3, 2, 1];
            weight = outerWeights[i];
          } else if (circuitIndex === 1) { // Middle circuit
            // Weights for middle circuit: 6, 4, 5, 6, 5, 4 (clockwise from top)
            const middleWeights = [4, 5, 6, 4, 5, 6];
            weight = middleWeights[i];
          } else { // Inner circuit
            // Weights for inner circuit: 8, 9, 8, 8, 9, 8 (clockwise from top)
            const innerWeights = [9, 8, 8, 9, 8, 8];
            weight = innerWeights[i];
          }
  
          // Add the edge to the edges array
          // The edge object has:
  
          // - A unique id (based on the current length of the edges array)
          // - The ids of the two nodes it connects
          // - The weight of the edge (determined by the circuitIndex)
          // - A controlledBy property that starts as null but will hold a player color when controlled by a player
  
          /*
          The controlledBy property is used to determine hether an edge is controlled by a player.
          If the edge is controlled by a player, the edge will be highlighted on the board.
          */
  
          this.edges.push({
            id: this.edges.length,
            node1: node1.id,
            node2: node2.id,
            weight,
            controlledBy: null,
          });
        }
      }
  
      // Create cross edges between circuits with weight 1
      // only specific node are connected between circuits
      // Outer to middle circuit: connections at alternating nodes
      // Middle to inner circuit: connections at the other alternating nodes
      
      // Define which nodes should have cross connections
      const outerToMiddleConnections = [0, 2, 4]; // Nodes at top, bottom-right, bottom-left
      const middleToInnerConnections = [1, 3, 5]; // Nodes at top-right, bottom, top-left
      
      // Create outer to middle connections
      for (let i = 0; i < outerToMiddleConnections.length; i++) {
        const nodeIndex = outerToMiddleConnections[i];
        // find the node in the outer circuit (circuitIndex 0) that has the current nodeIndex.
        const outerNode = this.nodes.find(
          (node) => node.circuitIndex === 0 && node.nodeIndex === nodeIndex
        );
  
        // finds the node in the mddle circuit (circuitIndex 1) that has the current nodeIndex.
        const middleNode = this.nodes.find(
          (node) => node.circuitIndex === 1 && node.nodeIndex === nodeIndex
        );
  
        // Create the edge and add it to the edges array
        // The edge object has:
  
        // - A unique id (based on the current length of the edges array)
        // - The ids of the two nodes it connects
        // - A weight of 1 (since it's a cross edge)
        // - A controlledBy property that starts as null but will hold a player color when controlled by a player
        
        this.edges.push({
          id: this.edges.length,
          node1: outerNode.id,
          node2: middleNode.id,
          weight: 1,
          controlledBy: null,
        });
      }
      
      // Create middle to iner connections
      for (let i = 0; i < middleToInnerConnections.length; i++) {
        const nodeIndex = middleToInnerConnections[i];
        // finds the node in the middle circuit (circuitIndex 1) that has the current nodeIndex.
        const middleNode = this.nodes.find(
          (node) => node.circuitIndex === 1 && node.nodeIndex === nodeIndex
        );
  
        // finds the node in the inner circuit (circuitIndex 2) that has the current nodeIndex.
        const innerNode = this.nodes.find(
          (node) => node.circuitIndex === 2 && node.nodeIndex === nodeIndex
        );
        
        // Create the edge and add it to the edges array
        // The edge object has:
  
        // - A unique id (based on the current length of the edges array)
        // - The ids of the two nodes it connects
        // - A weight of 1 (since it's  cross edge)
        // - A controlledBy property that starts as null but will hold a player color when controlled by a player
  
        this.edges.push({
          id: this.edges.length,
          node1: middleNode.id,
          node2: innerNode.id,
          weight: 1,
          controlledBy: null,
        });
      }
    }
  
    render() {
      // Clear the board
      this.boardElement.innerHTML = "";
  
      // Render edges
      this.edges.forEach((edge) => {
        const node1 = this.nodes[edge.node1];
        const node2 = this.nodes[edge.node2];
        
        const edgeElement = document.createElement("div");
        edgeElement.className = "edge";
  
        // Add controlledBy class if edge is controlled by a player
        if (edge.controlledBy) {
          edgeElement.classList.add(`${edge.controlledBy}-controlled`);
        }
  
        // Calculate edge length and angle
        const dx = node2.x - node1.x;
        const dy = node2.y - node1.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        
        // Calculate node radius (half the node width)
        const nodeRadius = 15; // Half of the 30px node width
        
        // Calculate the adjusted start and end points to touch the node borders
        const ratio = nodeRadius / length;
        const offsetX = dx * ratio;
        const offsetY = dy * ratio;
        
        // Adjust the starting point to be at the edge of the first node
        const startX = node1.x + offsetX;
        const startY = node1.y + offsetY;
        
        // Adjust the length to account for both nodes' radii
        const adjustedLength = length - (2 * nodeRadius);
  
        // Position and rotate the edge
        edgeElement.style.width = `${adjustedLength}px`;
        edgeElement.style.left = `${startX}px`;
        edgeElement.style.top = `${startY}px`;
        edgeElement.style.transform = `rotate(${angle}deg)`;
  
        this.boardElement.appendChild(edgeElement);
  
        // Add edge weight
        const weightElement = document.createElement("div");
        weightElement.className = "edge-weight";
        weightElement.textContent = edge.weight;
  
        // Position the weight element in the middle of the edge
        weightElement.style.left = `${node1.x + dx / 2}px`;
        weightElement.style.top = `${node1.y + dy / 2}px`;
  
        // Append the weight element to the board
        this.boardElement.appendChild(weightElement);
      });
  
      // Render nodes
      // begins a loop that iterates through each node in the this.nodes array.
      this.nodes.forEach((node) => {
      // Creates a new div element to represent the node on the board and assigns it the CSS class "node".
      // The nodeElement is also given a data attribute nodeId with the value of node.id for later reference.    
        const nodeElement = document.createElement("div");
        nodeElement.className = "node";
        nodeElement.dataset.nodeId = node.id;
  
        // Add the titan if the node is occupied
        // If the node has a non-null titan property, it adds a CSS class to the nodeElement.
        // The class name is constructed by concatenating the player color and the string "-titan".
        if (node.titan) {
          nodeElement.classList.add(`${node.titan}-titan`);
        }
  
        // Position the node
        // set the left and top CSS properties of the nodeElement to the x and y coordinates of the node.
        nodeElement.style.left = `${node.x}px`;
        nodeElement.style.top = `${node.y}px`;
  
        // Add click event listener to the node that clalls the handleNodeClick method with the node's id 
        // as an argument.
        nodeElement.addEventListener("click", () =>
          this.handleNodeClick(node.id)
        );
  
        this.boardElement.appendChild(nodeElement); // adds the nodeElement to the game board in the DOM.
      });
    }
  
    /* 
    The render() method is essential for this game because it is responsible for creating the visual 
    representation of the game board in the browser.
    */
  
    handleNodeClick(nodeId) {
      // This will be implemented in the Game class nd connected here
      // The handleNodeClick method is responsible for handling the click event on a node.
      // It calls the handleNodeClick method of the game instance with the node's id as an argument.
      if (window.game) {
        window.game.handleNodeClick(nodeId);
      }
    }
  
    isNodeAvailable(nodeId) {
      // Check if the node is available for placement
      const node = this.nodes[nodeId];
      return (
        node.titan === null // it doesn't have a titan assigned to it
        && this.unlockedCircuits.includes(node.circuitIndex) // it belongs to an unlocked circuit
      );
    }
  
    placeTitan(nodeId, player) { // The placeTitan method is responsible for placing a titan on the board.
      // It takes two arguments: the nodeId of the node where the titan will be placed and the player color.
      if (this.isNodeAvailable(nodeId)) {
        this.nodes[nodeId].titan = player; // sets the node's titan property to the player color.
        this.updateEdgeControl(); // calls the updateEdgeControl method to update the controlledBy property of the edges.
        this.render(); // calls the render method to update the visual representation of the game board.
        return true; // return true to indiate that the titan was successfully placed.
      }
      return false; // returns false to indicate that the titan was no successfully placed.
    }
  
    moveTitan(fromNodeId, toNodeId, player) { // The moveTitan method is responsible for moving a titan 
                                              // from one node to another.
      // It takes 3 arguments: the fromNodeId of the node whre the titan is currently located, 
      // the toNodeId of the node where the titan will be moved, and the player color.,
      const fromNode = this.nodes[fromNodeId]; // retreves the node object from the nodes array using the fromNodeId.
      const toNode = this.nodes[toNodeId]; // retrieves the node object from the nodes array using the toNodeId.
  
      // Check if the move is valid
      if (
        fromNode.titan === player && // the titan at the fromNode belongs to the player
        this.isNodeAvailable(toNodeId) && // the toNode is available for placement
        this.areNodesAdjacent(fromNodeId, toNodeId) // the fromNode and toNode are adjacent
      ) {
        // Move the titan
        fromNode.titan = null; // removes the titan frm the fromNode.
        toNode.titan = player; // adds the titan to the toNode.
        this.updateEdgeControl(); // calls the updateEdgeControl method to update the controlledBy property of the edges.
        this.render(); // calls the render method to update the visual representation of the game board.
        return true; // returns true to indicate that the titan was successfully moved.
      }
      return false; // returns flse to indicate that the titan was not successfully moved.
    }
  
    areNodesAdjacent(nodeId1, nodeId2) { // The areNodesAdjacent metod is responsible for checking if two nodes are adjacent.
      // It takes two arguments: the nodeId1 of the first node and the nodeId2 of the second node.
      return this.edges.some(
        (edge) =>
          (edge.node1 === nodeId1 && edge.node2 === nodeId2) || // checks if the edge connects the two nodes in either direction
          (edge.node1 === nodeId2 && edge.node2 === nodeId1) // checks if the edge connects the two nodes in either direction
      );
    }
  
    updateEdgeControl() { // The updateEdgeControl method is responsible for updating the controlledBy property of the edges.
      // It iterates over each edge and checks if both nodes connected by the edge have the same titan color.
      this.edges.forEach((edge) => {
        const node1 = this.nodes[edge.node1]; // retrieves the node object from the nodes array using the node1 property of the edge.
        const node2 = this.nodes[edge.node2]; // retrieves the node object from the nodes array using the node2 property of the edge.
  
        if (node1.titan === node2.titan) { // checks if both nodes have the ame titan color.
          edge.controlledBy = node1.titan; // If both nodes have the same player's titans, the edge is controlled by that player
        } else {
          edge.controlledBy = null; // If the nodes have different titan colors or one of them doesn't have a titan, the edge is not cntrolled.
        }
      });
    }
  
    getPlayerScore(player) { // The getPlayerScore method is responsible for calculating the score of a player.
      // It takes one argument: the player color.
      return this.edges // retrieves the edges array.
        .filter((edge) => edge.controlledBy === player) // filters the edges array to only include edges that are controlled by the player.
        .reduce((sum, edge) => sum + edge.weight, 0); // reduces the filtered edges array to a sum of the edge weights.
    }
  
    checkCircuitFilled(circuitIndex) { // The checkCircuitFilled method is responsible for checking if a circuit is filled.
      // It takes one argument: the circuitIndex of the circuit.
      const circuitNodes = this.nodes.filter( // retrieves the nodes array.
        (node) => node.circuitIndex === circuitIndex // filters the nodes array to only include nods that belong to the circuit.
      );
      return circuitNodes.every((node) => node.titan !== null); // checks if every node in the circuit has a titan assigned to it.
    }
  
    unlockNextCircuit() { // The unlockNextCircuit method is reponsible for unlocking the next circuit.
      if (this.unlockedCircuits.length < CIRCUIT_COUNT) { // It checks if the length of the unlockedCircuits array is less than the CIRCUIT_COUNT constant.
        this.unlockedCircuits.push( // If the condition is true, it pushes the next circuit index to the unlockedCircuits array.
          this.unlockedCircuits[this.unlockedCircuits.length - 1] + 1 // The next circuit index is calculated by adding 1 to the last element of the unlockedCircuits array.
        );
        return true; // It returns tru to indicate that the next circuit was unlocked.
      }
      return false; // If the condition is false, it returns false to indicate that no more circuits can be unlocked.
    }
  
    isTitanSurrounded(nodeId) { // The isTitanSurrounded method is responsible for checking if a titan is surrounded by opponent titans.
      // It takes one argument: the nodeId of the node.
      const node = this.nodes[nodeId]; // retrieves the node object from the nodes array using the nodeId.
      if (!node.titan) return false; // checks if the node has a titan assigned to it. If it doesn't, it returns false.
  
      const playerColor = node.titan; // retrieves the player colour of the titan.
      // calculates the player color of the opponent.
      const oppositeColor =
        playerColor === PLAYERS.RED ? PLAYERS.BLUE : PLAYERS.RED; 
  
      // Get all adjacent nodes
      const adjacentNodeIds = this.edges // retrieves the edges array.
        .filter((edge) => edge.node1 === nodeId || edge.node2 === nodeId) // filters the edges array to only include edges that are connected to the node.
        .map((edge) => (edge.node1 === nodeId ? edge.node2 : edge.node1)); // maps the filtered edges array to an array of nodeIds.
  
      // Check if all adjacent nodes are occupied by the opponent
      return (
        adjacentNodeIds.length > 0 && // checks if there are any adjacent nodes.
        // checks if every adjacent node has a titan assigned to it and that the titan is of the opponent color.
        adjacentNodeIds.every((id) => this.nodes[id].titan === oppositeColor)
      );
    }
  
    removeSurroundedTitans(player) { // The removeSurroundedTitans method is responsible for removing titans that are surrounded by opponent titans.
      // It takes one argument: the player color.
      // Only remove surrounded titans in hacker and hacker++ modes
      if (window.game && (window.game.gameMode === 'hacker' || window.game.gameMode === 'hacker++')) { // checks if the game instance exists and if the game mode is hacker or hacker++.
        // If the condition is true, it iterates over each node in the nodes array.
        let removed = false; // initializes a removed variable to false.
        this.nodes.forEach((node) => { // For each node, it checks if the node has a titan assigned to it and that the titan is of the player color.
          // If both conditions are true, it removes the titan from the node and sets the removed variable to true.
          if (node.titan === player && this.isTitanSurrounded(node.id)) {
            node.titan = null;
            removed = true;
          }
        });
  
        if (removed) { // If the removed variable is true, it calls the updateEdgeControl and render methods to update the game board.
          this.updateEdgeControl(); // calls the updateEdgeControl method to update the controlledBy property of the edges.
          this.render(); // calls the render method to update the visual representation of the game board.
        }
  
        return removed; // returns the removed variable.
      }
      
      // In normal mode, don't remove surrounded titans
      return false;
    }
  }
  