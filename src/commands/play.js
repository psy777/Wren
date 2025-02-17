const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Make a move in the current game')
  .addIntegerOption(option =>
    option.setName('x')
      .setDescription('X coordinate (0-18)')
      .setRequired(true)
      .setMinValue(0)
      .setMaxValue(18))
  .addIntegerOption(option =>
    option.setName('y')
      .setDescription('Y coordinate (0-18)')
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

  // Check if it's a valid player's turn
  if (!game.board.teams[game.currentColor].has(playerId)) {
    await interaction.reply({
      content: `It's ${game.currentColor}'s turn and you're not on that team!`,
      ephemeral: true
    });
    return;
  }

  // Attempt to make the move
  if (!game.board.makeMove(x, y, game.currentColor, playerId)) {
    await interaction.reply({
      content: 'Invalid move! The position might be occupied or the move might be suicidal.',
      ephemeral: true
    });
    return;
  }

  // Reset pass counter since a move was made
  game.passes = 0;

  // Switch turns
  game.currentColor = game.currentColor === 'black' ? 'white' : 'black';
  game.lastMove = { x, y };

  // Render and send the updated board
  await interaction.reply({
    content: `${interaction.user} played at (${x}, ${y}). It's ${game.currentColor}'s turn!`,
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
