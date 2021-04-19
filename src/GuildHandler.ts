import * as Discord from "discord.js";
import ChannelHandler from "./ChannelHandler";
import * as config from "./config.json";

export default class GuildHandler {
  client: Discord.Client;
  guild: Discord.Guild;

  channels: Map<Discord.TextChannel, ChannelHandler> = new Map();
  timelines: Discord.CategoryChannel;

  constructor(client: Discord.Client, guild: Discord.Guild) {
    this.client = client;
    this.guild = guild;
  }

  async initialize() {
    for (let channel of Array.from(this.guild.channels.cache.values())) {
      if (
        channel instanceof Discord.CategoryChannel &&
        channel.name.toLowerCase() === "timelines"
      ) {
        this.timelines = channel;
        break;
      }
    }
    // loop over children channels of the category
    // add them to the Channels map
    for (let timeline of Array.from(this.timelines.children.values())) {
      if (timeline instanceof Discord.TextChannel) {
        await this.addTimeline(timeline);
      }
    }
  }

  async addTimeline(timeline: Discord.TextChannel, gm?: Discord.GuildMember) {
    const handler = new ChannelHandler(this.client, timeline);

    this.channels.set(timeline, handler);
    await handler.initialize(gm);
  }

  async handleMessage(message: Discord.Message) {
    if (message.content.startsWith("!startTimeline")) {
      // Timeline Creation
      const command = message.content.split(" ");
      if (command.length !== 2) {
        message.channel.send(
          "Incorrect Argument Count **(error 201)**\nPlease check how you typed the command, check for typos and extra spaces!"
        ); // Error 201
        return;
      }

      const name = command[1];

      await this.addTimeline(
        await message.guild.channels.create(name, {
          reason: "Created by:" + message.author.username,
          permissionOverwrites: [
            {
              id: this.guild.roles.everyone,
              deny: [
                Discord.Permissions.FLAGS.VIEW_CHANNEL,
                Discord.Permissions.FLAGS.SEND_MESSAGES,
                Discord.Permissions.FLAGS.ATTACH_FILES
              ]
            }
          ],
          parent: this.timelines
        }),
        message.member
      );
    } else if (message.content.startsWith("!addPlayer")) {
      for (let channel of message.mentions.channels.values()) {
        this.channels.get(channel).addMembers(message.mentions.members);
      }
    } else {
      this.channels
        .get(message.channel as Discord.TextChannel)
        .handleMessage(message);
    }
  }
}
