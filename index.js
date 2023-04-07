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
require("dotenv-safe").config();
console.time("timeElapsed");
let deaths = 0;
var purse;
var api = "";
var botid = "";
var selling = false;
var windowid;
var coins = 0;

var mcbot = mineflayer.createBot({
  version: "1.8.9",
  username: process.env.MICROSOFT_EMAIL,
  auth: "microsoft",
  host: "hypixel.net",
  port: 25565,
  hideErrors: true,
});

mcbot.once("login", () => {
  console.log(`logged in as ${mcbot.username}`);
  discordbot.user.setActivity({
    name: "Hypixel",
    type: ActivityType.Playing,
  });
  discordbot.user.setStatus("online");
  runtimer(mcbot, discordbot);

  if (process.env.USE_PRISMARINE_VIEWER === "TRUE") {
    mineflayerViewer(mcbot, { port: process.env.PRISMARINE_VIEWER_PORT });
  } else console.log("Prismarine viewer disabled, skipping startup");

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
      mcbot.chat("/locraw");
    }, 5000);
  }, 5000);
});

mcbot.on("messagestr", (message) => {
  if (message.startsWith('{"server":"')) {
    if (!selling) {
      ensureLocation(mcbot, discordbot, message);
    }
  } else if (
    !message.includes("❈ Defense") &&
    !message.includes("✎ Mana") &&
    !message.includes("⏣ Village") &&
    !message.startsWith("Autopet equipped") &&
    !message.includes("fell into the void.") &&
    !message.includes("Teleport Pad to the")
  ) {
    console.log(message);
  }
  if (message.includes("Your new API key is")) {
    api = message.split("Your new API key is ")[1].trim();
  } else if (
    message.startsWith("You died and your piggy bank cracked!") ||
    message.includes("coins and your piggy bank broke!")
  ) {
    mcbot.end();
    sendMessage(
      discordbot,
      "<@" +
        process.env.DISCORD_USER_ID +
        ">, Bot closed due to piggy bank break detected"
    );
    setTimeout(() => {
      process.exit();
    }, 3000);
  } else if (message.startsWith("Finding player...")) {
    visitPlayer();
  } else if (
    message.startsWith("From ") ||
    message.startsWith("To ") ||
    message.startsWith("[SkyBlock]") ||
    message.startsWith("[✌]")
  ) {
    sendMessage(discordbot, message);
  } else if (message.includes("Limbo") || message.includes("/limbo")) {
    setTimeout(() => {
      mcbot.chat("/hub");
    }, 10000);
  } else if (message.includes("Evacuating to Hub")) {
    setTimeout(() => {
      if (!selling) {
        mcbot.chat("/is");
      }
    }, 10000);
  } else if (message.includes("Your inventory is full")) {
    sendMessage(
      discordbot,
      "<@" + process.env.DISCORD_USER_ID + ">, Full inventory detected"
    );
  } else if (
    message.includes(
      "You already have the maximum amount of Coins in your bank!"
    )
  ) {
    sendMessage(
      discordbot,
      "<@" + process.env.DISCORD_USER_ID + ">, Full bank detected"
    );
  } else if (message.includes("fell into the void.")) {
    if (deaths === 0) {
      deathCount(mcbot, discordbot);
      setTimeout(() => {
        mcbot.chat("/deathcount");
      }, 1000);
    } else {
      deaths++;
      console.log(deaths);
      discordbot.user.setActivity(`Deaths: ${deaths}`);
    }
  } else if (message.includes("sold") && message.includes("Coins")) {
    var add = message.split("for ")[1].split(" Coins")[0].replace(",", "");
    console.log(add);
    coins = coins + add;
  } else if (message.startsWith("[Bazaar]") && message.includes("coins")) {
    setTimeout(() => {
      mcbot.chat("/l");
      setTimeout(() => {
        mcbot.chat("/skyblock");
        setTimeout(() => {
          startBank(mcbot, discordbot);
        }, 3000);
      }, 3000);
    }, 3000);
    // sendMessage(discordbot, `Sold sulphur items for ${coins} coins`);
    // sendMessage(
    //   discordbot,
    //   `Sold slime items for ${
    //     message.split("Enchanted Slimeball for ")[1].split(" coins")[0]
    //   } coins`
    // );
  } else if (message.includes("Deposited") && message.includes("the account")) {
    selling = false;
    sendMessage(discordbot, message);
    setTimeout(() => {
      process.exit(1);
    }, 500);
  }
});

discordbot.on("ready", () => {
  console.log(
    `Logged in as ${discordbot.user.username}#${discordbot.user.discriminator}`
  );
});

