const djs = require('discord.js');

let teamIds = [];

module.exports.interaction = async interaction => {
    if (interaction.user.id !== global.config.ownerId) { return interaction.reply({ content: 'ERROR : ADMINISTRATOR PRIVILEGES NEEDED', ephemeral: true });	}
    const teamsInput = interaction.options.getString('teams');
    const teams = teamsInput.split(',').map(t => t.trim());

    teamIds = teams;
    return interaction.reply({ content: `TEAM IDs HAVE BEEN SET TO: ${teamIds.join(', ')}` });
};

module.exports.application_command = () => {
    return new djs.SlashCommandBuilder()
        .setName('setteams')
        .setDescription('Set the team IDs to be used in /compare.')
        .addStringOption(option =>
            option.setName('teams')
                .setDescription('Comma separated list of team names or IDs to compare.')
                .setRequired(true)
        );
};
