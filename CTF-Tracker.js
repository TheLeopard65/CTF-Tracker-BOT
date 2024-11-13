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
    try {
        if (interaction.isCommand()) {
            const command = commands[interaction.commandName];
            if (command?.interaction) { await command.interaction(interaction); }
        } else if (interaction.isButton()) {
            const command = commands[interaction.customId.split('-')[0]];
            if (command?.button) {      await command.button(interaction);      }
        }
    } catch (err) {
        const errPayload = { content: `ERROR: COULDN\'T EXECUTE COMMAND: ${err}`, ephemeral: true };
        console.log(err);
        if (interaction.replied || interaction.deferred) await interaction.followUp(errPayload);
        else await interaction.reply(errPayload);
        throw err;
    }
});
client.login(settings.token);
