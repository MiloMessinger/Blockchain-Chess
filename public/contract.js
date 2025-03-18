// Contract interaction module

let web3;
let chessContract;
let userAddress;
let isOwner = false;

/**
 * Initialize Web3 and the contract
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function initializeWeb3() {
    try {
        // Check if MetaMask is installed
        if (!window.ethereum) {
            showLoginError("MetaMask is not installed. Please install it to use this application.");
            return false;
        }
        
        web3 = new Web3(window.ethereum);
        
        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        userAddress = accounts[0];
        console.log('Connected with address:', userAddress);
        
        // Initialize contract
        chessContract = new web3.eth.Contract(contractConfig.abi, contractConfig.address);
        console.log('Contract initialized at address:', contractConfig.address);
        
        // Check if user is owner
        const owner = await chessContract.methods.owner().call();
        isOwner = owner.toLowerCase() === userAddress.toLowerCase();
        console.log('Is owner:', isOwner);
        
        return true;
    } catch (error) {
        console.error("Error initializing Web3:", error);
        showLoginError("Error connecting to MetaMask: " + error.message);
        return false;
    }
}

/**
 * Show login error message
 * @param {string} message - Error message to display
 */
function showLoginError(message) {
    document.getElementById('loginStatus').textContent = message;
}

/**
 * Check which team the user is on
 * @returns {Promise<number|null>} 0 for white, 1 for black, null if not on a team
 */
async function checkUserTeam() {
    try {
        const isWhite = await chessContract.methods.is_player_on_team(userAddress, TEAM.WHITE).call();
        const isBlack = await chessContract.methods.is_player_on_team(userAddress, TEAM.BLACK).call();
        
        console.log('Team check - White:', isWhite, 'Black:', isBlack);
        
        if (isWhite) {
            return TEAM.WHITE;
        } else if (isBlack) {
            return TEAM.BLACK;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error checking user team:", error);
        return null;
    }
}

/**
 * Get the current board state from the blockchain
 * @returns {Promise<Array<number>|null>} Array of pieces (0-12) or null on error
 */
async function getBoardState() {
    try {
        // Using get_board to get all squares at once
        const boardData = await chessContract.methods.get_board().call();
        console.log('Board data received:', boardData);
        
        // Ensure we have numerical values in the array
        const numericBoardData = boardData.map(value => parseInt(value));
        console.log('Numeric board data:', numericBoardData);
        
        return numericBoardData;
    } catch (error) {
        console.error("Error getting board state:", error);
        
        // Fallback to getting individual pieces if get_board fails
        try {
            console.log("Trying alternative board loading method...");
            const boardData = [];
            
            // Get each square individually
            for (let i = 0; i < 64; i++) {
                const piece = await chessContract.methods.get_piece(i).call();
                boardData.push(parseInt(piece));
            }
            
            console.log('Individual board data loaded:', boardData);
            return boardData;
        } catch (fallbackError) {
            console.error("Fallback board loading also failed:", fallbackError);
            return null;
        }
    }
}

/**
 * Get the current game state from the blockchain
 * @returns {Promise<Object|null>} Game state object or null on error
 */
async function getGameState() {
    try {
        const state = await chessContract.methods.get_game_state().call();
        
        const gameState = {
            activeColor: parseInt(state[0]),
            castlingRights: parseInt(state[1]),
            enPassantTarget: parseInt(state[2]),
            halfmoveClock: parseInt(state[3]),
            fullmoveNumber: parseInt(state[4]),
            gameOver: state[5],
            winner: parseInt(state[6])
        };
        
        console.log('Game state received:', gameState);
        return gameState;
    } catch (error) {
        console.error("Error getting game state:", error);
        return null;
    }
}

/**
 * Make a move on the blockchain
 * @param {number} fromSquare - Source square (0-63)
 * @param {number} toSquare - Target square (0-63)
 * @param {number} promotion - Promotion piece (0-4)
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function makeMove(fromSquare, toSquare, promotion) {
    try {
        console.log('Making move:', fromSquare, toSquare, promotion);
        
        // Get current gas price and estimate gas needed for this transaction
        const gasPrice = await web3.eth.getGasPrice();
        console.log('Current gas price:', gasPrice);
        
        // Significantly increase gas limit - chess moves can be complex operations
        const gasLimit = 500000; // Increased from 200000
        console.log('Using gas limit:', gasLimit);
        
        await chessContract.methods.make_move({
            from_square: fromSquare,
            to_square: toSquare,
            promotion: promotion
        }).send({
            from: userAddress,
            gas: gasLimit,
            gasPrice: gasPrice
        });
        
        console.log('Move completed successfully');
        return true;
    } catch (error) {
        console.error("Error making move:", error);
        return false;
    }
}

/**
 * Reset the game (admin only)
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function resetGame() {
    if (!isOwner) {
        console.error("Only the owner can reset the game");
        return false;
    }
    
    try {
        console.log('Resetting game...');
        
        // Get current gas price
        const gasPrice = await web3.eth.getGasPrice();
        console.log('Using gas price for reset:', gasPrice);
        
        // Drastically increase gas limit for reset function due to reentrancy sentry
        const gasLimit = 1000000; // Much higher gas limit for reset
        console.log('Using gas limit for reset:', gasLimit);
        
        await chessContract.methods.reset_game().send({
            from: userAddress,
            gas: gasLimit, // Increased gas limit for reentrancy sentry
            gasPrice: gasPrice
        });
        
        console.log('Game reset successfully');
        return true;
    } catch (error) {
        console.error("Error resetting game:", error);
        alert("Reset game error: " + error.message);
        return false;
    }
}

/**
 * Add a player to a team (admin only)
 * @param {string} playerAddress - Ethereum address of the player
 * @param {number} team - Team to add the player to (0 = white, 1 = black)
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function addPlayerToTeam(playerAddress, team) {
    if (!isOwner) {
        console.error("Only the owner can add players");
        return false;
    }
    
    if (!web3.utils.isAddress(playerAddress)) {
        console.error("Invalid Ethereum address");
        return false;
    }
    
    try {
        // Check if player is already on a team
        const isOnSameTeam = await chessContract.methods.is_player_on_team(playerAddress, team).call();
        
        console.log('Player status - On target team:', isOnSameTeam);
        
        // If already on the same team, we're done
        if (isOnSameTeam) {
            console.log('Player is already on this team');
            return true;
        }
        
        // Get current gas price
        const gasPrice = await web3.eth.getGasPrice();
        
        // Add player to the selected team
        console.log('Adding player to team:', team);
        await chessContract.methods.add_player(playerAddress, team).send({
            from: userAddress,
            gas: 300000, // Increased gas limit
            gasPrice: gasPrice
        });
        
        return true;
    } catch (error) {
        console.error("Error adding player:", error);
        return false;
    }
}

// Setup MetaMask event listeners
if (window.ethereum) {
    window.addEventListener('load', function() {
        console.log('Page loaded, checking for existing Web3 connection');
        if (web3 && web3.eth) {
            console.log('Web3 already initialized on page load');
        }
    });
    
    window.ethereum.on('accountsChanged', () => {
        console.log('MetaMask account changed, reloading...');
        window.location.reload();
    });
    
    window.ethereum.on('chainChanged', () => {
        console.log('MetaMask chain changed, reloading...');
        window.location.reload();
    });
}