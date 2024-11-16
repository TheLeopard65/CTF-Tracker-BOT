import djs from 'discord.js';
import fs from 'fs';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 60 * 60 * 24 });
const settings = { token: process.env.TOKEN, color: '#0276C9', timezone: 'Asia/Karachi' };
global.config = settings;

const client = new djs.Client({
    intents: ['Guilds', 'GuildMessages', 'DirectMessages'].map(r => djs.IntentsBitField.Flags[r]),
    partials: ['Channel', 'Message'].map(r => djs.Partials[r]),
});
client.commands = new djs.Collection();

const fetchAndCache = async (key, url, retries = 3) => {
    const cachedData = cache.get(key);
    if (cachedData) { return cachedData; }
    try {
        const response = await fetch(url, { timeout: 15000 });
        if (response.status !== 200) return null;
        const data = await response.json();
        cache.set(key, data);
        return data;
    } catch (error) {
        if (retries > 0 && error.code === 'ECONNRESET') { return fetchAndCache(key, url, retries - 1); }
        return null;
    }
};

const getTeam = async query => {
    if (query.match(/^[0-9]+$/)) {
        const team = await fetchAndCache(`team_${query}`, `https://ctftime.org/api/v1/teams/${query}/`);
        return team;
    } else {
        const team = await fetch(`https://ctftime.org/team/list/?q=${encodeURIComponent(query)}`);
        if (team.url) {
            const teamId = team.url.split('team/')[1];
            const res = await fetchAndCache(`team_${teamId}`, `https://ctftime.org/api/v1/teams/${teamId}/`);
            return res;
        } else { return null; }
    }
};

const getEventsByTeam = async team => {
    const currentYear = new Date().getUTCFullYear();
    const startOfYear = new Date(Date.UTC(currentYear, 0, 1)).getTime() / 1000;
    const endOfYear = new Date(Date.UTC(currentYear + 1, 0, 1)).getTime() / 1000 - 1;
    const events = await fetchAndCache(`results_${currentYear}`, `https://ctftime.org/api/v1/results/${currentYear}/`);
    if (!events) return null;
    const times = await fetchAndCache(`events_${currentYear}`, `https://ctftime.org/api/v1/events/?limit=1000&start=${startOfYear}&finish=${endOfYear}`);
    if (!times) return null;
    const teamEvents = [];
    for (const eventId in events) {
        const event = events[eventId];
        const teamScore = event.scores.find(score => score.team_id == team);
        if (teamScore) { teamEvents.push({ eventId, title: event.title, points: teamScore.points, place: teamScore.place, }); }
    }
    if (teamEvents.some(event => times.find(time => time.id == event.eventId)?.start == undefined)) { return null; }
    teamEvents.sort((a, b) => {
        const aTime = new Date(times.find(time => time.id == a.eventId).start);
        const bTime = new Date(times.find(time => time.id == b.eventId).start);
        return aTime - bTime;
    });
    return teamEvents;
};

const getUpcomingEvents = async () => {
    const currentYear = new Date().getUTCFullYear();
    const events = await fetchAndCache(`events_${currentYear}`, `https://ctftime.org/api/v1/events/?limit=1000`);
    if (!events) return null;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + ((1 - startDate.getDay()) % 7));
    startDate.setHours(3, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(new Date().getDate() + 60);
    endDate.setHours(3, 0, 0, 0);
    const upcomingEvents = events.filter(event => {
        const startTime = new Date(event.start);
        return ( startTime >= startDate && startTime <= endDate && (event.onsite || event.location.includes('Online') || event.location == '') );
    });
    return upcomingEvents || null;
};

const registerCommands = async () => {
    const commandsList = [
        new djs.SlashCommandBuilder()
            .setName('help')
            .setDescription('Display this Help Message to find out what the BOT Does!')
            .toJSON(),

        new djs.SlashCommandBuilder()
            .setName('newctfs')
            .setDescription('Lists the Top Upcoming CTF Events on the CTFTime.')
            .addIntegerOption(option =>
                option.setName('count')
                    .setDescription('Limits number of upcoming events to display.')
                    .setRequired(false)
                    .setMinValue(1)
                    .setMaxValue(25)
            )
            .addStringOption(option =>
                option.setName('sort')
                    .setDescription('Sorts the results based on your preference.')
                    .setRequired(false)
                    .addChoices(
                        { name: 'WEIGHT', value: 'weight' },
                        { name: 'START TIME', value: 'start' },
                        { name: 'END TIME', value: 'end' },
                        { name: 'TEAMS', value: 'participants' },
                        { name: 'DURATION', value: 'duration' }
                    )
            )
            .toJSON(),

        new djs.SlashCommandBuilder()
            .setName('teaminfo')
            .setDescription("Views a team's information by name or ID.")
            .addStringOption(option => option.setName('teamid').setDescription('The team name or ID to search for.').setRequired(true))
            .toJSON(),

        new djs.SlashCommandBuilder()
            .setName('setteams')
            .setDescription('Set the team IDs to be used in /compare. (ADMIN ONLY)')
            .addStringOption(option =>
                option.setName('teams')
                    .setDescription('Comma (,) separated list of team names or IDs to compare.')
                    .setRequired(true)
            )
            .toJSON(),

        new djs.SlashCommandBuilder()
            .setName('compare')
            .setDescription('Compare pre-set teams based on their latest 5 CTF Event scores.')
            .toJSON()
    ];

    const rest = new djs.REST({ version: '10' }).setToken(client.token);
    try { const slashCommands = await rest.put(djs.Routes.applicationCommands(client.user.id), { body: commandsList }); }
    catch (error) { console.error('ERROR : COULDN\'T REGISTER COMMANDS : ', error); }
};

