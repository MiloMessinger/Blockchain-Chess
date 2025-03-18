# @version 0.3.9

# Interface
struct Move:
    from_square: uint8
    to_square: uint8
    promotion: uint8  # 0 = none, 1 = queen, 2 = rook, 3 = bishop, 4 = knight

struct GameState:
    board: bytes[64]  # 0 = empty, 1-6 = white pieces, 7-12 = black pieces
                     # 1/7 = pawn, 2/8 = knight, 3/9 = bishop, 4/10 = rook, 5/11 = queen, 6/12 = king
    active_color: uint8  # 0 = white, 1 = black
    castling_rights: uint8  # bitfield: 0001 = white kingside, 0010 = white queenside, 0100 = black kingside, 1000 = black queenside
    en_passant_target: uint8  # 0-63 square, 64 if none
    halfmove_clock: uint8  # incremented after each move, reset after captures or pawn moves
    fullmove_number: uint16  # incremented after black's move

# Events
event PlayerAdded:
    player: address
    team: uint8  # 0 = white, 1 = black

event MoveMade:
    player: address
    from_square: uint8
    to_square: uint8
    promotion: uint8

event GameReset:
    owner: address

event GameStateChanged:
    owner: address
    new_state: GameState

# State variables
owner: public(address)
white_team: public(HashMap[address, bool])
black_team: public(HashMap[address, bool])
game_state: public(GameState)
game_over: public(bool)
winner: public(uint8)  # 0 = white, 1 = black, 2 = draw, 3 = in progress

# Constants
WHITE: constant(uint8) = 0
BLACK: constant(uint8) = 1
DRAW: constant(uint8) = 2
IN_PROGRESS: constant(uint8) = 3

@external
def __init__():
    """
    Initialize the contract
    """
    self.owner = msg.sender
    self.reset_game()

@external
def add_player(player: address, team: uint8):
    """
    Add a player to either white or black team
    
    @param player The address of the player to add
    @param team The team to add the player to (0 = white, 1 = black)
    """
    assert msg.sender == self.owner, "Only the owner can add players"
    assert team == WHITE or team == BLACK, "Invalid team"
    
    if team == WHITE:
        self.white_team[player] = True
    else:
        self.black_team[player] = True
    
    log PlayerAdded(player, team)

@external
def make_move(move: Move):
    """
    Make a move on the chess board
    
    @param move The move to make
    """
    # Check if game is still in progress
    assert not self.game_over, "Game is over"
    
    # Check if player is on the correct team
    if self.game_state.active_color == WHITE:
        assert self.white_team[msg.sender], "Not on white team"
    else:
        assert self.black_team[msg.sender], "Not on black team"
    
    # Validate the move (simplified for now - we'll implement proper validation later)
    assert self._is_valid_move(move), "Invalid move"
    
    # Update the game state
    self._update_game_state(move)
    
    # Check for game end conditions
    self._check_game_end()
    
    # Log the move
    log MoveMade(msg.sender, move.from_square, move.to_square, move.promotion)

@internal
def _is_valid_move(move: Move) -> bool:
    """
    Check if a move is valid
    
    @param move The move to check
    @return Whether the move is valid
    """
    # This is a simplified validation
    # In a real implementation, we would need to check:
    # - If the piece exists and belongs to the active player
    # - If the move follows the rules for that piece
    # - If the move doesn't leave the king in check
    # - Special rules like castling, en passant, etc.
    
    # For now, we'll just do basic validation
    from_square: uint8 = move.from_square
    to_square: uint8 = move.to_square
    
    # Check that squares are in bounds
    assert from_square < 64 and to_square < 64, "Square out of bounds"
    
    # Check that there's a piece on the from_square
    piece: uint8 = uint8(convert(slice(self.game_state.board, from_square, 1), uint8))
    assert piece != 0, "No piece at from_square"
    
    # Check that the piece belongs to the active player
    if self.game_state.active_color == WHITE:
        assert piece >= 1 and piece <= 6, "Not your piece"
    else:
        assert piece >= 7 and piece <= 12, "Not your piece"
    
    # For a complete implementation, we would need more validation here
    # But for simplicity, we'll leave it to the front-end to validate moves
    
    return True

