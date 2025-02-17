const { SlashCommandBuilder } = require('discord.js');
const { KataGo } = require('../ai/katago.js');

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

async function execute(interaction) {
  const channelId = interaction.channelId;
  const game = interaction.client.games.get(channelId);
  
  if (!game) {
    await interaction.reply({
      content: 'No game in progress! Use /game to start a new game.',
      ephemeral: true
    });
    return;
  }

  const katago = new KataGo();

  try {
    switch (interaction.options.getSubcommand()) {
      case 'suggest': {
        await interaction.deferReply();
        const suggestion = await katago.getMove(game.board);
        await interaction.editReply({
          content: `KataGo suggests playing at (${suggestion.x}, ${suggestion.y})\nWin rate: ${(suggestion.winrate * 100).toFixed(1)}%\nScore lead: ${suggestion.scoreLead.toFixed(1)}`,
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
          await interaction.reply({
            content: `It's ${game.currentColor}'s turn and you're not on that team!`,
            ephemeral: true
          });
          return;
        }

        await interaction.deferReply();
        
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

        await interaction.editReply({
          content: `AI (${strength}) played at (${move.x}, ${move.y}). It's ${game.currentColor}'s turn!`,
          files: [{
            attachment: game.renderer.render(game.board),
            name: 'board.png'
          }]
        });
        break;
      }

      case 'estimate': {
        await interaction.deferReply();
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
    const errorMessage = !katago.analysisEndpoint
      ? 'KataGo Analysis Engine is not configured. Please set KATAGO_ANALYSIS_ENDPOINT environment variable.'
      : 'Error communicating with KataGo. Please try again later or contact support.';
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: errorMessage,
        ephemeral: true
      });
    } else {
      await interaction.editReply({
        content: errorMessage,
        ephemeral: true
      });
    }
  }
}

module.exports = {
  data,
  execute
};
