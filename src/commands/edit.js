const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('edit')
  .setDescription('Edit your last move')
  .addIntegerOption(option =>
    option.setName('x')
      .setDescription('New X coordinate (0-18)')
      .setRequired(true)
      .setMinValue(0)
      .setMaxValue(18))
  .addIntegerOption(option =>
    option.setName('y')
      .setDescription('New Y coordinate (0-18)')
      .setRequired(true)
      .setMinValue(0)
      .setMaxValue(18));

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

  const x = interaction.options.getInteger('x');
  const y = interaction.options.getInteger('y');
  const playerId = interaction.user.id;

  // Validate coordinates for board size
  if (x >= game.board.size || y >= game.board.size) {
    await interaction.reply({
      content: `Invalid coordinates! This is a ${game.board.size}x${game.board.size} board.`,
      ephemeral: true
    });
    return;
  }

  // Attempt to edit the last move
  if (!game.board.editLastMove(x, y, playerId)) {
    await interaction.reply({
      content: 'Cannot edit move! Either you did not make the last move, or the new position is invalid.',
      ephemeral: true
    });
    return;
  }

  // Update last move position
  game.lastMove = { x, y };

  await interaction.reply({
    content: `${interaction.user} edited their move to (${x}, ${y}). It's still ${game.currentColor}'s turn!`,
    files: [{
      attachment: game.renderer.render(game.board),
      name: 'board.png'
    }]
  });
}

module.exports = {
  data,
  execute
};
