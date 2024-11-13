const djs = require('discord.js');
const { getTeam, getEventsByTeam } = require('../API.js');

const suff = nr => {
    if (nr % 100 < 11 || nr % 100 > 13) {
        if (nr % 10 == 1) return nr + 'st';
        if (nr % 10 == 2) return nr + 'nd';
        if (nr % 10 == 3) return nr + 'rd';
    }
    return nr + 'th';
};

module.exports.interaction = async interaction => {
    await interaction.deferReply({ ephemeral: false });
    const query = interaction.options.getString('query');
    const team = await getTeam(query);
    if (!team) return interaction.editReply({ content: 'ERROR : TEAM NOT FOUND.' });
    const results = await getEventsByTeam(team.id);
    if (!results?.length) return interaction.editReply({ content: 'ERROR : TEAM DETAILS NOT FOUND' });

    const embed = new djs.EmbedBuilder()
        .setColor(global.config.color)
        .setTitle(`${team.name}`)
        .setURL(`https://ctftime.org/team/${team.id}/`);

    if (team.logo) embed.setThumbnail(team.logo);

    const rating = team.rating[new Date().getFullYear()];
    const description = team.description || 'TEAM DISCRIPTION NOT AVAILABLE';

    embed.addFields(
        { name: 'TEAM NAME: ', value: team.name, inline: true },
        { name: 'TEAM ID: ', value: team.id, inline: true },
        { name: 'MEMBERS: ', value: team.members ? team.members.join(', ') : 'No members listed', inline: true },
        { name: 'TEAM MOTO: ', value: description, inline: false },
    );

    let events = '';
    let remainingEvents = 0;

    for (const event of results.reverse().slice(0, 10)) {
        const place = event.place;
        const eventString = `${suff(place)}【[${
            event.title.length > 40 ? `${event.title.slice(0, 37)}...` : event.title
        }](<https://ctftime.org/event/${event.eventId}>)】${event.points.slice(0, -5)} pts\n`;

        if (events.length + eventString.length > 1000) {	remainingEvents++;	}
        else {	events += eventString;	}
    }

    if (remainingEvents > 0) {	events += `and ${remainingEvents} more...`;	}
    embed.addFields({ name: 'Last 10 Events', value: events || 'No events found.' });
    await interaction.editReply({ embeds: [embed] });
};

module.exports.application_command = () => {
    return new djs.SlashCommandBuilder()
        .setName('teaminfo')
        .setDescription("View a team's information by name or ID.")
        .addStringOption(option => option.setName('query').setDescription('The team name or ID to search for.').setRequired(true))
        .setIntegrationTypes(['GuildInstall', 'UserInstall'])
        .setContexts(['BotDM', 'Guild', 'PrivateChannel']);
};
