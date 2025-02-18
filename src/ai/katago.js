import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../../');

// Map our rulesets to KataGo's ruleset names
const RULESET_MAP = {
  chinese: 'chinese',
  japanese: 'japanese',
  aga: 'aga'
};

class KataGo {
  constructor(enginePath = 'katago', configPath = 'default_gtp.cfg') {
    this.enginePath = enginePath;
    this.configPath = configPath;
    this.process = null;
    this.responseBuffer = '';
    this.currentRequest = null;
    this.startupError = null;
    // Use service mode if KATAGO_MODE environment variable is set to "service"
    this.useService = process.env.KATAGO_MODE === 'service';
    if (this.useService) {
      this.serviceUrl = process.env.KATAGO_URL || 'http://katago:3000';
      console.log('KataGo running in service mode. Service URL:', this.serviceUrl);
    }
  }

  // Start the KataGo process (or do nothing if using service mode)
  start() {
    if (this.useService) {
      console.log('KataGo is running in service mode, skipping local process spawn.');
      return Promise.resolve();
    }
    if (this.process) return;

    console.log('Starting KataGo with:');
    console.log('Engine path:', this.enginePath);
    console.log('Config path:', this.configPath);

    const katagoDir = dirname(this.enginePath);
    const modelPath = join(katagoDir, 'kata1-b28c512nbt-s8209287936-d4596492266.bin.gz');
    console.log('Model path:', modelPath);
    console.log('Working directory:', katagoDir);
    try {
      this.process = spawn(this.enginePath, [
        'analysis',
        '-config', this.configPath,
        '-model', modelPath
      ], { cwd: katagoDir, shell: false });
    } catch (error) {
      console.error('Error spawning KataGo process:', error);
      this.startupError = error.message;
      throw error;
    }

    // Handle process output
    this.process.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('KataGo stdout:', output);
      this.responseBuffer += output;
      this.processResponses();
    });

    this.process.stderr.on('data', (data) => {
      const error = data.toString();
      console.error('KataGo stderr:', error);
      if (error.includes('Uncaught exception:')) {
        this.startupError = error;
      }
    });

    this.process.on('close', (code) => {
      console.log(`KataGo process exited with code ${code}`);
      if (code !== 0 && this.startupError) {
        throw new Error(`KataGo startup error: ${this.startupError}`);
      }
      this.process = null;
    });

    this.process.on('error', (error) => {
      console.error('KataGo process error:', error);
      throw error;
    });

    // Wait for startup errors
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (this.startupError) {
          reject(new Error(`KataGo startup error: ${this.startupError}`));
        } else {
          resolve();
        }
      }, 1000);
    });
  }

  // Process responses from KataGo (only used in local mode)
  processResponses() {
    const lines = this.responseBuffer.split('\n');
    // Keep the last line in the buffer if it's incomplete
    this.responseBuffer = lines.pop();

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const response = JSON.parse(line);
        if (this.currentRequest && response.id === this.currentRequest.id) {
          this.currentRequest.resolve(response);
          this.currentRequest = null;
        }
      } catch (error) {
        console.error('Error parsing KataGo response:', error);
      }
    }
  }

  // Convert coordinates to GTP vertex (e.g., [3, 15] -> "D16")
  coordsToVertex(x, y, size) {
    // Skip 'i' in GTP coordinates
    const col = String.fromCharCode(x + (x >= 8 ? 66 : 65));
    const row = size - y;
    return `${col}${row}`;
  }

  // Convert board state to GTP format
  boardToGTP(board) {
    return board.moves.map(move => [
      move.color === 'black' ? 'B' : 'W',
      this.coordsToVertex(move.x, move.y, board.size)
    ]);
  }

  // Convert GTP vertex to coordinates (e.g., "D16" -> [3, 15])
  vertexToCoords(vertex, size) {
    if (!vertex || vertex === 'pass' || vertex === 'resign') {
      return null;
    }

    const col = vertex.charAt(0).toUpperCase();
    const x = col.charCodeAt(0) - (col >= 'I' ? 66 : 65);
    const y = size - parseInt(vertex.slice(1));
    return { x, y };
  }

  // Get move suggestion using KataGo Analysis Engine
  async getMove(board, settings = { maxVisits: 1000, playoutDoublingAdvantage: 0.0 }) {
    // Build query object
    const rulesetName = board.ruleset.constructor.name.toLowerCase().replace('ruleset', '');
    const katagoRuleset = RULESET_MAP[rulesetName] || 'chinese';
    const query = {
      id: Date.now().toString(),
      initialStones: [],
      moves: this.boardToGTP(board),
      rules: katagoRuleset,
      komi: board.ruleset.constructor.name === 'japaneseruleset' ? 6.5 : 7.5,
      boardXSize: board.size,
      boardYSize: board.size,
      analyzeTurns: [board.moves.length],
      maxVisits: settings.maxVisits,
      rootPolicyTemperature: settings.playoutDoublingAdvantage > 0 ? 1.5 : 1.0,
      rootFpuReductionMax: settings.playoutDoublingAdvantage
    };

    if (this.useService) {
      console.log('Sending query to KataGo service:', JSON.stringify(query, null, 2));
      try {
        const response = await fetch(this.serviceUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(query)
        });
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        const jsonResp = await response.json();
        console.log('Received response from KataGo service:', JSON.stringify(jsonResp, null, 2));
        if (!jsonResp.moveInfos || jsonResp.moveInfos.length === 0) {
          throw new Error('No move suggestions received from KataGo service');
        }
        const moveInfo = jsonResp.moveInfos[0];
        if (!moveInfo.move) {
          throw new Error('Invalid move format received from KataGo service');
        }
        const coords = this.vertexToCoords(moveInfo.move, board.size);
        if (!coords) {
          throw new Error('Invalid move coordinates received from KataGo service');
        }
        return {
          x: coords.x,
          y: coords.y,
          winrate: moveInfo.winrate,
          visits: moveInfo.visits,
          scoreLead: moveInfo.scoreLead
        };
      } catch (error) {
        console.error('Error calling KataGo service:', error);
        throw error;
      }
    } else {
      if (!this.process) {
        await this.start();
      }
      console.log('Sending query to local KataGo process:', JSON.stringify(query, null, 2));
      return new Promise((resolve, reject) => {
        this.currentRequest = { id: query.id, resolve, reject };
        this.process.stdin.write(JSON.stringify(query) + '\n');
      }).then(response => {
        console.log('Received response from local KataGo process:', JSON.stringify(response, null, 2));
        if (!response.moveInfos || response.moveInfos.length === 0) {
          throw new Error('No move suggestions received from KataGo');
        }
        const moveInfo = response.moveInfos[0];
        if (!moveInfo.move) {
          throw new Error('Invalid move format received from KataGo');
        }
        const coords = this.vertexToCoords(moveInfo.move, board.size);
        if (!coords) {
          throw new Error('Invalid move coordinates received from KataGo');
        }
        return {
          x: coords.x,
          y: coords.y,
          winrate: moveInfo.winrate,
          visits: moveInfo.visits,
          scoreLead: moveInfo.scoreLead
        };
      });
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
        playoutDoublingAdvantage: 2.0
      },
      intermediate: {
        maxVisits: 500,
        playoutDoublingAdvantage: 1.0
      },
      advanced: {
        maxVisits: 1000,
        playoutDoublingAdvantage: 0.0
      }
    };

    return settings[level] || settings.intermediate;
  }

  // Clean up resources
  stop() {
    if (!this.useService && this.process) {
      this.process.stdin.end();
      this.process.kill();
      this.process = null;
    }
  }
}

export {
  KataGo
};
