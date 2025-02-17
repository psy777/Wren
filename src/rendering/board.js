const { createCanvas } = require('@napi-rs/canvas');
const { COLORS } = require('../game/board.js');

const STONE_COLORS = {
  [COLORS.BLACK]: '#000000',
  [COLORS.WHITE]: '#FFFFFF',
};

const BOARD_COLOR = '#DCB35C';
const LINE_COLOR = '#000000';
const STAR_POINT_COLOR = '#000000';

class BoardRenderer {
  constructor(size = 19) {
    this.size = size;
    this.cellSize = 40;
    this.margin = 30;
    this.stoneRadius = this.cellSize * 0.45;

    // Calculate canvas dimensions
    this.width = this.cellSize * (size - 1) + this.margin * 2;
    this.height = this.cellSize * (size - 1) + this.margin * 2;

    // Create canvas
    this.canvas = createCanvas(this.width, this.height);
    this.ctx = this.canvas.getContext('2d');

    // Star points for different board sizes
    this.starPoints = this.getStarPoints();
  }

  getStarPoints() {
    if (this.size === 19) {
      return [
        [3, 3], [9, 3], [15, 3],
        [3, 9], [9, 9], [15, 9],
        [3, 15], [9, 15], [15, 15]
      ];
    } else if (this.size === 13) {
      return [
        [3, 3], [9, 3],
        [6, 6],
        [3, 9], [9, 9]
      ];
    } else if (this.size === 9) {
      return [
        [2, 2], [6, 2],
        [4, 4],
        [2, 6], [6, 6]
      ];
    }
    return [];
  }

  // Convert board coordinates to pixel coordinates
  boardToPixel(x, y) {
    return [
      x * this.cellSize + this.margin,
      y * this.cellSize + this.margin
    ];
  }

  // Draw the empty board
  drawBoard() {
    // Fill background
    this.ctx.fillStyle = BOARD_COLOR;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw grid lines
    this.ctx.strokeStyle = LINE_COLOR;
    this.ctx.lineWidth = 1;

    // Vertical lines
    for (let i = 0; i < this.size; i++) {
      const [x, y] = this.boardToPixel(i, 0);
      this.ctx.beginPath();
      this.ctx.moveTo(x, this.margin);
      this.ctx.lineTo(x, this.height - this.margin);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let i = 0; i < this.size; i++) {
      const [x, y] = this.boardToPixel(0, i);
      this.ctx.beginPath();
      this.ctx.moveTo(this.margin, y);
      this.ctx.lineTo(this.width - this.margin, y);
      this.ctx.stroke();
    }

    // Draw star points
    this.ctx.fillStyle = STAR_POINT_COLOR;
    for (const [x, y] of this.starPoints) {
      const [px, py] = this.boardToPixel(x, y);
      this.ctx.beginPath();
      this.ctx.arc(px, py, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  // Draw a stone
  drawStone(x, y, color, isLastMove = false) {
    const [px, py] = this.boardToPixel(x, y);
    
    // Stone base
    this.ctx.fillStyle = STONE_COLORS[color];
    this.ctx.beginPath();
    this.ctx.arc(px, py, this.stoneRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // Add shading for 3D effect
    if (color === COLORS.WHITE) {
      this.ctx.strokeStyle = '#888888';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();

      // Add highlight
      const gradient = this.ctx.createRadialGradient(
        px - this.stoneRadius * 0.3,
        py - this.stoneRadius * 0.3,
        this.stoneRadius * 0.1,
        px,
        py,
        this.stoneRadius
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
    } else {
      // Subtle highlight for black stones
      const gradient = this.ctx.createRadialGradient(
        px - this.stoneRadius * 0.3,
        py - this.stoneRadius * 0.3,
        0,
        px,
        py,
        this.stoneRadius
      );
      gradient.addColorStop(0, 'rgba(128, 128, 128, 0.2)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
    }

    // Draw last move marker
    if (isLastMove) {
      this.ctx.fillStyle = color === COLORS.BLACK ? '#ff0000' : '#ff0000';
      this.ctx.beginPath();
      this.ctx.arc(px, py, this.stoneRadius * 0.3, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  // Render the complete board state
  render(board) {
    this.drawBoard();

    // Draw all stones
    for (let y = 0; y < board.size; y++) {
      for (let x = 0; x < board.size; x++) {
        const stone = board.grid[y][x];
        if (stone) {
          const isLastMove = board.moves.length > 0 && 
            board.moves[board.moves.length - 1].x === x && 
            board.moves[board.moves.length - 1].y === y;
          this.drawStone(x, y, stone, isLastMove);
        }
      }
    }

    return this.canvas.toBuffer('image/png');
  }
}

module.exports = {
  BoardRenderer
};
