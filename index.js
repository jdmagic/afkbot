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
console.time("timeElapsed")

var api = "";
var botid = "";

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
  else if (!message.includes("❈ Defense") && !message.includes("✎ Mana")  && !message.includes("⏣ Village") && !message.startsWith("Autopet equipped") && !message.includes("fell into the void.") && !message.includes("Teleport Pad to the")) {
    console.log(message);
  }
  if (message.includes("Your new API key is")) {
    api = message.split("Your new API key is ")[1].trim();
  }
  else if (message.startsWith("You died and your piggy bank cracked!") || message.includes("coins and your piggy bank broke!")) {
    mcbot.end();
    sendMessage(discordbot, ("<@" + process.env.DISCORD_USER_ID + ">, Bot closed due to piggy bank break detected"));
    setTimeout(() => {
      process.exit();
    }, 3000);
  }
  else if (message.startsWith('Finding player...')) {
    visitPlayer();
  }
  else if (message.startsWith("From ") || message.startsWith("To ") || message.startsWith("[SkyBlock]") || message.startsWith("[✌]")) {
    sendMessage(discordbot, message);
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
    sendMessage(discordbot, ("<@" + process.env.DISCORD_USER_ID + ">, Bot closed due to full inventory"));
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
  if ((message.author.id === process.env.DISCORD_USER_ID) && (message.channel.id === process.env.DISCORD_CHANNEL_ID)) {
    mcbot.chat(message.content);
  }
});

function checkStatus(mcbot) {
  setInterval(() => {
    var scoreboarddata = (mcbot.scoreboard.sidebar.items);
    var result = (scoreboarddata.find(item => item.value === 6));
    if ((JSON.stringify(mcbot.scoreboard.sidebar.items)).includes('text":"Your Isla')) {
      console.log('\x1b[32m%s\x1b[0m', "Already on island");
    }
    else {
      mcbot.chat("/locraw");
      sendMessage(discordbot, "Not on private island- relocating")
      console.log('\x1b[32m%s\x1b[0m', "Not on private island- relocating");
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
    console.timeLog("timeElapsed");
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

function sendMessage(discordbot, message) {
  discordbot.guilds.cache
    .get(process.env.DISCORD_SERVER_ID)
    .channels.cache.get(process.env.DISCORD_CHANNEL_ID)
    .send(message);
}

function visitPlayer () {
    setTimeout(() => {
      mcbot.simpleClick.leftMouse (11);
    }, 5000);
}

mcbot.on("kicked", (reason) => {
  console.log(reason);
  sendMessage( discordbot, ("<@" + process.env.DISCORD_USER_ID + ">, Kicked for reason: " + reason));
});

mcbot.on("error", (error) => {
  console.log(error);
  sendMessage(discordbot, error);
});
discordbot.login(
  process.env.DISCORD_BOT_TOKEN
);