@internal
def _update_game_state(move: Move):
    """
    Update the game state based on a move
    
    @param move The move to apply
    """
    from_square: uint8 = move.from_square
    to_square: uint8 = move.to_square
    promotion: uint8 = move.promotion
    
    # Get the piece being moved
    piece: uint8 = uint8(convert(slice(self.game_state.board, from_square, 1), uint8))
    
    # Check if this is a capture (there's a piece on the to_square)
    capture: bool = uint8(convert(slice(self.game_state.board, to_square, 1), uint8)) != 0
    
    # Update board - remove piece from from_square
    self.game_state.board = concat(
        slice(self.game_state.board, 0, from_square),
        b"\x00",
        slice(self.game_state.board, from_square + 1, 64 - from_square - 1)
    )
    
    # Update board - add piece to to_square, handling promotion if needed
    if promotion != 0 and ((piece == 1) or (piece == 7)):  # If pawn and promotion requested
        if piece == 1:  # White pawn
            if promotion == 1:
                piece = 5  # Queen
            elif promotion == 2:
                piece = 4  # Rook
            elif promotion == 3:
                piece = 3  # Bishop
            elif promotion == 4:
                piece = 2  # Knight
        else:  # Black pawn
            if promotion == 1:
                piece = 11  # Queen
            elif promotion == 2:
                piece = 10  # Rook
            elif promotion == 3:
                piece = 9  # Bishop
            elif promotion == 4:
                piece = 8  # Knight
    
    self.game_state.board = concat(
        slice(self.game_state.board, 0, to_square),
        concat(convert(piece, bytes1), b""),
        slice(self.game_state.board, to_square + 1, 64 - to_square - 1)
    )
    
    # Update en passant target
    # This is simplified - in a real implementation we would check for pawn double moves
    self.game_state.en_passant_target = 64  # Reset en passant target
    
    # Update halfmove clock
    if piece == 1 or piece == 7 or capture:  # Pawn move or capture
        self.game_state.halfmove_clock = 0
    else:
        self.game_state.halfmove_clock += 1
    
    # Update fullmove number
    if self.game_state.active_color == BLACK:
        self.game_state.fullmove_number += 1
    
    # Switch active color
    self.game_state.active_color = 1 - self.game_state.active_color

@internal
def _check_game_end():
    """
    Check if the game has ended
    """
    # This is a simplified check
    # In a real implementation, we would check for:
    # - Checkmate
    # - Stalemate
    # - Draw by insufficient material
    # - Draw by repetition
    # - Draw by 50-move rule
    
    # For now, we'll just check for kings
    white_king_exists: bool = False
    black_king_exists: bool = False
    
    for i in range(64):
        piece: uint8 = uint8(convert(slice(self.game_state.board, i, 1), uint8))
        if piece == 6:  # White king
            white_king_exists = True
        elif piece == 12:  # Black king
            black_king_exists = True
    
    if not white_king_exists:
        self.game_over = True
        self.winner = BLACK
    elif not black_king_exists:
        self.game_over = True
        self.winner = WHITE
    elif self.game_state.halfmove_clock >= 100:  # 50-move rule (100 half-moves)
        self.game_over = True
        self.winner = DRAW

@external
def reset_game():
    """
    Reset the game to the starting position
    """
    assert msg.sender == self.owner, "Only the owner can reset the game"
    
    # Set up the initial board
    # The standard chess starting position
    # 0-7: a1-h1, 8-15: a2-h2, ..., 56-63: a8-h8
    initial_board: bytes[64] = b"\x04\x02\x03\x05\x06\x03\x02\x04\x01\x01\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x07\x07\x07\x07\x07\x07\x07\x07\x0a\x08\x09\x0b\x0c\x09\x08\x0a"
    
    self.game_state = GameState({
        board: initial_board,
        active_color: WHITE,
        castling_rights: 15,  # All castling rights available
        en_passant_target: 64,  # No en passant target
        halfmove_clock: 0,
        fullmove_number: 1
    })
    
    self.game_over = False
    self.winner = IN_PROGRESS
    
    log GameReset(msg.sender)

@external
def set_game_state(new_state: GameState):
    """
    Set the game state directly (for debugging or special cases)
    
    @param new_state The new game state
    """
    assert msg.sender == self.owner, "Only the owner can set the game state"
    
    self.game_state = new_state
    self.game_over = False
    self.winner = IN_PROGRESS
    
    log GameStateChanged(msg.sender, new_state)

@external
@view
def get_game_state() -> (bytes[64], uint8, uint8, uint8, uint8, uint16, bool, uint8):
    """
    Get the current game state
    
    @return board, active_color, castling_rights, en_passant_target, halfmove_clock, fullmove_number, game_over, winner
    """
    return (
        self.game_state.board,
        self.game_state.active_color,
        self.game_state.castling_rights,
        self.game_state.en_passant_target,
        self.game_state.halfmove_clock,
        self.game_state.fullmove_number,
        self.game_over,
        self.winner
    )

@external
@view
def is_player_on_team(player: address, team: uint8) -> bool:
    """
    Check if a player is on a specific team
    
    @param player The address of the player to check
    @param team The team to check (0 = white, 1 = black)
    @return Whether the player is on the team
    """
    if team == WHITE:
        return self.white_team[player]
    else:
        return self.black_team[player]
