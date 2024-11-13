const djs = require('discord.js');
const { commands } = require('../CTF-Tracker');

function getCommands() {
    return {
        Commands: [
            [commands['help'], 'View this Help/Support Menu for you'],
            [commands['teaminfo'], "View a team's details by name or ID from ctftime."],
            [commands['newctfs'], 'Lists top 10 CTFs occurring within the next 7 days.'],
        ]
    };
}

module.exports.interaction = async interaction => {
    const commands = getCommands();
    const description = Object.entries(commands)
        .map(([category, cmds]) => {    return `${cmds.map(([name, desc]) => `- ${name} - ${desc}`).join('\n')}`;       })
        .join('\n\n');
    const embed = new djs.EmbedBuilder()
        .setColor(global.config.color)
        .setTitle('Commands List')
        .setDescription(description + `\n\n**Need help?**\n- Visit the [Github](https://github.com/MitruStefan/ctf-sentinel) page`);
    await interaction.reply({ embeds: [embed] });
};

module.exports.application_command = () => {
    return new djs.SlashCommandBuilder()
        .setName('help')
        .setDescription('Find out what the bot does')
        .setIntegrationTypes(['GuildInstall', 'UserInstall'])
        .setContexts(['BotDM', 'Guild', 'PrivateChannel']);
};
