class Game {
    constructor() { // Initialize game state
        this.board = new Board(); // Initialize the game board
        this.currentPlayer = PLAYERS.RED; // Set the starting player to RED
        this.phase = PHASES.PLACEMENT; // Set the initial game phase to placement
        this.titansPlaced = {
            [PLAYERS.RED]: 0, // Track how many RED titans have been placed
            [PLAYERS.BLUE]: 0 // Track how many BLUE titans have been placed
        };
        this.selectedNodeId = null; // Track which node is currently selected (null = no selection)
        this.gameTimer = GAME_TIME; // Initialize the overall game timer
        this.turnTimer = TURN_TIME; // Initialize the turn timer
        this.isPaused = false; // Game tarts unpaused
        this.gameInterval = null; // Will store the game timer interval ID
        this.turnInterval = null; // Will store the trn timer interval ID
        
        // DOM elements
        this.statusMessage = document.getElementById('status-message'); // Element to display gme status
        this.gameTimerElement = document.getElementById('game-timer'); // Element to display game timer
        this.redTimerElement = document.getElementById('red-timer'); // Element to display RED player's timer
        this.blueTimerElement = document.getElementById('blue-timer'); // Element to display BLUE player's timer
        this.redScoreElement = document.getElementById('red-score'); // Element to display RED player's score
        this.blueScoreElement = document.getElementById('blue-score'); // Element to display BLUE player's score
        this.pauseButton = document.getElementById('pause-btn'); // Button to pause/reume the game
        this.resetButton = document.getElementById('reset-btn'); // Button to reset the game
        
        // Event listeners
        this.pauseButton.addEventListener('click', () => this.togglePause()); // Add click hadler for pause button
        this.resetButton.addEventListener('click', () => this.resetGame()); // Add click handler for reset button
        
        // Add these new properties
        this.powerUpActive = null; // Track which power-up is active (null = no power-up)
        this.powerUpStep = 0; // Track the current step in a multi-step power-up
        this.powerUpData = null; // Store dta related to the active power-up
        this.gameMode = 'normal'; // Set initial game mode ('normal', 'hacker', or 'hacker++')
    }
    
    initialize() {
        this.board.initialize(); // Initialize the game board
        this.updateUI(); // Update the user interface
        this.startTimers(); // Start the game timers
    }
    
    startTimers() { // tart the game timers
        // Game timer
        this.gameInterval = setInterval(() => { // Create interval to update game timer every econd
            // Update timers only if the game is not paused
            if (!this.isPaused) {
                this.gameTimer--; // Decrement the game timer

                // End the game if the timer reaches zero
                if (this.gameTimer <= 0) {
                    this.endGame(); // End the game hen time runs out
                }
                this.updateTimerDisplay(); // Update the timer display
            }
        }, 1000); // 1000 milliseconds = 1 second
        
        // Turn timer
        this.turnInterval = setInterval(() => { // Create interval to update turn timer every second
            // Update timers only if the game is not paused
            if (!this.isPaused) {
                this.turnTimer--; // Decrement the turn timer

                // Switch players if the timer reaches zero
                if (this.turnTimer <= 0) {
                    this.switchPlayer(); // Switch to the next player when turn time runs out
                }
                this.updateTimerDisplay(); // Updae the timer display
            }
        }, 1000); // 1000 milliseconds = 1 second
    }
    
    updateTimerDisplay() { // Update the timer display
        this.gameTimerElement.textContent = this.formatTime(this.gameTimer); // Update game timer display

        // Update turn timers for tge current player
        this.redTimerElement.textContent = this.currentPlayer === PLAYERS.RED ? 
            this.formatTime(this.turnTimer) : '00:30'; // Show RED tiner only when it's RED's turn
        this.blueTimerElement.textContent = this.currentPlayer === PLAYERS.BLUE ? 
            this.formatTime(this.turnTimer) : '00:30'; // Show BLUE timer only when it's BLUE's turn
    }
    
