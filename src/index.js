import 'dotenv/config';
import { Client, GatewayIntentBits, Events, Collection } from 'discord.js';
import { readdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});

// Store active games and commands
client.games = new Collection();
client.commands = new Collection();

// Load commands
async function loadCommands() {
  const commands = [];
  const commandsPath = join(__dirname, 'commands');
  const commandFiles = (await readdir(commandsPath)).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    const fileUrl = `file://${resolve(filePath)}`;
    const command = await import(fileUrl);
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    }
  }
}

// Event handlers
client.once(Events.ClientReady, () => {
  console.log('Go Bot is ready!');
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    try {
      const errorMessage = {
        content: 'There was an error executing this command!',
        ephemeral: true
      };

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    } catch (followUpError) {
      console.error('Error sending error message:', followUpError);
    }
  }
});

// Handle process errors
process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Initialize bot
async function init() {
  try {
    await loadCommands();
    // Login to Discord with your client's token
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error('Failed to initialize bot:', error);
    process.exit(1);
  }
}

init();
