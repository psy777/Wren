const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

class KataGo {
  constructor(enginePath = 'katago', configPath = 'default_gtp.cfg') {
    this.enginePath = enginePath;
    this.configPath = configPath;
    this.process = null;
    this.analysisEndpoint = process.env.KATAGO_ANALYSIS_ENDPOINT;
  }

  // Convert board state to GTP format
  boardToGTP(board) {
    const moves = board.moves.map(move => 
      `${move.color.charAt(0).toUpperCase()}[${String.fromCharCode(97 + move.x)}${String.fromCharCode(97 + move.y)}]`
    ).join(';');
    
    return moves;
  }

  // Get move suggestion using KataGo Analysis Engine
  async getMove(board, settings = { maxVisits: 1000, playoutDoublingAdvantage: 0.0 }) {
    if (!this.analysisEndpoint) {
      throw new Error('KataGo Analysis Engine endpoint not configured');
    }

    const query = {
      id: "1",
      moves: this.boardToGTP(board),
      rules: board.ruleset.constructor.name.toLowerCase().replace('ruleset', ''),
      boardXSize: board.size,
      boardYSize: board.size,
      komi: board.ruleset.constructor.name === 'JapaneseRuleset' ? 6.5 : 7.5,
      analyzeTurns: [board.moves.length],
      maxVisits: settings.maxVisits,
      playoutDoublingAdvantage: settings.playoutDoublingAdvantage
    };

    try {
      const response = await fetch(this.analysisEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(query),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const moveInfo = data.moveInfos[0];
      
      return {
        x: moveInfo.move.charAt(0).charCodeAt(0) - 97,
        y: moveInfo.move.charAt(1).charCodeAt(0) - 97,
        winrate: moveInfo.winrate,
        visits: moveInfo.visits,
        scoreLead: moveInfo.scoreLead
      };
    } catch (error) {
      console.error('Error getting KataGo move:', error);
      throw error;
    }
  }

  // Get score estimate
  async getScoreEstimate(board) {
    try {
      const response = await this.getMove(board);
      return response.scoreLead;
    } catch (error) {
      console.error('Error getting score estimate:', error);
      throw error;
    }
  }

  // Get different AI strength settings
  static getStrengthSettings(level) {
    const settings = {
      beginner: {
        maxVisits: 100,
        playoutDoublingAdvantage: 2.0  // Significant handicap
      },
      intermediate: {
        maxVisits: 500,
        playoutDoublingAdvantage: 1.0  // Moderate handicap
      },
      advanced: {
        maxVisits: 1000,
        playoutDoublingAdvantage: 0.0  // No handicap
      }
    };

    return settings[level] || settings.intermediate;
  }
}

module.exports = {
  KataGo
};
