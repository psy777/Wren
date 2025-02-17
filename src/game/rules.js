class BaseRuleset {
  calculateTerritory(board) {
    const territory = {
      black: new Set(),
      white: new Set(),
      neutral: new Set()
    };

    const visited = new Set();

    for (let y = 0; y < board.size; y++) {
      for (let x = 0; x < board.size; x++) {
        if (board.grid[y][x] !== null || visited.has(`${x},${y}`)) continue;

        const region = new Set();
        const borders = new Set();
        
        // Flood fill to find territory
        const queue = [[x, y]];
        while (queue.length > 0) {
          const [cx, cy] = queue.shift();
          const key = `${cx},${cy}`;
          
          if (visited.has(key)) continue;
          visited.add(key);
          region.add(key);

          for (const [ax, ay] of board.getAdjacent(cx, cy)) {
            const stone = board.grid[ay][ax];
            if (stone === null) {
              queue.push([ax, ay]);
            } else {
              borders.add(stone);
            }
          }
        }

        // Determine territory owner
        if (borders.size === 1) {
          const owner = borders.values().next().value;
          territory[owner].add(...region);
        } else {
          territory.neutral.add(...region);
        }
      }
    }

    return territory;
  }

  countStones(board) {
    const stones = {
      black: 0,
      white: 0
    };

    for (let y = 0; y < board.size; y++) {
      for (let x = 0; x < board.size; x++) {
        const stone = board.grid[y][x];
        if (stone) stones[stone]++;
      }
    }

    return stones;
  }
}

class ChineseRuleset extends BaseRuleset {
  calculateScore(board) {
    const territory = this.calculateTerritory(board);
    const stones = this.countStones(board);

    return {
      black: stones.black + territory.black.size,
      white: stones.white + territory.white.size + 7.5, // komi
      territory,
      stones
    };
  }
}

class JapaneseRuleset extends BaseRuleset {
  calculateScore(board) {
    const territory = this.calculateTerritory(board);
    
    return {
      black: territory.black.size + board.captures.black,
      white: territory.white.size + board.captures.white + 6.5, // komi
      territory,
      captures: board.captures
    };
  }
}

class AGARuleset extends BaseRuleset {
  calculateScore(board) {
    const territory = this.calculateTerritory(board);
    const stones = this.countStones(board);

    // AGA rules use area counting (like Chinese) but with 7.5 komi
    // and counts captures (unlike Chinese)
    return {
      black: stones.black + territory.black.size + board.captures.black,
      white: stones.white + territory.white.size + board.captures.white + 7.5,
      territory,
      stones,
      captures: board.captures
    };
  }
}

const RULESETS = {
  chinese: new ChineseRuleset(),
  japanese: new JapaneseRuleset(),
  aga: new AGARuleset()
};

module.exports = {
  RULESETS,
  BaseRuleset,
  ChineseRuleset,
  JapaneseRuleset,
  AGARuleset
};
