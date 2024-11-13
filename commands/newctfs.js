const djs = require('discord.js');
const { getUpcomingEvents } = require('../API.js');

module.exports.interaction = async interaction => {
    await interaction.deferReply({ ephemeral: false });

    const limit = interaction.options.getInteger('limit') || 10;
    const sort = interaction.options.getString('sort') || 'weight';
    const show_description = interaction.options.getBoolean('show_description') === null ? true : interaction.options.getBoolean('show_description');
    const upcoming_events = await getUpcomingEvents();

    const events = upcoming_events
        .sort((a, b) => {
            if (sort === 'weight') {			return b.weight - a.weight;	}
            else if (sort === 'end') {			return new Date(a.finish) - new Date(b.finish);	}
            else if (sort === 'start') {		return new Date(a.start) - new Date(b.start);	}
            else if (sort === 'participants') {	return b.participants - a.participants;	}
            else if (sort === 'duration') {		return (new Date(a.finish) - new Date(a.start)) - (new Date(b.finish) - new Date(b.start));	}
            else {	return b.weight - a.weight;	}
        })
        .slice(0, limit);

    const embed = new djs.EmbedBuilder()
        .setColor(global.config.color)
        .setTitle(`~~~# TOP 10 UPCOMING CTFs ON CTFTIME.ORG #~~~`)
        .setURL(`https://ctftime.org/event/list/upcoming`)
        .setDescription('Here are the top 10 online upcoming CTFs on CTFTime.')
        .setThumbnail('attachment://flag.png');

    let characters = 0;
    for (let i = 0; i < events.length && characters + 1000 < 5500; i++) {
        const event = events[i];
        const startTime = new Date(event.start);
        const endTime = new Date(event.finish);

        const eventName = event.title.length > 40 ? `${event.title.slice(0, 37)}...` : event.title;
        const eventUrl = event.ctftime_url;
        const organizers = event.organizers.length ? event.organizers.join(', ') : 'Not listed';
        const ctfFormat = event.format || 'Not listed';
        const location = 'Online';
        const weight = event.weight;
        const numTeams = event.participants;
        const prizes = event.prizes.length ? event.prizes : 'No prizes listed';

        let value = `
        **${i + 1}. [${eventName}](${eventUrl})**
        - **START TIME**: <t:${Math.floor(startTime.getTime() / 1000)}:f>
        - **END TIME**: <t:${Math.floor(endTime.getTime() / 1000)}:f>
        - **ORGANIZORS**: ${organizers}
        - **CTF FORMAT**: ${ctfFormat}
        - **LOCATION**: ${location}
        - **CTF WEIGHT**: ${weight}
        - **TEAMS**: ${numTeams}
        - **PRIZES**: ${prizes}
        `;

        if (show_description && event.description) {	value += `\n\n**DESCRIPTION**:\n${event.description.length > 950 ? event.description.slice(0, 950) + '...' : event.description}`;	}
        embed.addFields({	name: '──────────★──────────', value: value,	});
        characters += value.length + 21;
    }
    await interaction.editReply({ embeds: [embed], files: [{ attachment: '../flag.png', name: 'flag.png' }] });
};

module.exports.application_command = () => {
    return new djs.SlashCommandBuilder()
        .setName('newctfs')
        .setDescription('Lists the top 10 online upcoming CTFs on CTFTime.')
        .addIntegerOption(option =>
            option
                .setName('limit')
                .setDescription('Number of upcoming events to display.')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(10)
        )
        .addStringOption(option =>
            option
                .setName('sort')
                .setDescription('Sort the events by a specific field.')
                .setRequired(false)
                .addChoices(
                    { name: 'Weight', value: 'weight' },
                    { name: 'End Time', value: 'end' },
                    { name: 'Start Time', value: 'start' },
                    { name: 'Participants', value: 'participants' },
                    { name: 'Duration', value: 'duration' }
                )
        )
        .addBooleanOption(option =>
            option.setName('show_description').setDescription('Show event description. Default: true').setRequired(false)
        );
};
