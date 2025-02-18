import { SlashCommandBuilder } from 'discord.js';

const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Make a move in the current game')
  .addStringOption(option =>
    option.setName('position')
      .setDescription('Board position (e.g. a1, t19)')
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
  try {
    const channelId = interaction.channelId;
    const game = interaction.client.games.get(channelId);
    
    if (!game) {
      await interaction.reply({
        content: 'No game in progress! Use /game to start a new game.',
        ephemeral: true
      });
      return;
    }

    let position;
    try {
      position = interaction.options.getString('position')?.toLowerCase();
      if (!position) {
        await interaction.reply({
          content: 'Please provide a valid board position.',
          ephemeral: true
        });
        return;
      }
    } catch (error) {
      console.error('Error getting position:', error);
      await interaction.reply({
        content: 'Failed to process move position. Please try again.',
        ephemeral: true
      });
      return;
    }

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

  // Check if it's a valid player's turn
  if (!game.board.teams[game.currentColor].has(playerId)) {
    await interaction.reply({
      content: `It's ${game.currentColor}'s turn and you're not on that team!`,
      ephemeral: true
    });
    return;
  }

    try {
      // Attempt to make the move
      if (!game.board.makeMove(coords.x, coords.y, game.currentColor, playerId)) {
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
      game.lastMove = { x: coords.x, y: coords.y };

      // Render the updated board
      let boardImage;
      try {
        boardImage = game.renderer.render(game.board);
      } catch (error) {
        console.error('Error rendering board:', error);
        await interaction.reply({
          content: 'Move was made but failed to render board. The game state is saved.',
          ephemeral: true
        });
        return;
      }

      // Send the response
      await interaction.reply({
        content: `${interaction.user} played at ${position}. It's ${game.currentColor}'s turn!`,
        files: [{
          attachment: boardImage,
          name: 'board.png'
        }]
      });
    } catch (error) {
      console.error('Error processing move:', error);
      try {
        // Try to revert the move if possible
        if (game.lastMove) {
          game.board.undoLastMove();
          game.currentColor = game.currentColor === 'black' ? 'white' : 'black';
        }
        await interaction.reply({
          content: 'Failed to process move. The game has been restored to its previous state.',
          ephemeral: true
        });
      } catch (revertError) {
        console.error('Error reverting move:', revertError);
        await interaction.reply({
          content: 'An error occurred. Please check the game state and try again.',
          ephemeral: true
        });
      }
    }
  } catch (error) {
    console.error('Unexpected error in play command:', error);
    try {
      await interaction.reply({
        content: 'An unexpected error occurred. Please try again or contact support.',
        ephemeral: true
      });
    } catch (followUpError) {
      console.error('Error sending error message:', followUpError);
    }
  }
}

export {
  data,
  execute
};
