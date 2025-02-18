import { SlashCommandBuilder } from 'discord.js';
import { Board } from '../game/board.js';
import { BoardRenderer } from '../rendering/board.js';

const BOARD_SIZES = {
  '19x19': 19,
  '13x13': 13,
  '9x9': 9
};

const RULESETS = {
  'Chinese': 'chinese',
  'Japanese': 'japanese',
  'AGA': 'aga'
};

const data = new SlashCommandBuilder()
  .setName('game')
  .setDescription('Start a new Go game')
  .addStringOption(option =>
    option.setName('size')
      .setDescription('Board size')
      .setRequired(true)
      .addChoices(
        { name: '19x19', value: '19x19' },
        { name: '13x13', value: '13x13' },
        { name: '9x9', value: '9x9' }
      ))
  .addStringOption(option =>
    option.setName('ruleset')
      .setDescription('Game ruleset')
      .setRequired(true)
      .addChoices(
        { name: 'Chinese', value: 'Chinese' },
        { name: 'Japanese', value: 'Japanese' },
        { name: 'AGA', value: 'AGA' }
      ));

async function execute(interaction) {
  try {
    const channelId = interaction.channelId;
    const size = BOARD_SIZES[interaction.options.getString('size')];
    const ruleset = RULESETS[interaction.options.getString('ruleset')];

    if (!size || !ruleset) {
      await interaction.reply({
        content: 'Invalid board size or ruleset selected.',
        ephemeral: true
      });
      return;
    }

  // Check if there's already a game in this channel
  if (interaction.client.games.has(channelId)) {
    await interaction.reply({
      content: 'There is already a game in progress in this channel!',
      ephemeral: true
    });
    return;
  }

    // Create new game
    let board, renderer;
    try {
      board = new Board(size, ruleset);
      renderer = new BoardRenderer(size);
    } catch (error) {
      console.error('Error creating game:', error);
      await interaction.reply({
        content: 'Failed to create new game. Please try again or contact support.',
        ephemeral: true
      });
      return;
    }

    // Store game state
    try {
      interaction.client.games.set(channelId, {
        board,
        renderer,
        currentColor: 'black',
        lastMove: null,
        passes: 0
      });
    } catch (error) {
      console.error('Error storing game state:', error);
      await interaction.reply({
        content: 'Failed to initialize game state. Please try again.',
        ephemeral: true
      });
      return;
    }

    // Render initial board
    let boardImage;
    try {
      boardImage = renderer.render(board);
    } catch (error) {
      console.error('Error rendering board:', error);
      await interaction.reply({
        content: 'Failed to render game board. Please try again.',
        ephemeral: true
      });
      // Clean up the stored game state
      interaction.client.games.delete(channelId);
      return;
    }

    try {
      await interaction.reply({
        content: `New ${size}x${size} game started with ${ruleset} rules! Use /join to join a team.`,
        files: [{
          attachment: boardImage,
          name: 'board.png'
        }]
      });
    } catch (error) {
      console.error('Error sending reply:', error);
      // Clean up the stored game state
      interaction.client.games.delete(channelId);
      try {
        await interaction.reply({
          content: 'Failed to start new game. Please try again.',
          ephemeral: true
        });
      } catch (followUpError) {
        console.error('Error sending error message:', followUpError);
      }
    }
  } catch (error) {
    console.error('Unexpected error in game command:', error);
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
