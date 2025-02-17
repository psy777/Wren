const { Client, GatewayIntentBits, Events, Collection } = require('discord.js');
const { readdir } = require('fs/promises');
const path = require('path');

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
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = (await readdir(commandsPath)).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
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
    await interaction.reply({
      content: 'There was an error executing this command!',
      ephemeral: true
    });
  }
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
