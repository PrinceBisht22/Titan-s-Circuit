document.addEventListener('DOMContentLoaded', () => {
    // Game constants
    const PLAYER_RED = 'red';
    const PLAYER_BLUE = 'blue';
    const TOTAL_TITANS = 4;
    const TOTAL_GAME_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds
    const TURN_TIME = 30 * 1000; // 30 seconds in milliseconds
    
    // Game state
    let gameState = {
        currentPlayer: PLAYER_RED,
        phase: 'placement', // 'placement' or 'movement'
        redScore: 0,
        blueScore: 0,
        redTitansPlaced: 0,
        blueTitansPlaced: 0,
        redTitansRemaining: TOTAL_TITANS,
        blueTitansRemaining: TOTAL_TITANS,
        nodes: [],
        edges: [],
        unlockedCircuit: 1, // 1 = outer, 2 = middle, 3 = inner
        gameOver: false,
        gamePaused: false,
        overallTimer: null,
        turnTimer: null,
        overallTimeRemaining: TOTAL_GAME_TIME,
        turnTimeRemaining: TURN_TIME,
        selectedNode: null,
        lastUpdateTime: Date.now()
    };
    
    // DOM elements
    const hexGrid = document.getElementById('hex-grid');
    const scoreRed = document.getElementById('score-red');
    const scoreBlue = document.getElementById('score-blue');
    const titansRed = document.getElementById('titans-red');
    const titansBlue = document.getElementById('titans-blue');
    const timerRed = document.getElementById('timer-red');
    const timerBlue = document.getElementById('timer-blue');
    const playerRed = document.getElementById('player-red');
    const playerBlue = document.getElementById('player-blue');
    const gameStatus = document.getElementById('game-status');
    const pauseBtn = document.getElementById('pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    
    // Initialize the game
    function initGame() {
        createHexGrid();
        updateUI();
        startTimers();
        setupEventListeners();
    }
    
    // Create the hexagonal grid
    function createHexGrid() {
        // Clear existing grid
        hexGrid.innerHTML = '';
        gameState.nodes = [];
        gameState.edges = [];
        
        // Create three concentric hexagons
        const centerX = 50;
        const centerY = 50;
        const hexagons = [
            { radius: 45, weight: 1 }, // Outer
            { radius: 30, weight: 2 },  // Middle
            { radius: 15, weight: 3 }   // Inner
        ];
        
        // Create nodes for each hexagon
        hexagons.forEach((hexagon, hexIndex) => {
            const circuit = hexIndex + 1; // 1, 2, or 3
            
            for (let i = 0; i < 6; i++) {
                const angle = (i * 60 - 30) * Math.PI / 180;
                const x = centerX + hexagon.radius * Math.cos(angle);
                const y = centerY + hexagon.radius * Math.sin(angle);
                
                const node = {
                    id: `node-${circuit}-${i}`,
                    circuit,
                    position: i,
                    x,
                    y,
                    occupied: null, // null, 'red', or 'blue'
                    element: null
                };
                
                gameState.nodes.push(node);
            }
        });
        
        // Create edges between nodes
        // Inner connections (within each hexagon)
        for (let circuit = 1; circuit <= 3; circuit++) {
            for (let i = 0; i < 6; i++) {
                const next = (i + 1) % 6;
                const node1 = gameState.nodes.find(n => n.circuit === circuit && n.position === i);
                const node2 = gameState.nodes.find(n => n.circuit === circuit && n.position === next);
                
                if (node1 && node2) {
                    gameState.edges.push({
                        node1: node1.id,
                        node2: node2.id,
                        weight: hexagons[circuit - 1].weight,
                        controlledBy: null
                    });
                }
            }
        }
        
        // Define specific connection points between circuits
        // Only connect at specific positions between circuit 1 and 2
        const circuit1to2Connections = [0, 2, 4]; // Connect at these positions
        for (let pos of circuit1to2Connections) {
            const node1 = gameState.nodes.find(n => n.circuit === 1 && n.position === pos);
            const node2 = gameState.nodes.find(n => n.circuit === 2 && n.position === pos);
            
            if (node1 && node2) {
                gameState.edges.push({
                    node1: node1.id,
                    node2: node2.id,
                    weight: hexagons[0].weight, // Weight of circuit 1
                    controlledBy: null
                });
            }
        }
        
        // Only connect at specific positions between circuit 2 and 3
        const circuit2to3Connections = [1, 3, 5]; // Connect at different positions
        for (let pos of circuit2to3Connections) {
            const node1 = gameState.nodes.find(n => n.circuit === 2 && n.position === pos);
            const node2 = gameState.nodes.find(n => n.circuit === 3 && n.position === pos);
            
            if (node1 && node2) {
                gameState.edges.push({
                    node1: node1.id,
                    node2: node2.id,
                    weight: hexagons[1].weight, // Weight of circuit 2
                    controlledBy: null
                });
            }
        }
        
        // Render nodes and edges
        renderGrid();
    }
    
    // Render the grid
    function renderGrid() {
        // Clear existing grid
        hexGrid.innerHTML = '';
        
        // Create a container for the hex grid
        const container = document.createElement('div');
        container.className = 'hexagon';
        hexGrid.appendChild(container);
        
        // Render edges first (so they appear behind nodes)
        gameState.edges.forEach(edge => {
            const node1 = gameState.nodes.find(n => n.id === edge.node1);
            const node2 = gameState.nodes.find(n => n.id === edge.node2);
            
            if (node1 && node2) {
                const edgeElement = document.createElement('div');
                edgeElement.className = 'edge';
                
                // Calculate edge position and dimensions
                const x1 = node1.x;
                const y1 = node1.y;
                const x2 = node2.x;
                const y2 = node2.y;
                
                const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
                
                edgeElement.style.width = `${length}%`;
                edgeElement.style.left = `${x1}%`;
                edgeElement.style.top = `${y1}%`;
                edgeElement.style.transformOrigin = '0 0';
                edgeElement.style.transform = `rotate(${angle}deg)`;
                
                // Highlight if controlled
                if (edge.controlledBy) {
                    edgeElement.classList.add('highlight');
                    edgeElement.style.backgroundColor = edge.controlledBy === PLAYER_RED ? '#ff5252' : '#4285f4';
                }
                
                // Add edge weight label
                const weightLabel = document.createElement('div');
                weightLabel.className = 'edge-weight';
                weightLabel.textContent = edge.weight;
                
                // Position label in the middle of the edge
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;
                weightLabel.style.left = `${midX}%`;
                weightLabel.style.top = `${midY}%`;
                
                container.appendChild(edgeElement);
                container.appendChild(weightLabel);
            }
        });
        
        // Render nodes
        gameState.nodes.forEach(node => {
            const nodeElement = document.createElement('div');
            nodeElement.className = 'node';
            nodeElement.id = node.id;
            
            // Position the node
            nodeElement.style.left = `${node.x}%`;
            nodeElement.style.top = `${node.y}%`;
            
            // Set occupied color if applicable
            if (node.occupied) {
                nodeElement.classList.add(`occupied-${node.occupied}`);
            }
            
            // Disable nodes that are in locked circuits
            if (node.circuit > gameState.unlockedCircuit) {
                nodeElement.classList.add('locked');
                nodeElement.style.pointerEvents = 'none';
                nodeElement.style.opacity = '0.5';
            } else {
                // Make sure unlocked nodes are fully visible
                nodeElement.classList.remove('locked');
                nodeElement.style.pointerEvents = 'auto';
                nodeElement.style.opacity = '1';
            }
            
            container.appendChild(nodeElement);
            node.element = nodeElement;
        });
    }
    
    // Update the UI based on game state
    function updateUI() {
        // Update scores
        scoreRed.textContent = gameState.redScore;
        scoreBlue.textContent = gameState.blueScore;
        
        // Update titan counts
        titansRed.textContent = gameState.redTitansRemaining;
        titansBlue.textContent = gameState.blueTitansRemaining;
        
        // Update player turn indicators
        playerRed.classList.toggle('active', gameState.currentPlayer === PLAYER_RED && !gameState.gameOver);
        playerBlue.classList.toggle('active', gameState.currentPlayer === PLAYER_BLUE && !gameState.gameOver);
        
        // Update game status text
        if (gameState.gameOver) {
            if (gameState.redScore > gameState.blueScore) {
                gameStatus.textContent = 'Game Over - Red Player Wins!';
            } else if (gameState.blueScore > gameState.redScore) {
                gameStatus.textContent = 'Game Over - Blue Player Wins!';
            } else {
                gameStatus.textContent = 'Game Over - Draw!';
            }
        } else if (gameState.gamePaused) {
            gameStatus.textContent = 'Game Paused';
        } else {
            const phaseText = gameState.phase === 'placement' ? 'Placement Phase' : 'Movement Phase';
            gameStatus.textContent = `${gameState.currentPlayer === PLAYER_RED ? 'Red' : 'Blue'} Player's Turn (${phaseText})`;
        }
        
        // Update timers
        updateTimerDisplays();
    }
    
    // Update timer displays
    function updateTimerDisplays() {
        const formatTime = (ms) => {
            const minutes = Math.floor(ms / 60000);
            const seconds = Math.floor((ms % 60000) / 1000);
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        };
        
        timerRed.textContent = formatTime(gameState.currentPlayer === PLAYER_RED ? gameState.turnTimeRemaining : gameState.overallTimeRemaining);
        timerBlue.textContent = formatTime(gameState.currentPlayer === PLAYER_BLUE ? gameState.turnTimeRemaining : gameState.overallTimeRemaining);
    }
    
    // Start game timers
    function startTimers() {
        gameState.lastUpdateTime = Date.now();
        
        // Clear existing timers
        if (gameState.overallTimer) clearInterval(gameState.overallTimer);
        if (gameState.turnTimer) clearInterval(gameState.turnTimer);
        
        // Overall game timer
        gameState.overallTimer = setInterval(() => {
            if (!gameState.gamePaused && !gameState.gameOver) {
                const now = Date.now();
                const elapsed = now - gameState.lastUpdateTime;
                gameState.overallTimeRemaining -= elapsed;
                gameState.lastUpdateTime = now;
                
                // Update turn timer for current player
                if (gameState.currentPlayer === PLAYER_RED) {
                    gameState.turnTimeRemaining -= elapsed;
                } else {
                    gameState.turnTimeRemaining -= elapsed;
                }
                
                // Check if turn time expired
                if (gameState.turnTimeRemaining <= 0) {
                    endTurn();
                }
                
                // Check if game time expired
                if (gameState.overallTimeRemaining <= 0) {
                    endGame();
                }
                
                updateTimerDisplays();
            }
        }, 1000);
    }
    
    // Setup event listeners
    function setupEventListeners() {
        // Node click handler
        hexGrid.addEventListener('click', handleNodeClick);
        
        // Pause button
        pauseBtn.addEventListener('click', handlePauseClick);
        
        // Reset button
        resetBtn.addEventListener('click', handleResetClick);
    }
    
    // Event handler functions (defined separately to allow removal)
    function handleNodeClick(e) {
        if (gameState.gameOver || gameState.gamePaused) return;
        
        const nodeElement = e.target.closest('.node');
        if (!nodeElement) return;
        
        const nodeId = nodeElement.id;
        const node = gameState.nodes.find(n => n.id === nodeId);
        
        if (!node || node.circuit > gameState.unlockedCircuit) return;
        
        if (gameState.phase === 'placement') {
            handlePlacement(node);
        } else {
            handleMovement(node);
        }
    }
    
    function handlePauseClick() {
        gameState.gamePaused = !gameState.gamePaused;
        pauseBtn.textContent = gameState.gamePaused ? 'Resume' : 'Pause';
        updateUI();
        
        if (!gameState.gamePaused) {
            gameState.lastUpdateTime = Date.now();
        }
    }
    
    function handleResetClick() {
        if (confirm('Are you sure you want to reset the game?')) {
            resetGame();
        }
    }
    
    // Remove event listeners
    function removeEventListeners() {
        hexGrid.removeEventListener('click', handleNodeClick);
        pauseBtn.removeEventListener('click', handlePauseClick);
        resetBtn.removeEventListener('click', handleResetClick);
    }
    
    // Reset the game
    function resetGame() {
        // Remove existing event listeners
        removeEventListeners();
        
        // Reset game state
        gameState = {
            currentPlayer: PLAYER_RED,
            phase: 'placement',
            redScore: 0,
            blueScore: 0,
            redTitansPlaced: 0,
            blueTitansPlaced: 0,
            redTitansRemaining: TOTAL_TITANS,
            blueTitansRemaining: TOTAL_TITANS,
            nodes: [],
            edges: [],
            unlockedCircuit: 1,
            gameOver: false,
            gamePaused: false,
            overallTimer: null,
            turnTimer: null,
            overallTimeRemaining: TOTAL_GAME_TIME,
            turnTimeRemaining: TURN_TIME,
            selectedNode: null,
            lastUpdateTime: Date.now()
        };
        
        // Reinitialize the game
        initGame();
    }
    
    // Handle placement phase
    // Handle placement phase
    function handlePlacement(node) {
        // Check if node is already occupied
        if (node.occupied) return;
        
        // Place the titan
        node.occupied = gameState.currentPlayer;
        node.element.classList.add(`occupied-${gameState.currentPlayer}`);
        
        // Update titan counts
        if (gameState.currentPlayer === PLAYER_RED) {
            gameState.redTitansPlaced++;
            gameState.redTitansRemaining--;
        } else {
            gameState.blueTitansPlaced++;
            gameState.blueTitansRemaining--;
        }
        
        // Check if current circuit is full
        checkCircuitCompletion();
        
        // Update edge controls
        updateEdgeControls();
        
        // Check if all titans are placed
        if ((gameState.currentPlayer === PLAYER_RED && gameState.redTitansPlaced === TOTAL_TITANS) ||
            (gameState.currentPlayer === PLAYER_BLUE && gameState.blueTitansPlaced === TOTAL_TITANS)) {
            // All titans placed, move to next phase if both players are done
            if (gameState.redTitansPlaced === TOTAL_TITANS && gameState.blueTitansPlaced === TOTAL_TITANS) {
                gameState.phase = 'movement';
            }
        }
        
        // Switch player if both have placed their titans for this circuit
        endTurn();
    }
    
    // Handle movement phase
    function handleMovement(node) {
        // If no node is selected, select this node if it's occupied by current player
        if (!gameState.selectedNode) {
            if (node.occupied === gameState.currentPlayer) {
                gameState.selectedNode = node;
                node.element.style.border = '2px solid white';
                return;
            }
            return;
        }
        
        // If the same node is clicked again, deselect it
        if (node.id === gameState.selectedNode.id) {
            gameState.selectedNode.element.style.border = '';
            gameState.selectedNode = null;
            return;
        }
        
        // Check if the target node is empty and adjacent to the selected node
        if (node.occupied || !areNodesAdjacent(gameState.selectedNode, node)) {
            return;
        }
        
        // Move the titan
        const playerColor = gameState.selectedNode.occupied;
        gameState.selectedNode.element.classList.remove(`occupied-${playerColor}`);
        gameState.selectedNode.element.style.border = '';
        gameState.selectedNode.occupied = null;
        
        node.occupied = gameState.currentPlayer;
        node.element.classList.add(`occupied-${gameState.currentPlayer}`);
        
        // Update edge controls
        updateEdgeControls();
        
        // Check if current circuit is fully occupied
        checkCircuitCompletion();
        
        // Check if inner hexagon is fully occupied
        checkInnerHexagonCompletion();
        
        // End turn
        gameState.selectedNode = null;
        endTurn();
    }
    
    // Check if two nodes are adjacent
    function areNodesAdjacent(node1, node2) {
        return gameState.edges.some(edge => 
            (edge.node1 === node1.id && edge.node2 === node2.id) ||
            (edge.node1 === node2.id && edge.node2 === node1.id)
        );
    }
    
    // Update edge controls based on current node occupations
    function updateEdgeControls() {
        gameState.edges.forEach(edge => {
            const node1 = gameState.nodes.find(n => n.id === edge.node1);
            const node2 = gameState.nodes.find(n => n.id === edge.node2);
            
            if (node1.occupied && node1.occupied === node2.occupied) {
                // Both nodes are occupied by the same player
                const previousController = edge.controlledBy;
                edge.controlledBy = node1.occupied;
                
                // Update score if control changed
                if (previousController !== edge.controlledBy) {
                    if (edge.controlledBy === PLAYER_RED) {
                        gameState.redScore += edge.weight;
                    } else {
                        gameState.blueScore += edge.weight;
                    }
                    
                    // If previous controller lost control, deduct points
                    if (previousController) {
                        if (previousController === PLAYER_RED) {
                            gameState.redScore -= edge.weight;
                        } else {
                            gameState.blueScore -= edge.weight;
                        }
                    }
                }
            } else if (edge.controlledBy) {
                // Edge is no longer controlled
                if (edge.controlledBy === PLAYER_RED) {
                    gameState.redScore -= edge.weight;
                } else {
                    gameState.blueScore -= edge.weight;
                }
                edge.controlledBy = null;
            }
        });
        
        renderGrid();
        updateUI();
    }
    
    // Check if current circuit is fully occupied
    function checkCircuitCompletion() {
        // Check the currently unlocked circuit
        const circuit = gameState.unlockedCircuit;
        const circuitNodes = gameState.nodes.filter(n => n.circuit === circuit);
        const isFull = circuitNodes.every(n => n.occupied);
        
        console.log(`Checking circuit ${circuit}, isFull: ${isFull}, nodes: ${circuitNodes.length}`);
        
        // If this circuit is full and we can unlock the next one
        if (isFull && circuit < 3) {
            // Increment to the next circuit
            gameState.unlockedCircuit++;
            console.log(`Unlocking circuit ${gameState.unlockedCircuit}`);
            
            // Force re-render to update node visibility
            renderGrid();
            
            // Show a notification to the player
            gameStatus.textContent = `Circuit ${gameState.unlockedCircuit} unlocked!`;
            setTimeout(() => {
                updateUI(); // Reset the status message after a delay
            }, 2000);
        }
    }
    
    // Check if inner hexagon is fully occupied (end game condition)
    function checkInnerHexagonCompletion() {
        const innerNodes = gameState.nodes.filter(n => n.circuit === 3);
        const isFull = innerNodes.every(n => n.occupied);
        
        if (isFull) {
            endGame();
        }
    }
    
    // Get adjacent nodes for a given node
    function getAdjacentNodes(node) {
        const adjacentEdges = gameState.edges.filter(edge => 
            edge.node1 === node.id || edge.node2 === node.id
        );
        
        return adjacentEdges.map(edge => {
            return gameState.nodes.find(n => 
                n.id === (edge.node1 === node.id ? edge.node2 : edge.node1)
            );
        });
    }
    
    // End current player's turn
    function endTurn() {
        // Reset turn timer
        gameState.turnTimeRemaining = TURN_TIME;
        
        // Switch player
        gameState.currentPlayer = gameState.currentPlayer === PLAYER_RED ? PLAYER_BLUE : PLAYER_RED;
        
        updateUI();
    }
    
    // End the game
    function endGame() {
        gameState.gameOver = true;
        clearInterval(gameState.overallTimer);
        clearInterval(gameState.turnTimer);
        updateUI();
    }
    
    // Reset the game
    function resetGame() {
        // Clear existing timers
        if (gameState.overallTimer) clearInterval(gameState.overallTimer);
        if (gameState.turnTimer) clearInterval(gameState.turnTimer);
        
        // Reset game state
        gameState = {
            currentPlayer: PLAYER_RED,
            phase: 'placement',
            redScore: 0,
            blueScore: 0,
            redTitansPlaced: 0,
            blueTitansPlaced: 0,
            redTitansRemaining: TOTAL_TITANS,
            blueTitansRemaining: TOTAL_TITANS,
            nodes: [],
            edges: [],
            unlockedCircuit: 1,
            gameOver: false,
            gamePaused: false,
            overallTimer: null,
            turnTimer: null,
            overallTimeRemaining: TOTAL_GAME_TIME,
            turnTimeRemaining: TURN_TIME,
            selectedNode: null,
            lastUpdateTime: Date.now()
        };
        
        // Reinitialize the game
        initGame();
        pauseBtn.textContent = 'Pause'; // Reset pause button text
    }
    
    // Initialize the game
    initGame();
});