const helpCommand = async interaction => {
    const embed = new djs.EmbedBuilder()
        .setColor(global.config.color)
        .setTitle('#####@ - COMMANDS LIST - @#####')
        .setDescription(
            `**/help** - Display this Help Message to find out what the BOT Does!\n` +
            `**/newctfs** - Lists the top upcoming CTF Events on the CTFTime.\n` +
            `**/teaminfo** - Views a team's information by name or ID.\n` +
            `**/compare** - Compare pre-set teams based on their latest 5 CTF Event scores`
        )
        .setFooter({ text: 'VISIT OUR [GITHUB](https://github.com/TheLeopard65/CTF-Tracker-BOT) FOR DETAILS' })
    await interaction.reply({ embeds: [embed] });
};

const newctfsCommand = async interaction => {
    await interaction.deferReply();
    const limit = interaction.options.getInteger('count') || 10;
    const sort = interaction.options.getString('sort') || 'start';
    try {
        const upcomingEvents = await getUpcomingEvents();
        if (!upcomingEvents) { return interaction.editReply({ content: 'ERROR : Issue while fetching upcoming CTF Events on CTFTIME.ORG' }); }
        const events = upcomingEvents
            .sort((a, b) => {
                if (sort === 'weight') return b.weight - a.weight;
                else if (sort === 'end') return new Date(a.finish) - new Date(b.finish);
                else if (sort === 'start') return new Date(a.start) - new Date(b.start);
                else if (sort === 'participants') return b.participants - a.participants;
                else if (sort === 'duration') return (new Date(a.finish) - new Date(a.start)) - (new Date(b.finish) - new Date(b.start));
                return b.weight - a.weight;
            })
            .slice(0, limit);

        const embed = new djs.EmbedBuilder()
            .setColor(global.config.color)
            .setTitle(' #####@ - TOP UPCOMING CTF EVENTS ON CTFTIME.ORG - @##### ')
            .setURL('https://ctftime.org/event/list/upcoming')
            .setDescription('Here are the Top Upcoming Online CTFs on CTFTime for you to play:');

        let characters = 0;
        for (let i = 0; i < events.length && characters + 1000 < 30000; i++) {
            const event = events[i];
            const startTime = new Date(event.start);
            const endTime = new Date(event.finish);

            embed.addFields({
                name: `${i + 1}. [${event.title}](https://ctftime.org/event/${event.id})`,
                value: `**TIMING**: FROM <t:${Math.floor(startTime.getTime() / 1000)}:f> TO <t:${Math.floor(endTime.getTime() / 1000)}:f>\n`,
            });
            characters += 1000;
        }
        await interaction.editReply({ embeds: [embed] });
    } catch (error) { await interaction.editReply({ content: 'ERROR: Timed-Out while fetching upcoming CTF Events. (PLEASE TRY AGAIN LATER)' }); }
};

