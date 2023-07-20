<br/>
<p align="center">
  <h3 align="center">MettatonV3</h3>

  <p align="center">
    Hopefully a better version of the Mettaton music bot.
    <br/>
    <br/>
    <a href="https://github.com/SKOWisp/MettatonV3/issues">Report Bug</a>
    .
    <a href="https://github.com/SKOWisp/MettatonV3/issues">Request Feature</a>
  </p>
</p>



## Table Of Contents

* [Getting Started](#getting-started)
  * [Prerequisites](#prerequisites)
  * [Installation](#installation)
* [Contributing](#contributing)
* [License](#license)
* [Authors](#authors)
* [Acknowledgements](#acknowledgements)

## Getting Started

This bot was built using [discord.js](https://discord.js.org/), if you are having trouble setting up your bot, refer to this [guide](https://discordjs.guide/preparations/setting-up-a-bot-application.html). 

### Prerequisites

* [Node.js](https://nodejs.org)
* Bot token (see above).

### Installation

0. Create your bot on the discord developer portal and add it to a server by modifying and using the following link:

```
https://discord.com/api/oauth2/authorize?client_id= < discord id of the bot > &permissions=103885840&scope=bot%20applications.commands
```

Example: 

```
https://discord.com/api/oauth2/authorize?client_id=123456789101112131&permissions=103885840&scope=bot%20applications.commands
```


1. Clone the repo.

```sh
git clone https://github.com/SKOWisp/MettatonV3.git
```

2. Navigate to the newly created MettatonV3 folder and install the NPM packages.

```sh
npm install
```

3. Inside this folder, create a file named '.env' with the following information:

```
BOT_TOKEN= < your bot token >
CLIENT_ID= <discord id of the bot >
GUILD_ID= < discord id of the server where you'll add the bot >
MAX_SONGS= < max number of songs that can be added to the queue >
SEARCH_LIMIT= < search limit for the ytsr module >
TOLERANCE= < minutes of tolerance before auto-disconnecting >
DEGEN= < username of person you want to troll >
```
Example:
```
BOT_TOKEN=MTEzMTQ0MDY4MjczNzg2NDgwNw.GtafFR.4SV4PvdHiWZqzIZBIj5LfK3cGW1p68xIScPIPc
CLIENT_ID=123456789101112131
GUILD_ID=131211101987654321
MAX_SONGS=150
SEARCH_LIMIT=20
TOLERANCE=3
DEGEN=skowisp
```
4. Open a command prompt in the folder and run:
```sh
npm run build
npm run deploy
```
This will generate a folder called 'dist' in which you'll find a file called 'Bot.js'. Run this file to start the bot.

```sh
node dist/Bot.js
```
Done! Hop into a voice channel and use the /play command.

## License

Distributed under the MIT License. See [LICENSE](https://github.com/SKOWisp/MettatonV3/blob/main/LICENSE) for more information.

## Authors

* **Román T. Vidal Tamayo** - *Physics Student* - [GitHub](https://github.com/SKOWisp) - *Owner*
