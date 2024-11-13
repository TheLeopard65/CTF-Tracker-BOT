const djs = require('discord.js');
const fs = require('fs');
require('dotenv').config();

const settings = {      token: process.env.TOKEN, ownerId: process.env.OWNERID, color: '#0276C9', timezone: 'Asia/Karachi' };
global.config = settings;

const client = new djs.Client({
    intents: ['Guilds', 'GuildMessages', 'DirectMessages'].map(r => djs.IntentsBitField.Flags[r]),
    partials: ['Channel', 'Message'].map(r => djs.Partials[r]),
});

const files = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const commands = {};
files.forEach(file => { commands[file.slice(0, -3)] = require(`./commands/${file}`);    });
const registerCommands = async () => {
    const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
    let commandsList = [];
    for (const file of commandFiles) {
        const command = require(`./commands/${file}`);
        if (command.application_command) {      commandsList.push(command.application_command());       }
    }
    const rest = new djs.REST({ version: '10' }).setToken(client.token);
    const slashCommands = await rest.put(djs.Routes.applicationCommands(client.user.id), { body: commandsList });
    slashCommands.forEach(c => {        commands[c.name] = `</${c.name}:${c.id}>`;      });
};

client.once('ready', async () => {
    console.log(`LOGGED IN AS ${client.user.tag}!`);
    await registerCommands();
});
client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
        console.log('Received command:', interaction.commandName);
        
        try {
            await interaction.deferReply();
            console.log('Deferred reply');
            const result = await processCommand(interaction);
            console.log('Processed result:', result);
            await interaction.editReply(result);
            console.log('Replied with result');
        } catch (err) {
            console.error("Error processing command:", err);
            await interaction.editReply("There was an error processing your request.");
        }
    }
});

client.login(settings.token);
