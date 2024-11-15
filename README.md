# CTF-Tracker.js

**CTF-Tracker.js** is a powerful Discord bot designed to provide real-time updates and insights into Capture The Flag (CTF) competitions. It integrates with [CTFTime](https://ctftime.org) to fetch and display information about upcoming CTF events, team rankings, and event results. The bot also allows admins to compare multiple teams based on their latest CTF performances.

### Features:
- **Upcoming CTF Events**: Displays a list of top upcoming CTF events on CTFTime, sortable by various criteria (e.g., start time, participants, duration).
- **Team Information**: Fetches detailed information about CTF teams, including country, national rank, and recent event performance.
- **Team Comparison**: Allows administrators to set up a comparison of multiple teams based on their latest 5 CTF event scores.
- **Command Support**: Provides several slash commands that make interaction simple and efficient.

### Slash Commands:
- `/help` - Displays the bot's help message.
- `/newctfs` - Lists the top upcoming CTF events on CTFTime. You can filter by count and sort them by different attributes (weight, start time, end time, etc.).
- `/teaminfo <teamid>` - Fetches detailed information about a team based on its name or ID.
- `/setteams <teams>` - Admin-only command to set a list of teams for comparison. (Comma-separated team IDs or names)
- `/compare` - Compares the pre-set teams based on their performance in the latest 5 CTF events.

### Requirements:
- **Node.js**: Version 16 or higher.
- **Dependencies**:
  - [discord.js](https://discord.js.org) - For interacting with the Discord API.
  - [dotenv](https://www.npmjs.com/package/dotenv) - For loading environment variables.
  - [node-fetch](https://www.npmjs.com/package/node-fetch) - For fetching data from external APIs.
  - [node-cache](https://www.npmjs.com/package/node-cache) - For caching API responses.

### Setup Instructions:
- You can install the bot directly into your Discord Server by using the following command: [Install on Discord](https://discord.com/oauth2/authorize?client_id=1305959271908900884&scope=bot&permissions=1926292950016)

1. Clone this repository to your local machine:
   ```bash
   git clone https://github.com/TheLeopard65/CTF-Tracker-BOT.git
   cd CTF-Tracker-BOT
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root of your project and set your Discord bot token:
   ```
   TOKEN=YOUR_DISCORD_BOT_TOKEN
   ```

4. Run the bot:
   ```bash
   npm start
   ```

5. Add your bot to your Discord server and enjoy tracking CTF events and teams!

### How It Works:
- **Fetching CTF Data**: The bot fetches data from CTFTime's public API to get details about upcoming CTF events, team scores, and rankings.
- **Caching**: To minimize redundant API calls and improve performance, the bot uses an in-memory cache (with a TTL of 24 hours) for storing event and team data.
- **Team Comparison**: Admins can compare the performance of multiple teams based on their most recent CTF results. The bot calculates the total points from their last 5 events.

### Example Usage:
- **Display upcoming CTF events**:
  `/newctfs count: 5 sort: start`
  
- **Get information about a team**:
  `/teaminfo teamid: "TheLeopard65"`

- **Compare multiple teams**:
  Admins can use the `/setteams` command to set a list of teams, followed by the `/compare` command to compare their performances.

### Contributing:
Feel free to fork the repository and submit issues or pull requests. If you encounter any bugs or have suggestions for new features, don't hesitate to open an issue on the [GitHub repository](https://github.com/TheLeopard65/CTF-Tracker-BOT/issues).

### License:
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

### Author:
[Leopard (@theleopard65)](https://github.com/TheLeopard65)

### Acknowledgments:
- [CTFTime](https://ctftime.org) for providing the API and data.
- [discord.js](https://discord.js.org) for their excellent library for building Discord bots.

### Links:
- [GitHub Repository](https://github.com/TheLeopard65/CTF-Tracker-BOT)
- [CTFTime](https://ctftime.org)
