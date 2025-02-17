const { RULESETS } = require('./rules.js');

const COLORS = {
  BLACK: 'black',
  WHITE: 'white',
};

class Board {
  constructor(size = 19, ruleset = 'chinese') {
    this.size = size;
    this.ruleset = RULESETS[ruleset];
    this.grid = Array(size).fill().map(() => Array(size).fill(null));
    this.moves = [];
    this.captures = { black: 0, white: 0 };
    this.ko = null;
    this.teams = {
      black: new Set(),
      white: new Set(),
    };
    this.lastMoveBy = null; // Track who made the last move for editing
  }

  // Get adjacent points
  getAdjacent(x, y) {
    const adjacent = [];
    if (x > 0) adjacent.push([x - 1, y]);
    if (x < this.size - 1) adjacent.push([x + 1, y]);
    if (y > 0) adjacent.push([x, y - 1]);
    if (y < this.size - 1) adjacent.push([x, y + 1]);
    return adjacent;
  }

  // Get the liberties of a group
  getLiberties(x, y, visited = new Set()) {
    const color = this.grid[y][x];
    if (!color) return new Set();
    
    const key = `${x},${y}`;
    if (visited.has(key)) return new Set();
    visited.add(key);

    const liberties = new Set();
    const group = new Set([key]);
    
    const checkPoint = (px, py) => {
      const pointKey = `${px},${py}`;
      const point = this.grid[py][px];
      
      if (!point) {
        liberties.add(pointKey);
      } else if (point === color && !visited.has(pointKey)) {
        visited.add(pointKey);
        group.add(pointKey);
        this.getAdjacent(px, py).forEach(([ax, ay]) => checkPoint(ax, ay));
      }
    };

    this.getAdjacent(x, y).forEach(([ax, ay]) => checkPoint(ax, ay));
    return liberties;
  }

  // Check if a move is valid
  isValidMove(x, y, color, playerId) {
    // Basic checks
    if (x < 0 || x >= this.size || y < 0 || y >= this.size) return false;
    if (this.grid[y][x] !== null) return false;
    if (this.ko && this.ko[0] === x && this.ko[1] === y) return false;

    // Team validation
    if (!this.teams[color].has(playerId)) return false;

    // Simulate the move to check for suicide and captures
    const tempBoard = this.clone();
    tempBoard.grid[y][x] = color;
    
    // Check if the move captures any opponent stones
    let capturedAny = false;
    const opponent = color === COLORS.BLACK ? COLORS.WHITE : COLORS.BLACK;
    
    for (const [ax, ay] of this.getAdjacent(x, y)) {
      if (tempBoard.grid[ay][ax] === opponent) {
        const liberties = tempBoard.getLiberties(ax, ay);
        if (liberties.size === 0) {
          capturedAny = true;
          break;
        }
      }
    }

    // If the move captures stones, it's valid
    if (capturedAny) return true;

    // Check if the move is suicide
    const liberties = tempBoard.getLiberties(x, y);
    return liberties.size > 0;
  }

  // Make a move
  makeMove(x, y, color, playerId) {
    if (!this.isValidMove(x, y, color, playerId)) return false;

    this.grid[y][x] = color;
    this.lastMoveBy = playerId;
    this.moves.push({ x, y, color, playerId });

    // Capture opponent stones
    const opponent = color === COLORS.BLACK ? COLORS.WHITE : COLORS.BLACK;
    let captured = [];

    for (const [ax, ay] of this.getAdjacent(x, y)) {
      if (this.grid[ay][ax] === opponent) {
        const liberties = this.getLiberties(ax, ay);
        if (liberties.size === 0) {
          // Remove captured stones
          const group = this.getGroup(ax, ay);
          group.forEach(pos => {
            const [px, py] = pos.split(',').map(Number);
            this.grid[py][px] = null;
            captured.push([px, py]);
          });
          this.captures[color] += group.size;
        }
      }
    }

    // Update ko point if exactly one stone was captured
    this.ko = captured.length === 1 ? captured[0] : null;

    return true;
  }

  // Get all stones in a group
  getGroup(x, y, visited = new Set()) {
    const color = this.grid[y][x];
    if (!color) return new Set();

    const key = `${x},${y}`;
    if (visited.has(key)) return visited;
    visited.add(key);

    for (const [ax, ay] of this.getAdjacent(x, y)) {
      if (this.grid[ay][ax] === color) {
        this.getGroup(ax, ay, visited);
      }
    }

    return visited;
  }

  // Add a player to a team
  addToTeam(color, playerId) {
    this.teams[color].add(playerId);
  }

  // Remove a player from a team
  removeFromTeam(color, playerId) {
    this.teams[color].delete(playerId);
  }

  // Clone the board (useful for move validation)
  clone() {
    const newBoard = new Board(this.size, this.ruleset);
    newBoard.grid = this.grid.map(row => [...row]);
    newBoard.moves = [...this.moves];
    newBoard.captures = { ...this.captures };
    newBoard.ko = this.ko;
    newBoard.teams = {
      black: new Set(this.teams.black),
      white: new Set(this.teams.white),
    };
    newBoard.lastMoveBy = this.lastMoveBy;
    return newBoard;
  }

  // Edit the last move (only if made by the same player)
  editLastMove(x, y, playerId) {
    if (this.moves.length === 0 || this.lastMoveBy !== playerId) return false;
    
    // Restore board to previous state
    const lastMove = this.moves.pop();
    this.grid = Array(this.size).fill().map(() => Array(this.size).fill(null));
    this.captures = { black: 0, white: 0 };
    
    // Replay moves except the last one
    for (const move of this.moves) {
      this.makeMove(move.x, move.y, move.color, move.playerId);
    }
    
    // Make the new move
    return this.makeMove(x, y, lastMove.color, playerId);
  }

  // Calculate territory and score
  calculateScore() {
    return this.ruleset.calculateScore(this);
  }
}

module.exports = {
  Board,
  COLORS
};
