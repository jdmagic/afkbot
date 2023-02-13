const fs = require("fs");
const fetch = require("node-fetch");
const { Client, GatewayIntentBits, ActivityType } = require("discord.js");
const discordbot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});
const mineflayer = require("mineflayer");
const mineflayerViewer = require("prismarine-viewer").mineflayer;
require('dotenv-safe').config();

var api = "";
var botid = "";
var visited = false;

var mcbot = mineflayer.createBot({
  version: "1.8.9",
  username: process.env.MICROSOFT_EMAIL,
  password: process.env.MICROSOFT_PASSWORD,
  auth: "microsoft",
  host: "hypixel.net",
  port: 25565,
  hideErrors: true,
});

mcbot.once("login", () => {
  console.log(`logged in as ${mcbot.username}`);
  discordbot.user.setActivity({
    name: 'Hypixel',
    type: ActivityType.Playing,
  });
  discordbot.user.setStatus('online');

  if (process.env.USE_PRISMARINE_VIEWER === "TRUE") {
    mineflayerViewer(mcbot, { port: process.env.PRISMARINE_VIEWER_PORT });
  }
  else console.log("Prismarine viewer disabled, skipping startup");

  try {
    fetch(`https://api.mojang.com/users/profiles/minecraft/${mcbot.username}`)
      .then((res) => res.json())
      .then((json) => {
        botid = json.id;
        checkStatus(mcbot);
        checkOnline(mcbot, discordbot);
      });
  } catch (e) {
    console.log(e);
  }
  setTimeout(() => {
    // var scoreboarddata = (mcbot.scoreboard.sidebar.items);
    // console.log(scoreboarddata);
    // var result= (scoreboarddata.find(item => item.value === 6));
    // console.log(result.displayName);
    mcbot.chat("/api new");
    mcbot.setQuickBarSlot("0");
    setTimeout(() => {
      mcbot.chat("/locraw")
    }, 5000);
  }, 5000);
});



mcbot.on("messagestr", (message) => {
  if (message.startsWith('{"server":"')) {
    ensureLocation(mcbot, discordbot, message)
  }
  else if (!message.includes("✎ Mana") && !message.startsWith("Autopet equipped")) {
    console.log(message);
  }
  if (message.includes("Your new API key is")) {
    api = message.split("Your new API key is ")[1].trim();
  }
  else if (message.startsWith("From ") || message.startsWith("To ") || message.startsWith("[SkyBlock]") || message.startsWith("[✌]")) {
    discordbot.guilds.cache
      .get(process.env.DISCORD_SERVER_ID)
      .channels.cache.get(process.env.DISCORD_CHANNEL_ID)
      .send(message);
  }
  else if (message.includes("Limbo") || message.includes("/limbo")) {
    setTimeout(() => {
      mcbot.chat("/hub");
    }, 10000);
  }
  else if (message.includes("Evacuating to Hub")) {
    setTimeout(() => {
      mcbot.chat("/is");
    }, 10000);
  }
  else if (message.includes("Your inventory is full")) {
    mcbot.end();
    discordbot.guilds.cache
      .get(process.env.DISCORD_SERVER_ID)
      .channels.cache.get(process.env.DISCORD_CHANNEL_ID)
      .send("<@" + process.env.DISCORD_USER_ID + ">, Bot closed due to full inventory");
    setTimeout(() => {
      process.exit();
    }, 3000);
  }
});

discordbot.on("ready", () => {
  console.log(
    `Logged in as ${discordbot.user.username}#${discordbot.user.discriminator}`
  );
});

discordbot.on("messageCreate", (message) => {
  if (message.author.id === process.env.DISCORD_USER_ID && mcbot) {
    mcbot.chat(message.content);
  }
});

function checkStatus(mcbot) {
  setInterval(() => {
    var scoreboarddata = (mcbot.scoreboard.sidebar.items);
    var result = (scoreboarddata.find(item => item.value === 6));
    if (((JSON.stringify(result.displayName)).includes('"text":"Your Isla')) || ((JSON.stringify(result.displayName)).includes('"text":"✌'))) {
      console.log('\x1b[32m%s\x1b[0m', "Detected already on island");
    }
    else {
      mcbot.chat("/locraw");
    }
  }, 90000);
}

function checkOnline(mcbot, discordbot) {
  setInterval(() => {
    try {
      fetch(`https://api.hypixel.net/status?key=${api}&uuid=${botid}`)
        .then((res) => res.json())
        .then((json) => {
          console.log(json);
          if (!json.session.online) {
            discordbot.user.setActivity({
              name: 'offline',
              type: ActivityType.Playing,
            });
            discordbot.user.setStatus('idle');
            mcbot = mineflayer.createBot({
              version: "1.8.9",
              username: process.env.MICROSOFT_EMAIL,
              password: process.env.MICROSOFT_PASSWORD,
              auth: "microsoft",
              host: "hypixel.net",
              port: 25565,
            });
          }
          if (json.session.online) {
            discordbot.user.setActivity({
              name: 'Hypixel',
              type: ActivityType.Playing,
            });
            discordbot.user.setStatus('online');
          }
        });
    } catch (e) {
      console.log(e);
    }
  }, 900000);
}


function ensureLocation(mcbot, discordbot, message) {
  var location = JSON.parse(message)
  console.log(location);
  if (location.gametype == "SKYBLOCK" && location.map == "Private Island") {
    return;
  }
  else if (location.gametype == "SKYBLOCK" && location.map != "Private Island") {
    setTimeout(() => {
      mcbot.chat("/is")
      mcbot.setQuickBarSlot("0");
    }, 3000);
  }
  else if (location.server == "limbo") {
    setTimeout(() => {
      mcbot.chat("/l ptl");
      setTimeout(() => {
        mcbot.chat("/skyblock");
        setTimeout(() => {
          mcbot.chat("/is");
          mcbot.setQuickBarSlot("0");
        }, 10000);
      }, 10000);
    }, 3000);
  }
  else if (location.gametype != "SKYBLOCK") {
    setTimeout(() => {
      mcbot.chat("/skyblock");
      setTimeout(() => {
        mcbot.chat("/is");
        mcbot.setQuickBarSlot("0");
      }, 10000);
    }, 3000);
  }
};


mcbot.on("windowOpen", (window) => {
  if (window.title.includes("Visit"))
    setTimeout(() => {
      mcbot.clickWindow(11, 0, 0);
    }, 3000);
});

mcbot.on("kicked", (reason) => {
  console.log(reason);
  discordbot.guilds.cache
    .get(process.env.DISCORD_SERVER_ID)
    .channels.cache.get(process.env.DISCORD_CHANNEL_ID)
    .send("<@" + process.env.DISCORD_USER_ID + ">, Kicked for reason: " + reason);
});

mcbot.on("error", (error) => {
  console.log(error);
  discordbot.guilds.cache
    .get(process.env.DISCORD_SERVER_ID)
    .channels.cache.get(process.env.DISCORD_CHANNEL_ID)
    .send(error);
});
discordbot.login(
  process.env.DISCORD_BOT_TOKEN
);