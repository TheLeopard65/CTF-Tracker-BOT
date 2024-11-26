# CTF-Tracker-BOT

CTF-Tracker-BOT is a powerful Discord bot designed to provide real-time updates and insights into Capture The Flag (CTF) events. The bot fetches data from [CTFtime.org](https://ctftime.org) and allows users to track upcoming CTF events, view detailed team information, and compare multiple teams based on their performance in past CTF competitions. It can also help administrators set up teams for easy comparison.

### Features
- **Upcoming CTF Events**: Displays the top upcoming CTF events, sortable by different criteria such as weight, start time, and participants.
- **Team Information**: Retrieves detailed information about any CTF team (name, rank, country, recent event performance).
- **Team Comparison**: Allows comparing teams' scores across their most recent 5 CTF events.
- **Administrator Tools**: Set teams for comparison with specific commands accessible to admins.

### Commands
- `/help`: Displays a list of available bot commands and their descriptions.
- `/newctfs`: Lists the top upcoming CTF events from CTFtime.org.
- `/teaminfo`: Fetches detailed information about a specific team by name or ID.
- `/setteams`: Admin command to set teams for comparison. (ADMINISTRATOR-ONLY)
- `/compare`: Compares multiple teams' performances across their latest CTF events.

### Requirements
- Node.js (v16 or higher)
- `discord.js` v14.16.3 or higher
- `node-fetch`
- `dotenv`
- A valid CTFtime.org API key (set in `.env`)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/TheLeopard65/CTF-Tracker-BOT.git
   cd CTF-Tracker-BOT
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root of the project with your Discord bot token:
   ```env
   TOKEN=your_discord_bot_token
   ```

4. Run the bot:
   ```bash
   npm start
   ```
---

### Configuration
- The bot uses the `dotenv` package to load configuration from a `.env` file. Make sure to set your bot token there.
- Additional configuration options like color and timezone are set in the `CTF-Tracker.js` file. You can modify these settings as needed.

### License
MIT License - See [LICENSE](LICENSE) for more details.

### Bugs and Issues
If you encounter any issues, please open an issue on the [GitHub repository](https://github.com/TheLeopard65/CTF-Tracker-BOT/issues).

---

For more information, visit the [GitHub page](https://github.com/TheLeopard65/CTF-Tracker-BOT).
