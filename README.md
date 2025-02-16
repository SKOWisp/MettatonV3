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

## Getting Started

This bot was built using [discord.js](https://discord.js.org/), if you are having trouble setting up your bot, refer to this [guide](https://discordjs.guide/preparations/setting-up-a-bot-application.html). 

### Prerequisites

* [Node.js](https://nodejs.org). I use v22.12.0, but newer versions should work too.
* FFmpeg
* Bot token (see above).

### Installation

0. Create your bot on the discord developer portal and add it to a server by modifying and using the following link:

```
https://discord.com/api/oauth2/authorize?client_id=➡️BOT APPLICATION ID⬅️&permissions=137543216192&scope=bot%20applications.commands
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
BOT_TOKEN=➡️BOT TOKEN⬅️
CLIENT_ID=➡️BOT APPLICATION ID⬅️
GUILD_ID=➡️GUILD (SERVER) ID FOR BOT OWNER COMMANDS⬅️

# Default Settings
MAX_SONGS=150 # Song queue length limit
SEARCH_LIMIT=20 # Serch limit for ytsr 
TOLERANCE=180 # Seconds of tolerance before leaving empty vc

# Discord username to which /user will react differently.
DEGEN=➡️SEE /user COMMAND⬅️ 
```

4. Open a command prompt in the folder and run:
```sh
npm run build
npm run deploy
npm run database
```
This will generate a folder called `dist` in which you will find a file called `Bot.js`, as well as the `database.sqlite` file that will store the voice configuration for each server. To start the bot run:

```sh
node dist/Bot.js
```
Done! Hop into a voice channel and use the /play command.

## License

Distributed under the MIT License. See [LICENSE](https://github.com/SKOWisp/MettatonV3/blob/main/LICENSE) for more information.

## Authors

* **SKOWisp** - [GitHub](https://github.com/SKOWisp) - *Owner*