discordbot.on("messageCreate", (message) => {
  if (
    message.author.id === process.env.DISCORD_USER_ID &&
    message.channel.id === process.env.DISCORD_CHANNEL_ID
  ) {
    mcbot.chat(message.content);
    selling = true;
    doTrades(mcbot, discordbot);
  }
});

function startBank(mcbot, discordbot) {
  console.log("starting");
  mcbot.setQuickBarSlot("1");
  mcbot.activateItem();
  handleBank(mcbot, discordbot);
}

function handleBank(mcbot, discordbot) {
  let i;
  mcbot.on("windowOpen", (window) => {
    if (window.title.includes("Bank")) {
      console.log("bank menu opened");
      i++;
      console.log(i);
      setTimeout(() => {
        mcbot.clickWindow(11, 0, 0, (err) => {
          console.log(err);
          setTimeout(() => {
            window.close(window.id);
            console.log("successfully sold items and deposited coins");
          }, 1000);
        });
      }, 2000);
    }
  });
}

function doTrades(mcbot, discordbot) {
  selling = true;

  mcbot.chat("/l");
  setTimeout(() => {
    mcbot.chat("/skyblock");
    setTimeout(() => {
      mcbot.chat("/hub");
      setTimeout(() => {
        console.log("opening trades menu");
        mcbot.chat("/trades");
        mcbot.on("windowOpen", (window) => {
          if (
            window.type === "minecraft:chest" &&
            window.title.includes("Trades")
          ) {
            windowid = window.id;
            console.log("---Trades menu opened successfully---");
            const sulfurItems = [{ name: "glowstone_dust" }, { name: "skull" }];
            let slots = [];
            window.items().forEach((item) => {
              sulfurItems.forEach((sulfurItem) => {
                if (item.name === sulfurItem.name) {
                  slots.push(item.slot);
                }
              });
            });
            if (slots.length === 0) {
              bzsell(mcbot, discordbot);
            } else {
              let slotIndex = 1;
              slots.forEach((slot) => {
                let localSlotIndex = slotIndex;
                setTimeout(() => {
                  mcbot.clickWindow(slot, 0, 0, (err) => {
                    if (err) {
                      console.log(err);
                    } else {
                      console.log("sulfur sold successfully");
                    }
                  });
                  if (localSlotIndex == slots.length) {
                    bzsell(mcbot, discordbot);
                  }
                }, 1000 * slotIndex);
                slotIndex++;
              });
            }
          }
        });
      }, 5000);
    }, 3000);
  }, 3000);
}
function bzsell(mcbot, discordbot) {
  setTimeout(() => {
    mcbot.closeWindow(windowid);
    console.log("window closed");

    setTimeout(() => {
      mcbot.chat("/bz");
      mcbot.on("windowOpen", (window) => {
        if (window.title.includes("Bazaar")) {
          windowid = window.id;
          console.log("---Bazaar menu opened successfully---");
          confirmsell(mcbot, discordbot);
          mcbot.clickWindow(48, 0, 0, (err) => {
            if (err) {
              console.log(err);
            } else {
              console.log("opened sell sacks menu");
            }
          });
        }
      });
    }, 1000);
  }, 100);
}

function confirmsell(mcbot, discordbot) {
  mcbot.on("windowOpen", (window) => {
    if (window.title.includes("sure?")) {
      windowid = window.id;
      console.log("confirm sell menu opened");
      setTimeout(() => {
        mcbot.clickWindow(11, 0, 0, (err) => {
          if (err) {
            console.log(err);
          } else {
            console.log("sell confirmed");
          }
        });
      }, 500);
      // console.log(window);
    }
  });
}
// Send messages with delays
// mcbot.chat("/l");
// setTimeout(() => {
//   mcbot.chat("/skyblock"),
//     setTimeout(() => {
//       mcbot.chat("/hub");
//       setTimeout(() => {
//         mcbot.chat("/trades");
//         mcbot.on("windowOpen", (window) => {
//           console.log("opened");
//           console.log(window.title);
//           if (window.title.txt === "Trades") {
//             console.log("trades menu");
//             const sulphurItems = mcbot.inventory
//               .items()
//               .filter((item) =>
//                 [
//                   "Sulphur",
//                   "Enchanted Sulphur",
//                   "Enchanted Sulphur Cube",
//                 ].includes(item.name)
//               );
//             sulphurItems.forEach((item) => {
//               mcbot.clickWindow(item.slot, 0, 0);
//               setTimeout(() => {}, 100);
//             });
//             mcbot.clickWindow(0, 0, 0);
//             mcbot.closeWindow(window);
//             selling = false;
//           }
//         });
//       }, 2000);
//     }, 2000);
// }, 3000);

