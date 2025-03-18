// Chess UI handling module

let board; // Chessboard.js instance
let game = new Chess(); // Chess.js game instance
let userTeam = null; // User's team (0 = white, 1 = black, null = spectator)

// DOM elements
const currentTurnElement = document.getElementById('currentTurn');
const userTeamElement = document.getElementById('userTeam');
const gameStatusElement = document.getElementById('gameStatus');
const moveStatusElement = document.getElementById('moveStatus');

/**
 * Initialize the chess board
 */
function initializeChessBoard() {
    const config = {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    };
    
    board = Chessboard('board', config);
    window.addEventListener('resize', board.resize);
}   

/**
 * Update the chess board from blockchain data
 * @param {Array<number>} boardData - Array of pieces (0-12)
 */
function updateChessBoard(boardData) {
    // Reset the chess.js game
    game = new Chess();
    game.clear();
    
    // Convert the board data to a position object
    const pieces = {
        1: 'wP', 2: 'wN', 3: 'wB', 4: 'wR', 5: 'wQ', 6: 'wK', // White pieces
        7: 'bP', 8: 'bN', 9: 'bB', 10: 'bR', 11: 'bQ', 12: 'bK' // Black pieces
    };
    
    let position = {};
    
    for (let i = 0; i < boardData.length; i++) {
        const piece = parseInt(boardData[i]);
        if (piece !== 0) {
            // Convert from 0-63 to chess notation (a1-h8)
            const file = String.fromCharCode('a'.charCodeAt(0) + (i % 8));
            const rank = Math.floor(i / 8) + 1;
            const square = file + rank;
            
            position[square] = pieces[piece];
        }
    }
    
    // Update the board
    board.position(position, false); // false = don't animate
}

/**
 * Update the game UI based on the current state
 * @param {Object} gameState - Game state from the blockchain
 */
function updateGameUI(gameState) {
    // Update turn indicator
    if (gameState.activeColor === TEAM.WHITE) {
        currentTurnElement.textContent = 'White';
    } else {
        currentTurnElement.textContent = 'Black';
    }
    
    // Update game status
    if (gameState.gameOver) {
        let winMessage = "";
        if (gameState.winner === GAME_STATUS.WHITE_WINS) {
            winMessage = 'Game Over - White Wins!';
        } else if (gameState.winner === GAME_STATUS.BLACK_WINS) {
            winMessage = 'Game Over - Black Wins!';
        } else if (gameState.winner === GAME_STATUS.DRAW) {
            winMessage = 'Game Over - Draw!';
        }
        
        gameStatusElement.textContent = winMessage;
        
        // Display a prominent win message
        if (winMessage !== "") {
            showWinMessage(winMessage);
        }
    } else {
        gameStatusElement.textContent = 'In Progress';
    }
    
    // Update user team display
    if (userTeam === TEAM.WHITE) {
        userTeamElement.textContent = 'White';
    } else if (userTeam === TEAM.BLACK) {
        userTeamElement.textContent = 'Black';
    } else {
        userTeamElement.textContent = 'None (Spectator)';
    }
}

/**
 * Show a prominent win message
 * @param {string} message - The win message to display
 */
function showWinMessage(message) {
    // Check if we already have a win message displayed
    let winMessageElement = document.getElementById('winMessage');
    
    if (!winMessageElement) {
        // Create a new win message element
        winMessageElement = document.createElement('div');
        winMessageElement.id = 'winMessage';
        winMessageElement.style.position = 'fixed';
        winMessageElement.style.top = '50%';
        winMessageElement.style.left = '50%';
        winMessageElement.style.transform = 'translate(-50%, -50%)';
        winMessageElement.style.backgroundColor = '#4CAF50';
        winMessageElement.style.color = 'white';
        winMessageElement.style.padding = '20px';
        winMessageElement.style.borderRadius = '10px';
        winMessageElement.style.zIndex = '1000';
        winMessageElement.style.fontSize = '24px';
        winMessageElement.style.fontWeight = 'bold';
        winMessageElement.style.textAlign = 'center';
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.style.marginTop = '10px';
        closeButton.style.padding = '5px 10px';
        closeButton.style.backgroundColor = 'white';
        closeButton.style.color = '#4CAF50';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '5px';
        closeButton.style.cursor = 'pointer';
        
        closeButton.addEventListener('click', () => {
            document.body.removeChild(winMessageElement);
        });
        
        winMessageElement.textContent = message;
        winMessageElement.appendChild(document.createElement('br'));
        winMessageElement.appendChild(closeButton);
        
        document.body.appendChild(winMessageElement);
    } else {
        // Update existing win message
        winMessageElement.textContent = message;
    }
}

