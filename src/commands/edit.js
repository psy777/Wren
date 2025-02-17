const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('edit')
  .setDescription('Edit your last move')
  .addStringOption(option =>
    option.setName('position')
      .setDescription('New board position (e.g. a1, t19)')
      .setRequired(true));

// Convert position notation (e.g. "a1") to coordinates
function notationToCoords(position, size = 19) {
  const match = position.match(/^([a-t])(\d{1,2})$/i);
  if (!match) return null;
  
  const [_, letter, number] = match;
  const x = letter.toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0);
  const y = size - parseInt(number);
  
  return { x, y };
}

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

  const position = interaction.options.getString('position').toLowerCase();
  const coords = notationToCoords(position, game.board.size);
  const playerId = interaction.user.id;

  // Validate position format and coordinates
  if (!coords || coords.x >= game.board.size || coords.y >= game.board.size || coords.x < 0 || coords.y < 0) {
    await interaction.reply({
      content: `Invalid coordinates! This is a ${game.board.size}x${game.board.size} board.`,
      ephemeral: true
    });
    return;
  }

  // Attempt to edit the last move
  if (!game.board.editLastMove(coords.x, coords.y, playerId)) {
    await interaction.reply({
      content: 'Cannot edit move! Either you did not make the last move, or the new position is invalid.',
      ephemeral: true
    });
    return;
  }

  // Update last move position
  game.lastMove = { x: coords.x, y: coords.y };

  await interaction.reply({
    content: `${interaction.user} edited their move to ${position}. It's still ${game.currentColor}'s turn!`,
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