// // Wait for Trades menu to open and click specified items
// // Wait and perform clicks in inventory
// setTimeout(() => {
//   mcbot.chat("/bz");
//   setTimeout(() => {
//     mcbot.clickWindow(12, 0, 0); // Click on the cauldron
//     setTimeout(() => {}, 100);
//     mcbot.clickWindow(38, 0, 0); // Click on the hopper
//     mcbot.closeWindow(mcbot.currentWindow);
//     selling = false;
//   }, 3000);
// }, 12000);
//}

function checkStatus(mcbot) {
  setInterval(() => {
    if (
      JSON.stringify(mcbot.scoreboard.sidebar.items).includes(
        'text":"Your Isla'
      )
    ) {
      console.log("\x1b[32m%s\x1b[0m", "Already on island");
    } else {
      mcbot.chat("/locraw");
      if (!selling) {
        sendMessage(discordbot, "Not on private island- relocating");
        console.log("\x1b[32m%s\x1b[0m", "Not on private island- relocating");
      } else if (selling) {
        sendMessage(
          discordbot,
          "Not on private island- currently selling items"
        );
        console.log(
          "\x1b[32m%s\x1b[0m",
          "Not on private island- currently selling items"
        );
      }
    }
  }, 10000);
}

function checkOnline(mcbot, discordbot) {
  setInterval(() => {
    try {
      fetch(`https://api.hypixel.net/status?key=${api}&uuid=${botid}`)
        .then((res) => res.json())
        .then((json) => {
          // console.log(json);
          if (!json.session.online) {
            discordbot.user.setActivity({
              name: "offline",
              type: ActivityType.Playing,
            });
            discordbot.user.setStatus("idle");
            mcbot = mineflayer.createBot({
              version: "1.8.9",
              username: process.env.MICROSOFT_EMAIL,
              auth: "microsoft",
              host: "hypixel.net",
              port: 25565,
            });
          }
        });
    } catch (e) {
      console.log(e);
    }
    console.timeLog("timeElapsed");
  }, 10000);
}

function ensureLocation(mcbot, discordbot, message) {
  if (selling === false) {
    var location = JSON.parse(message);
    console.log(location);
    if (location.gametype == "SKYBLOCK" && location.map == "Private Island") {
      return;
    } else if (
      location.gametype == "SKYBLOCK" &&
      location.map != "Private Island" &&
      selling == false
    ) {
      setTimeout(() => {
        if (!selling) {
          mcbot.chat("/is");
        }
        mcbot.setQuickBarSlot("0");
      }, 3000);
    } else if (location.server == "limbo" && selling == false) {
      setTimeout(() => {
        mcbot.chat("/l ptl");
        setTimeout(() => {
          mcbot.chat("/skyblock");
          setTimeout(() => {
            if (!selling) {
              mcbot.chat("/is");
            }
            mcbot.setQuickBarSlot("0");
          }, 10000);
        }, 10000);
      }, 3000);
    } else if (location.gametype != "SKYBLOCK" && selling == false) {
      setTimeout(() => {
        mcbot.chat("/skyblock");
        setTimeout(() => {
          if (!selling) {
            mcbot.chat("/is");
          }
          mcbot.setQuickBarSlot("0");
        }, 10000);
      }, 3000);
    }
  }
}

function deathCount(mcbot, discordbot) {
  const deathregex = /^[a-zA-Z]+:\s*\d+$/;
  mcbot.on("messagestr", (message) => {
    if (deathregex.test(message) && message.includes(`${mcbot.username}:`)) {
      deaths = message.split(`${mcbot.username}: `)[1].trim();
    }
  });
}

function sendMessage(discordbot, message) {
  discordbot.guilds.cache
    .get(process.env.DISCORD_SERVER_ID)
    .channels.cache.get(process.env.DISCORD_CHANNEL_ID)
    .send(message);
}

function visitPlayer() {
  setTimeout(() => {
    mcbot.simpleClick.leftMouse(11);
  }, 5000);
}

function runAtMidnight(mcbot, discordbot) {
  // Get the current date/time in the user's timezone
  const now = new Date();

  // Get the current date/time in Eastern Standard Time (EST)
  const estTime = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" })
  );

  // Check if it's currently midnight EST
  if (estTime.getHours() === 0 && estTime.getMinutes() === 0) {
    // Call your function here
    doTrades(mcbot, discordbot);
  }
}

// Call the function every minute to check if it's midnight EST
function runtimer(mcbot, discordbot) {
  setInterval(() => {
    runAtMidnight(mcbot, discordbot);
  }, 60 * 1000);
}

mcbot.on("kicked", (reason) => {
  console.log(reason);
  sendMessage(
    discordbot,
    "<@" + process.env.DISCORD_USER_ID + ">, Kicked for reason: " + reason
  );
});

mcbot.on("error", (error) => {
  console.log(error);
  sendMessage(discordbot, error);
});
discordbot.login(process.env.DISCORD_BOT_TOKEN);
