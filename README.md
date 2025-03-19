# Blockchain Chess Game

Online Chess, but with moves and game positions verified by blockchain contracts to ensure no one has cheated with the game.


## Files and Functions

### Smart Contract (chess.vy)

Deployed smart contract that holds team lists, manages the current board position, and accepts new moves from either team.

### Web Interface

#### index.html
Main HTML file for the web page structure, is what is accessed when users initally access site.

#### styles.css
CSS styling for the chess board and UI elements.

#### config.js
Contains Firebase settings and the contract address/ABI for project.

#### contract.js
Handles interactions with the blockchain, and processes transactions.

#### chess-ui.js
Manages the chess board UI and move validation. Also works to record moves for the smart contract.

#### app.js
Handles login and initialization.

## Game Features

- Decentralized gameplay where all moves are securely recorded as blockchain transactions
- Trustless validation of chess rules through smart contract verification
- Team-based authorization ensuring only the right addresses can make moves at the right time
- Persistent game state that exists independently of the frontend