const teaminfoCommand = async interaction => {
    await interaction.deferReply();
    const query = interaction.options.getString('teamid');
    if (!query) { return await interaction.editReply({ content: 'SYNTAX: Provide a team name or ID to search for.', ephemeral: true }); }
    try {
        const team = await getTeam(query);
        if (!team || !team.id) { return await interaction.editReply({ content: `ISSUE: Team "${query}" Not Found. (PLEASE CHECK YOUR INPUT)`, ephemeral: true }); }
        const members = team.aliases && team.aliases.length > 0 ? team.aliases.join(', ') : 'N/A';
        const events = await getEventsByTeam(team.id);
        const embed = new djs.EmbedBuilder()
            .setColor(global.config.color)
            .setTitle(`#####@ - ${team.name} TEAM INFORMATION - @#####`)
            .setURL(`https://ctftime.org/team/${team.id}/`)
            .addFields(
                { name: 'NAME:', value: `${team.name || 'N/A'}`, inline: true },
                { name: 'Country:', value: `${team.country || 'N/A'}`, inline: true },
                { name: 'TEAM-ID:', value: `${team.id}`, inline: true },
                { name: 'NATIONAL-RANK:', value: `${team.rating && team.rating["2024"] && team.rating["2024"].country_place ? team.rating["2024"].country_place.toString() : "N/A"}`, inline: true },
                { name: 'TEAM MEMBERS:', value: `${members}`, inline: true }
            )
            .setFooter({ text: 'NOTE: DATA PROVIDED BY CTFTIME.ORG' })
            .setTimestamp();

        if (events && events.length > 0) {
            const eventFields = events.slice(0, 5).map((event, index) => {
                const eventTitle = event.title || 'NIL';
                const eventPoints = event.points || 'NIL';
                const eventRank = event.place || 'N/A';
                return `${index + 1}. **${eventTitle}** (_Rank: ${eventRank} & Points: ${eventPoints}_)`;
            }).join('\n');
            embed.addFields({
                name: `\n#####@ - ${team.name} RECENT EVENTS - @#####`,
                value: eventFields || '! NO EVENTS PLAYED !',
                inline: false
            });
        } else {
            embed.addFields({
                name: `\n#####@ - ${team.name} RECENT EVENTS - @#####`,
                value: '! NO EVENTS PLAYED !',
                inline: false
            });
        }
        return await interaction.editReply({ embeds: [embed] });
    } catch (error) { return await interaction.editReply({ content: 'ERROR: Could not fetch Team Information. (PLEASE TRY AGAIN LATER)', ephemeral: true }); }
};

let teamIds = [];
const setteamsCommand = async interaction => {
    const member = interaction.guild.members.cache.get(interaction.user.id);
    if (!member || !member.permissions.has(djs.PermissionFlagsBits.Administrator)) { return interaction.reply({ content: 'ISSUE: ADMINISTRATOR PRIVILEGES REQUIRED!!!', ephemeral: true }); }
    const teamsInput = interaction.options.getString('teams');
    teamIds = teamsInput.split(',').map(t => t.trim());
    await interaction.reply({ content: `SUCCESS: Team IDs have been Set to ${teamIds.join(', ')} for the Comparison` });
};

const compareCommand = async interaction => {
    if (teamIds.length === 0) { return interaction.reply({ content: 'ISSUE: Use /setteams to set the teams.', ephemeral: true }); }
    await interaction.deferReply();
    const teamData = [];
    for (const teamQuery of teamIds) {
        const team = await getTeam(teamQuery);
        if (!team) { return interaction.editReply({ content: `ISSUE: TEAM ${teamQuery} NOT FOUND`, ephemeral: true }); }
        const results = await getEventsByTeam(team.id);
        if (!results || results.length === 0) { return interaction.editReply({ content: `ISSUE: No CTF Events Found for Team ${team.name}.`, ephemeral: true }); }
        const latestResults = results.slice(0, 5);
        const totalPoints = latestResults.reduce((sum, event) => {
            const points = parseInt(event.points.replace(' POINTS', ''), 10);
            return sum + (isNaN(points) ? 0 : points);
        }, 0);
        teamData.push({ name: team.name, totalPoints, results: latestResults });
    }
    teamData.sort((a, b) => b.totalPoints - a.totalPoints);
    const embed = new djs.EmbedBuilder()
        .setColor(global.config.color)
        .setTitle('##@- CTF TEAMS COMPARISON BASED ON LAST 5 CTFs -@##');

    teamData.forEach((team, index) => {
        embed.addFields({
            name: `${index + 1}. ${team.name} (TP: ${team.totalPoints})\n`, inline: true,
            value: `\n### RECENT EVENT RESULTS ###\n` + team.results.map(e => `${index + 1}) ${e.title}: ${e.points}`).join('\n') || 'NO EVENTS PLAYED',
        });
    });
    await interaction.editReply({ embeds: [embed] });
};

client.once('ready', async () => {	await registerCommands();	});
client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
        try {
            if (interaction.commandName === 'help') {	await helpCommand(interaction);	}
            else if (interaction.commandName === 'newctfs') {	await newctfsCommand(interaction);	}
            else if (interaction.commandName === 'teaminfo') {	await teaminfoCommand(interaction);	}
            else if (interaction.commandName === 'setteams') {	await setteamsCommand(interaction);	}
            else if (interaction.commandName === 'compare') {	await compareCommand(interaction);	}
        } catch (err) {
            if (!interaction.replied) { await interaction.reply({ content: 'ERROR: !COULDN\'T PROCESS YOUR COMMANDS! SORRY!!', ephemeral: true }); }
        }
    }
});
client.login(settings.token);
