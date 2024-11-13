const djs = require('discord.js');
const { getTeam, getEventsByTeam } = require('../API.js');

let teamIds = [];

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
    if (teamIds.length === 0) {	return interaction.editReply({ content: 'No teams have been set yet. Please ask an admin to set the teams using `/setteams`.' });	}

    const teamData = [];
    for (const teamQuery of teamIds) {
        const team = await getTeam(teamQuery);
        if (!team) {	return interaction.editReply({ content: `ERROR: TEAM ${teamQuery} NOT FOUND.` });	}
        const results = await getEventsByTeam(team.id);
        if (!results?.length) {	return interaction.editReply({ content: `ERROR: NO EVENTS FOUND FOR TEAM ${team.name}.` });	}
        const totalPoints = results.slice(0, 5).reduce((sum, event) => sum + parseInt(event.points.replace(' pts', ''), 10), 0);
        teamData.push({ name: team.name, totalPoints, results });
    }
    teamData.sort((a, b) => b.totalPoints - a.totalPoints);
    const embed = new djs.EmbedBuilder()
        .setColor(global.config.color)
        .setTitle('CTF Team Comparison - Latest 5 CTFs')
        .setDescription('Here is the scoreboard for the teams based on their latest CTF performance.');

    teamData.forEach((team, index) => {
        let eventsInfo = '';
        team.results.slice(0, 5).forEach((event, i) => {
            const place = event.place ? suff(event.place) : 'N/A';
            const eventName = event.title.length > 40 ? `${event.title.slice(0, 37)}...` : event.title;
            eventsInfo += `**${place}** in [${eventName}](https://ctftime.org/event/${event.eventId}) - ${event.points}\n`;
        });

        embed.addFields({
            name: `${index + 1}. ${team.name} - Total Points: ${team.totalPoints}`,
            value: eventsInfo || 'No event data available.',
        });
    });

    await interaction.editReply({ embeds: [embed] });
};

module.exports.application_command = () => {
    return new djs.SlashCommandBuilder()
        .setName('compare')
        .setDescription('Compare pre-set teams based on their latest 5 CTF event scores.');
};
