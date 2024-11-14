const djs = require('discord.js');
const fs = require('fs');
require('dotenv').config();
const fetch = require('node-fetch');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 60 * 60 * 24 });

const settings = { token: process.env.TOKEN, ownerId: process.env.OWNERID, color: '#0276C9', timezone: 'Asia/Karachi' };
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
        const response = await fetch(url);
        if (response.status !== 200) return null;
        const data = await response.json();
        cache.set(key, data);
        return data;
    } catch (error) {
        if (retries > 0 && error.code === 'ECONNRESET') {	return fetchAndCache(key, url, retries - 1);	}
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
        if (teamScore) {
            teamEvents.push({
                eventId,
                title: event.title,
                points: teamScore.points,
                place: teamScore.place,
            });
        }
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
    endDate.setDate(new Date().getDate() + 8);
    endDate.setHours(3, 0, 0, 0);
    const upcomingEvents = events.filter(event => {
        const startTime = new Date(event.start);
        return (
            startTime >= startDate &&
            startTime <= endDate &&
            (event.onsite || event.location.includes('Online') || event.location == '')
        );
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
            .setDescription('Lists the top upcoming CTF Events on the CTFTime.')
            .addIntegerOption(option =>
                option.setName('limit')
                    .setDescription('Limits number of upcoming events to display.')
                    .setRequired(false)
                    .setMinValue(1)
                    .setMaxValue(10)
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
            .addBooleanOption(option =>
                option.setName('show_description')
                    .setDescription('Show event descriptions in the result.')
                    .setRequired(false)
            )
            .toJSON(),

        new djs.SlashCommandBuilder()
            .setName('teaminfo')
            .setDescription("Views a team's information by name or ID.")
            .addStringOption(option => option.setName('query').setDescription('The team name or ID to search for.').setRequired(true))
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
    try {	const slashCommands = await rest.put(djs.Routes.applicationCommands(client.user.id), { body: commandsList });	}
    catch (error) {	console.error('ERROR : COULDN\'T REGISTER COMMANDS : ', error);	}
};

const helpCommand = async interaction => {
    const embed = new djs.EmbedBuilder()
        .setColor(global.config.color)
        .setTitle('Commands List')
        .setDescription(
            `**/help** - Display this Help Message to find out what the BOT Does!\n` +
            `**/newctfs** - Lists the top upcoming CTF Events on the CTFTime.\n` +
            `**/teaminfo** - Views a team's information by name or ID.\n` +
            `**/compare** - Compare pre-set teams based on their latest 5 CTF Event scores`
        )
        .setFooter({ text: 'NEED HELP? VISIT OUR [GITHUB](https://github.com/TheLeopard65/CTF-Tracker-BOT)' })
    await interaction.reply({ embeds: [embed] });
};

const newctfsCommand = async interaction => {
    await interaction.deferReply();
    const limit = interaction.options.getInteger('limit') || 10;
    const sort = interaction.options.getString('sort') || 'weight';
    const showDescription = interaction.options.getBoolean('show_description') === null ? true : interaction.options.getBoolean('show_description');
    try {
        const upcomingEvents = await getUpcomingEvents();
        if (!upcomingEvents) {	return interaction.editReply({ content: 'ERROR : Issue while fetching upcoming CTF CTF Events on CTFTime' });	}
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
            .setTitle(' ~~~# TOP UPCOMING CTF EVENTS ON CTFTIME #~~~ ')
            .setURL('https://ctftime.org/event/list/upcoming')
            .setDescription('Here are the top 10 online upcoming CTFs on CTFTime.');

        let characters = 0;
        for (let i = 0; i < events.length && characters + 1000 < 5500; i++) {
            const event = events[i];
            const startTime = new Date(event.start);
            const endTime = new Date(event.finish);

            embed.addFields({
                name: `${i + 1}. ${event.title}`,
                value: `**Start**: <t:${Math.floor(startTime.getTime() / 1000)}:f>\n**End**: <t:${Math.floor(endTime.getTime() / 1000)}:f>\n**Weight**: ${event.weight}`,
            });
            characters += 1000;
        }

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        await interaction.editReply({ content: 'ERROR: Timed-Out while fetching upcoming CTF Events. (PLEASE TRY AGAIN LATER)' });
    }
};

const teaminfoCommand = async interaction => {
    const query = interaction.options.getString('query');
    try {
        if (!query) {   return interaction.reply({ content: 'SYNTAX: Provide a team name or ID to search for.', ephemeral: true });	}
        const team = await getTeam(query);
        if (!team) {	return interaction.reply({ content: `ISSUE: TEAM "${query}" NOT FOUND. (PLEASE CHECK YOUR INPUT)`, ephemeral: true });	}
        const events = await getEventsByTeam(team.id);
        if (!events || events.length === 0) {	return interaction.reply({ content: `ISSUE: NO CTF EVENTS FOUND FOR TEAM "${team.name}".`, ephemeral: true });	}
        const embed = new djs.EmbedBuilder()
            .setColor(global.config.color)
            .setTitle(`${team.name}`)
            .setURL(`https://ctftime.org/team/${team.id}/`)
            .addFields(
                { name: 'Team Name:', value: team.name, inline: true },
                { name: 'Team ID:', value: team.id, inline: true },
                { name: 'Members:', value: team.members.length ? team.members.join(', ') : '(NO MEMEBERS FOUND)', inline: true }
            );
        embed.addFields({
            name: 'Recent Events:',
            value: events.slice(0, 3).map(event => `${event.title}: ${event.points} points, placed ${event.place}`).join('\n') || 'No events to display',
        });
        embed.setFooter({ text: 'Need help? Visit our [GitHub](https://github.com/MitruStefan/ctf-sentinel)' });
        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        await interaction.reply({ content: 'ERROR: COULDN\'T FETCH TEAM INFO TEAM-INFO. (PLEASE TRY AGAIN LATER)', ephemeral: true });
    }
};

let teamIds = [];
const setteamsCommand = async interaction => {
    if (interaction.user.id !== global.config.ownerId) {	return interaction.reply({ content: 'ISSUE: ADMINISTRATOR PRIVILEGES NEEDED!!!', ephemeral: true });}
    const teamsInput = interaction.options.getString('teams');
    teamIds = teamsInput.split(',').map(t => t.trim());
    await interaction.reply({ content: `SUCCESS: TEAM IDs HAVE BEEN SET TO: ${teamIds.join(', ')}` });
};

const compareCommand = async interaction => {
    if (teamIds.length === 0) { return interaction.reply({ content: 'No teams have been set yet. Use /setteams to set the teams.', ephemeral: true });  }
    const teamData = [];
    for (const teamQuery of teamIds) {
        const team = await getTeam(teamQuery);
        if (!team) return interaction.reply({ content: `ISSUE: TEAM ${teamQuery} NOT FOUND`, ephemeral: true });
        const results = await getEventsByTeam(team.id);
        if (!results.length) return interaction.reply({ content: `ISSUE: NO EVENTS FOUND ${team.name}.`, ephemeral: true });
        const totalPoints = results.slice(0, 5).reduce((sum, event) => sum + parseInt(event.points.replace(' pts', ''), 10), 0);
        teamData.push({ name: team.name, totalPoints, results });
    }
    teamData.sort((a, b) => b.totalPoints - a.totalPoints);
    const embed = new djs.EmbedBuilder()
        .setColor(global.config.color)
        .setTitle(' ~~~# OUR CTF TEAMs COMPARISON BASED ON LAST 5 CTFs #~~~ ')
        .setDescription('Here is the scoreboard for the teams based on their latest CTF performance.');

    teamData.forEach((team, index) => {
        embed.addFields({
            name: `${index + 1}. ${team.name}`,
            value: `Total Points: ${team.totalPoints}\nResults: ${team.results.map(e => `${e.title}: ${e.points}`).join('\n')}`,
        });
    });
    await interaction.reply({ embeds: [embed] });
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
            if (!interaction.replied) {
                await interaction.reply({ content: 'ERROR: COULDN\'T PROCESS YOUR COMMANDS', ephemeral: true });
            }
        }
    }
});
client.login(settings.token);
