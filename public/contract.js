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
        const boardData = await chessContract.methods.get_board().call();
        console.log('Board data received:', boardData.length, 'squares');
        return boardData;
    } catch (error) {
        console.error("Error getting board state:", error);
        return null;
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
        await chessContract.methods.make_move({
            from_square: fromSquare,
            to_square: toSquare,
            promotion: promotion
        }).send({
            from: userAddress,
            gas: 200000
        });
        
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
        await chessContract.methods.reset_game().send({
            from: userAddress,
            gas: 300000
        });
        
        console.log('Game reset successfully');
        return true;
    } catch (error) {
        console.error("Error resetting game:", error);
        return false;
    }
}

/**
 * Add a player to a team (admin only)
 * Removes the player from the other team first.
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
        const otherTeam = team === TEAM.WHITE ? TEAM.BLACK : TEAM.WHITE;
        const isOnOtherTeam = await chessContract.methods.is_player_on_team(playerAddress, otherTeam).call();
        const isOnSameTeam = await chessContract.methods.is_player_on_team(playerAddress, team).call();
        
        console.log('Player status - On target team:', isOnSameTeam, 'On other team:', isOnOtherTeam);
        
        // If already on the same team, we're done
        if (isOnSameTeam) {
            console.log('Player is already on this team');
            return true;
        }
        
        // Add player to the selected team
        console.log('Adding player to team:', team);
        await chessContract.methods.add_player(playerAddress, team).send({
            from: userAddress,
            gas: 200000
        });
        
        return true;
    } catch (error) {
        console.error("Error adding player:", error);
        return false;
    }
}

// Setup MetaMask event listeners
if (window.ethereum) {
    window.ethereum.on('accountsChanged', () => {
        console.log('MetaMask account changed, reloading...');
        window.location.reload();
    });
    
    window.ethereum.on('chainChanged', () => {
        console.log('MetaMask chain changed, reloading...');
        window.location.reload();
    });
}