    formatTime(seconds) { // Format time in MM:SS format
        const mins = Math.floor(seconds / 60); // Calcukate minutes
        const secs = seconds % 60; // Calculate seconds
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`; // Format time as MM:SS with leading zeros
    }
    
    // Update handleNodeClick to handle power-ups
    handleNodeClick(nodeId) {
        if (this.isPaused) return; // Do nothing if the game is paused
        
        // If a power-up is active, handle it
        if (this.powerUpActive && this.hackerPlusMode) {
            this.hackerPlusMode.handlePowerUpNodeClick(nodeId); // Delegate to power-up handler
            return;
        }
        
        // Handle normal game logic
        if (this.phase === PHASES.PLACEMENT) { // If in placement phase
            this.handlePlacementPhase(nodeId); // Hadle placement phase logic
        } else { // If in movement phase
            this.handleMovementPhase(nodeId); // Handle movement phase logic
        }
    }
    
    handlePlacementPhase(nodeId) { // Handle placement phase
        const node = this.board.nodes[nodeId]; // Get the node object
        
        // Check if the node is in an unlocked circuit
        if (!this.board.unlockedCircuits.includes(node.circuitIndex)) { // If not i unlocked circuit
            this.statusMessage.textContent = 'This circuit is not unlocked yet!'; // Display error message
            return;
        }
        
        // Check if the node is available
        if (!this.board.isNodeAvailable(nodeId)) { // if node is already occupied
            this.statusMessage.textContent = 'This node is already occupied!'; // Display error message
            return;
        }
        
        // Place the titan
        if (this.board.placeTitan(nodeId, this.currentPlayer)) {
            this.titansPlaced[this.currentPlayer]++; 
            
            // Record the move if in haker mode
            if (this.hackerMode) {
                this.hackerMode.recordMove('place', this.currentPlayer, { nodeId });
            }
            
            // Check if the current circuit is filled
            const currentCircuit = this.board.unlockedCircuits[this.board.unlockedCircuits.length - 1]; // Get the innermost unlocked circuit
            if (this.board.checkCircuitFilled(currentCircuit)) { // If the innermost circuit is filled
                const unlocked = this.board.unlockNextCircuit(); // Unlock tje next circuit
                if (unlocked) { // If the next circuit i unlocked
                    this.statusMessage.textContent = `Circuit ${currentCircuit + 2} unlocked!`; // Display success message
                } 
            }
            
            // Check if all titans are placed
            if (this.titansPlaced[PLAYERS.RED] === TITANS_PER_PLAYER && // If all RED titans are placed
                this.titansPlaced[PLAYERS.BLUE] === TITANS_PER_PLAYER) { // If al BLUE titans are placed
                this.phase = PHASES.MOVEMENT; // Switch to movement phase
                this.statusMessage.textContent = `All titans placed! ${this.currentPlayer.toUpperCase()} player's turn to move.`; // Display phase change message
            } else { // If not all tjtans are placed
                this.switchPlayer(); // Switch to the next player
            }
        }
    }
    
    handleMovementPhase(nodeId) {
        const node = this.board.nodes[nodeId]; // Get the node object
        
        // If no node is selected and the clicked node has the current playr's titan
        if (this.selectedNodeId === null) {
            if (node.titan === this.currentPlayer) { // If clicked on own titan
                this.selectedNodeId = nodeId; // Select this node
                this.statusMessage.textContent = `Select a destination for your titan.`; // Prompt for destination
            } else { // If clicked on opponent's titan or empty node
                this.statusMessage.textContent = `Select your own titan to move.`; // Display error message
            }
        } 
        // If a node is already selected
        else {
            // If clicking the same node, deselect it
            if (this.selectedNodeId === nodeId) { // If clicked on already selected nod
                this.selectedNodeId = null; // Deelect the node
                this.statusMessage.textContent = `Move canceled. Select a titan to move.`; // Display cancellation message
            } 
            // Try to move the titan
            else if (this.board.moveTitan(this.selectedNodeId, nodeId, this.currentPlayer)) { // If move is valid
                // Record the move if in hacker mode
                if (this.hackerMode) {
                    this.hackerMode.recordMove('move', this.currentPlayer, { 
                        fromNodeId: this.selectedNodeId, 
                        toNodeId: nodeId 
                    });
                }
                
                this.selectedNodeId = null; // Deselect the node afer moving
                
                // Check for surrounded titans
                const oppositePlayer = this.currentPlayer === PLAYERS.RED ? PLAYERS.BLUE : PLAYERS.RED; // Get opponent player
                this.board.removeSurroundedTitans(oppositePlayer); // Remove any surrounded opponent titans
                
                // Check if any circuit is filled and unlock the next one if needed
                for (let i = 0; i < CIRCUIT_COUNT - 1; i++) { // Check each circuit ecept the innermost
                  if (this.board.checkCircuitFilled(i) && // If circuit is filled
                      !this.board.unlockedCircuits.includes(i + 1)) { // And next circuit is not unlocked
                    this.board.unlockNextCircuit(); // Unlock the next circuit
                    this.statusMessage.textContent = `Circuit ${i + 2} unlocked!`; // Display unlock message
                  }
                }
                
                // Check if the innermost circuit is filled
                if (this.board.checkCircuitFilled(CIRCUIT_COUNT - 1)) { // If innermost circuit is filed
                    this.endGame(); // End the game
                    return;
                }
                
                this.switchPlayer(); // Switch to the next player
            } else { // If move is invalid
                this.statusMessage.textContent = `Invalid move. Try again.`; // Display eror message
            }
        }
    }
    
    // Update switchPlayer to handle bot moves in single player mode
    switchPlayer() {
        this.currentPlayer = this.currentPlayer === PLAYERS.RED ? PLAYERS.BLUE : PLAYERS.RED; // Toggle current player
        this.turnTimer = TURN_TIME; // Reset the turn timer
        this.updateUI(); // Update the user interface
        
        // If in single player mode and it's the bot's turn, make a bot move
        if (this.hackerPlusMode && this.hackerPlusMode.singlePlayerMode && // If in single player mode
            this.currentPlayer === PLAYERS.BLUE && !this.isPaused) { // And it's BLUE's turn and game is nt paused
            this.hackerPlusMode.makeBotMove(); // Make a bot move
        }
    }
    
    updateUI() {
        // Update player indicators
        document.querySelector('.player-red').classList.toggle('active', this.currentPlayer === PLAYERS.RED); // Highlight RED if active
        document.querySelector('.player-blue').classList.toggle('active', this.currentPlayer === PLAYERS.BLUE); // Highlight BLUE if active
        
        // Update scores
        this.redScoreElement.textContent = this.board.getPlayerScore(PLAYERS.RED); // Update RED score display
        this.blueScoreElement.textContent = this.board.getPlayerScore(PLAYERS.BLUE); // Update BLUE score display
        
        // Update status message if not already set
        if (this.phase === PHASES.PLACEMENT) { // If in placement phase
            this.statusMessage.textContent = `${this.currentPlayer.toUpperCase()} player, place your titan on the outer circuit.`; // Display placment instruction
        } else { // If in movement phase
            this.statusMessage.textContent = `${this.currentPlayer.toUpperCase()} player's turn to move.`; // Display movement instruction
        }
    }
    
    togglePause() {
        this.isPaused = !this.isPaused; // Toggle pause state
        this.pauseButton.textContent = this.isPaused ? 'Resume' : 'Pause'; // Update button text
        this.statusMessage.textContent = this.isPaused ? 'Game Paused' : this.statusMessage.textContent; // Update status message
    }
    
    // Add method to set game mode
    setGameMode(mode) {
        this.gameMode = mode; // Set the game mode
        
        // Initialize the appropriate mode features
        if (mode === 'hacker' || mode === 'hacker++') { // If hacker or hacker++ mode
            if (!this.hackerMode) { // If hacker mode nt initialized
                this.hackerMode = new HackerMode(this); // Initialize hacker mode
            }
            
            document.getElementById('hacker-controls').style.display = 'flex'; // Show haker controls
            
            if (mode === 'hacker++') { // If hacker++ mode
                if (!this.hackerPlusMode) { // If hacker++ mode not initialized
                    this.hackerPlusMode = new HackerPlusMode(this, this.hackerMode); // Initialize hacker++ mode
                }
                document.getElementById('hacker-plus-controls').style.display = 'flex'; // Show hacker++ controls
            } else { // If only hacker mode
                document.getElementById('hacker-plus-controls').style.display = 'none'; // Hide hacker++ controls
            }
        } else { // If normal mode
            // Normal mode
            document.getElementById('hacker-controls').style.display = 'none'; // Hide hacker controls
            document.getElementById('hacker-plus-controls').style.display = 'none'; // Hide hacker++ controls
        }
        
        // Reset the game with the new mode
        this.resetGame(); // Reset the game to apply new mode
    }
    
    // Update resetGame to handle mode-specific resets
    resetGame(resetTimers = true) {
        // Clear timers
        clearInterval(this.gameInterval); // Stop ame timer
        clearInterval(this.turnInterval); // Stop turn timer
        
        // Reset game state
        this.currentPlayer = PLAYERS.RED; // Reset to RED player
        this.phase = PHASES.PLACEMENT; // Reset to placement phase
        this.titansPlaced = {
            [PLAYERS.RED]: 0, // Reset RED titans placed
            [PLAYERS.BLUE]: 0 // Reset BLUE titans placed
        };
        this.selectedNodeId = null; // Clear selected node
        this.gameTimer = GAME_TIME; // Reset game timer
        this.turnTimer = TURN_TIME; // Reet turn timer
        this.isPaused = false; // Unpause the game
        
        // Remove winner/tie classes and final score labels
        document.querySelector('.player-red').classList.remove('winner', 'tie');
        document.querySelector('.player-blue').classList.remove('winner', 'tie');
        
        // Remove final score labels if they exist
        const finalScoreLabels = document.querySelectorAll('.final-score-label');
        finalScoreLabels.forEach(label => label.remove());
        
        // Reset board
        this.board = new Board(); // Crate new board
        this.board.initialize(); // Initialize the board
        
        // Update UI
        this.updateUI(); // Update the user interface
        this.updateTimerDisplay(); // Update the timer display
        
        // Restart timers
        this.startTimers(); // Start the timers
        
        // Reset mode-specific features
        if (this.hackerMode) { // If hacker mode is active
            this.hackerMode.moveHistory = []; // Clear move history
            this.hackerMode.redoStack = []; // Clear redo stack
            this.hackerMode.updateButtons(); // Update hacker mode buttons
        }
        
        if (this.hackerPlusMode) { // If hacker++ mode is active
            this.powerUpActive = null; // Clear active power-up
            this.powerUpStep = 0; // Reset poer-up step
            this.powerUpData = null; // Clear power-up data
            
            // Reset power-ups
            this.hackerPlusMode.powerUps = {
                [PLAYERS.RED]: { swap: 1, extra: 1 }, // Reset RED player poer-ups
                [PLAYERS.BLUE]: { swap: 1, extra: 1 } // Reset BLUE player power-ups
            };
        }
    }
    
    endGame() {
        clearInterval(this.gameInterval); // Stop game timer
        clearInterval(this.turnInterval); // Stop turn timer
        
        const redScore = this.board.getPlayerScore(PLAYERS.RED); // Get RED player's score
        const blueScore = this.board.getPlayerScore(PLAYERS.BLUE); // Get BLUE player's score
        
        let winner = null;
        
        // Update player containers with fibal scores
        const redPlayerContainer = document.querySelector('.player-red');
        const bluePlayerContainer = document.querySelector('.player-blue');
        
        // Remove active class from bth players
        redPlayerContainer.classList.remove('active');
        bluePlayerContainer.classList.remove('active');
        
        // Add winner class to highlight the winner
        if (redScore > blueScore) { // If RED wins
            this.statusMessage.textContent = `Game Over! RED player wins with ${redScore} points!`; // Display RED win message
            winner = PLAYERS.RED;
            redPlayerContainer.classList.add('winner');
        } else if (blueScore > redScore) { // If BLUE wins
            this.statusMessage.textContent = `Game Over! BLUE player wins with ${blueScore} points!`; // Display BLUE win message
            winner = PLAYERS.BLUE;
            bluePlayerContainer.classList.add('winner');
        } else { // If tie
            this.statusMessage.textContent = `Game Over! It's a tie with ${redScore} points each!`; // Diplay tie message
            winner = 'tie';
            redPlayerContainer.classList.add('tie');
            bluePlayerContainer.classList.add('tie');
        }
        
        // Update score displays with final scores
        this.redScoreElement.textContent = redScore;
        this.blueScoreElement.textContent = blueScore;
        
        // Add a "Final Score" label to each player container
        const redFinalScoreLabel = document.createElement('div');
        redFinalScoreLabel.className = 'final-score-label';
        redFinalScoreLabel.textContent = 'FINAL SCORE';
        
        const blueFinalScoreLabel = document.createElement('div');
        blueFinalScoreLabel.className = 'final-score-label';
        blueFinalScoreLabel.textContent = 'FINAL SCORE';
        
        // Add the labels to the layer containers
        redPlayerContainer.appendChild(redFinalScoreLabel);
        bluePlayerContainer.appendChild(blueFinalScoreLabel);
        
        // Play win sound if in hacker mode
        if (this.hackerMode) {
            this.hackerMode.handleGameEnd(winner);
        }
        
        this.isPaused = true; // Pause the game
    }
}