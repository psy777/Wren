import { SlashCommandBuilder } from 'discord.js';
import { KataGo } from '../ai/katago.js';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../../');

// Paths relative to project root
const katagoPath = resolve(projectRoot, '../katago-opencl/katago.exe');
const configPath = resolve(projectRoot, '../katago-opencl/analysis_example.cfg');

console.log('KataGo paths:');
console.log('Engine path:', katagoPath);
console.log('Config path:', configPath);

const data = new SlashCommandBuilder()
  .setName('ai')
  .setDescription('Get AI move suggestions or play against AI')
  .addSubcommand(subcommand =>
    subcommand
      .setName('suggest')
      .setDescription('Get a move suggestion from KataGo'))
  .addSubcommand(subcommand =>
    subcommand
      .setName('play')
      .setDescription('Let AI play the next move')
      .addStringOption(option =>
        option.setName('strength')
          .setDescription('AI strength level')
          .setRequired(true)
          .addChoices(
            { name: 'Beginner', value: 'beginner' },
            { name: 'Intermediate', value: 'intermediate' },
            { name: 'Advanced', value: 'advanced' }
          )))
  .addSubcommand(subcommand =>
    subcommand
      .setName('estimate')
      .setDescription('Get a score estimate from KataGo'));

// Convert coordinates to board notation (e.g., [15, 3] -> "Q16")
function coordsToNotation(x, y, size) {
  const letter = String.fromCharCode(x + (x >= 8 ? 66 : 65));
  const number = size - y;
  return `${letter}${number}`;
}

async function execute(interaction) {
  try {
    await interaction.deferReply();

    const channelId = interaction.channelId;
    const game = interaction.client.games.get(channelId);
    
    if (!game) {
      await interaction.editReply({
        content: 'No game in progress! Use /game to start a new game.',
        ephemeral: true
      });
      return;
    }

    const katago = new KataGo(katagoPath, configPath);

    try {
      switch (interaction.options.getSubcommand()) {
        case 'suggest': {
          const suggestion = await katago.getMove(game.board);
          const moveNotation = coordsToNotation(suggestion.x, suggestion.y, game.board.size);
          await interaction.editReply({
            content: `KataGo suggests playing at ${moveNotation}\nWin rate: ${(suggestion.winrate * 100).toFixed(1)}%\nScore lead: ${suggestion.scoreLead.toFixed(1)}`,
            files: [{
              attachment: game.renderer.render(game.board),
              name: 'board.png'
            }]
          });
          break;
        }

        case 'play': {
          const playerId = interaction.user.id;
          
          // Check if it's a valid player's turn
          if (!game.board.teams[game.currentColor].has(playerId)) {
            await interaction.editReply({
              content: `It's ${game.currentColor}'s turn and you're not on that team!`,
              ephemeral: true
            });
            return;
          }
          
          const strength = interaction.options.getString('strength');
          const settings = KataGo.getStrengthSettings(strength);
          const move = await katago.getMove(game.board, settings);

          // Make the AI's move
          if (!game.board.makeMove(move.x, move.y, game.currentColor, playerId)) {
            await interaction.editReply({
              content: 'AI generated an invalid move! Please try again or contact support.',
              ephemeral: true
            });
            return;
          }

          // Reset pass counter and switch turns
          game.passes = 0;
          game.currentColor = game.currentColor === 'black' ? 'white' : 'black';
          game.lastMove = { x: move.x, y: move.y };

          const moveNotation = coordsToNotation(move.x, move.y, game.board.size);
          await interaction.editReply({
            content: `AI (${strength}) played at ${moveNotation}. It's ${game.currentColor}'s turn!`,
            files: [{
              attachment: game.renderer.render(game.board),
              name: 'board.png'
            }]
          });
          break;
        }

        case 'estimate': {
          const estimate = await katago.getScoreEstimate(game.board);
          const leader = estimate > 0 ? 'Black' : 'White';
          const margin = Math.abs(estimate);

          await interaction.editReply({
            content: `KataGo estimates ${leader} is leading by ${margin.toFixed(1)} points.`,
            files: [{
              attachment: game.renderer.render(game.board),
              name: 'board.png'
            }]
          });
          break;
        }
      }
    } catch (error) {
      console.error('KataGo error:', error);
      await interaction.editReply({
        content: 'Error communicating with KataGo. Please try again later or contact support.',
        ephemeral: true
      });
    } finally {
      // Clean up KataGo process
      katago.stop();
    }
  } catch (error) {
    console.error('Command error:', error);
    try {
      if (interaction.deferred) {
        await interaction.editReply({
          content: 'There was an error executing this command!',
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: 'There was an error executing this command!',
          ephemeral: true
        });
      }
    } catch (followUpError) {
      console.error('Error sending error message:', followUpError);
    }
  }
}

export {
  data,
  execute
};