/**
 * Validate start position of dragged piece
 * @param {string} source - Source square in algebraic notation (e.g., 'e2')
 * @param {string} piece - Piece notation (e.g., 'wP' for white pawn)
 * @param {Object} position - Current board position
 * @param {string} orientation - Board orientation ('white' or 'black')
 * @returns {boolean} True if the move is allowed to start
 */
function onDragStart(source, piece, position, orientation) {
    // Log for debugging
    console.log('Drag start:', source, piece);
    
    // Do not allow moves if game is over
    if (gameStatusElement.textContent.includes('Game Over')) {
        moveStatusElement.textContent = "Game is over. No more moves allowed.";
        return false;
    }
    
    // Check if it's user's turn based on the blockchain state
    const currentColorTurn = currentTurnElement.textContent === 'White' ? TEAM.WHITE : TEAM.BLACK;
    if (userTeam !== currentColorTurn) {
        moveStatusElement.textContent = "It's not your team's turn.";
        return false;
    }
    
    // Check if the piece belongs to the user's team
    if ((userTeam === TEAM.WHITE && piece.search(/^b/) !== -1) ||
        (userTeam === TEAM.BLACK && piece.search(/^w/) !== -1)) {
        moveStatusElement.textContent = "You can only move your team's pieces.";
        return false;
    }
    
    return true;
}

/**
 * Handle piece drop
 * @param {string} source - Source square in algebraic notation
 * @param {string} target - Target square in algebraic notation
 * @param {string} piece - Piece notation
 * @param {Object} newPos - New board position
 * @param {Object} oldPos - Old board position
 * @param {string} orientation - Board orientation
 * @returns {string|boolean} 'snapback' to cancel the move, true to accept
 */
function onDrop(source, target, piece, newPos, oldPos, orientation) {
    // Log for debugging
    console.log('Drop:', source, target, piece);
    
    // If the move is invalid according to chess.js, return 'snapback'
    let move = game.move({
        from: source,
        to: target,
        promotion: 'q' // Always promote to a queen for simplicity
    });
    
    if (move === null) {
        moveStatusElement.textContent = "Invalid move according to chess rules.";
        return 'snapback';
    }
    
    // Convert chess notation to 0-63 index
    const fromSquare = squareToIndex(source);
    const toSquare = squareToIndex(target);
    
    // Check for promotion
    let promotion = 0;
    const isPawnMovingToLastRank = 
        (piece === 'wP' && target[1] === '8') || 
        (piece === 'bP' && target[1] === '1');
    
    if (isPawnMovingToLastRank) {
        // Default promotion to queen for simplicity
        promotion = 1; // 1 = queen
    }
    
    // Submit move to the blockchain
    submitMove(fromSquare, toSquare, promotion);
    
    return true;
}

/**
 * Update the board when the move is complete
 */
function onSnapEnd() {
    // Update the board position after the piece snap
    board.position(game.fen());
}

/**
 * Convert chess notation (a1-h8) to index (0-63)
 * @param {string} square - Chess notation square
 * @returns {number} Board index (0-63)
 */
function squareToIndex(square) {
    const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = parseInt(square[1]) - 1;
    return rank * 8 + file;
}

/**
 * Submit a move to the blockchain
 * @param {number} fromSquare - Source square (0-63)
 * @param {number} toSquare - Target square (0-63)
 * @param {number} promotion - Promotion piece (0-4)
 */
async function submitMove(fromSquare, toSquare, promotion) {
    moveStatusElement.textContent = 'Submitting move to the blockchain...';
    
    try {
        console.log('Submitting move:', fromSquare, toSquare, promotion);
        const success = await makeMove(fromSquare, toSquare, promotion);
        
        if (success) {
            moveStatusElement.textContent = 'Move submitted successfully!';
            // Update the game state after the move
            await updateGameState();
        } else {
            moveStatusElement.textContent = 'Error making move. Please try again.';
            // Reset the board to the state from the blockchain
            await updateGameState();
        }
    } catch (error) {
        console.error('Error submitting move:', error);
        moveStatusElement.textContent = 'Error: ' + error.message;
        // Reset the board to the state from the blockchain
        await updateGameState();
    }
}

/**
 * Refresh the game state from the blockchain
 */
async function updateGameState() {
    try {
        const boardData = await getBoardState();
        const gameState = await getGameState();
        
        if (boardData && gameState) {
            updateChessBoard(boardData);
            updateGameUI(gameState);
        } else {
            gameStatusElement.textContent = 'Error fetching game state';
        }
    } catch (error) {
        console.error('Error updating game state:', error);
        gameStatusElement.textContent = 'Error fetching game state';
    }
}