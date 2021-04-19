import * as Discord from "discord.js";
import * as config from "./config.json";
import { promises as fsp } from "fs";
import { EOL } from "os";

export default class ChannelHandler {
  channel: Discord.TextChannel;
  client: Discord.Client;

  gm: Discord.Role;
  spectator: Discord.Role;
  participant: Discord.Role;

  memberOrder: Discord.GuildMember[];
  returnMember: number;
  currentMember: number;
  doReturn: boolean;

  constructor(client: Discord.Client, channel: Discord.TextChannel) {
    this.client = client;
    this.channel = channel;
    this.currentMember = 0;
  }

  async handleMessage(message: Discord.Message): Promise<void> {
    if (!this.memberOrder) {
      this.generateTurnOrder();
    }

    await message.guild.roles.fetch();

    const role = message.guild.roles.cache.find((role: Discord.Role) =>
      message.content.startsWith(role.name + ":")
    );

    if (role) {
      if (message.member.id !== this.memberOrder[this.currentMember].id) {
        await message.channel.send("It is not currently your turn!");
        return;
      }
      const filepath =
        config.storyPath +
        message.guild.name +
        "/" +
        (message.channel as Discord.TextChannel).name +
        ".md";
      await fsp.appendFile(filepath, message.content + EOL + EOL);
      await message.channel.send(":white_check_mark:");
    } else if (message.content.startsWith("[")) {
      await message.channel.send(
        "Tag not found **(error 100)**\nTry checking the character or narrator tag for typos!"
      ); // Error 100
    }

    // '!' based commands begin
    else if (message.content.startsWith("!done")) {
      // !done
      if (message.member.id !== this.memberOrder[this.currentMember].id) {
        await message.channel.send("It is not currently your turn!");
        return;
      }
      let nextMember = this.currentMember + 1;
      if (nextMember === this.memberOrder.length) nextMember = 0;

      getNextMember: if (
        message.mentions.members &&
        message.mentions.members.size !== 0
      ) {
        if (message.mentions.members.size > 1) {
          await message.channel.send(
            "Reference overload **(error 300)**\nYou cannot pass the turn to more than one player!"
          ); // Error 300
          return;
        }

        const referred = this.memberOrder.indexOf(
          message.mentions.members.first()
        ); // Player who got passed to

        if (referred === -1) {
          await message.channel.send(
            "Reference not found **(error 200)**\nYou cannot pass the turn to a non-participant!"
          ); // Error 200
          return;
        }

        if (referred === this.currentMember) {
          await message.channel.send(
            "Reference duplicate **(error 400)**\nYou cannot pass the turn to yourself!"
          ); // Error 200
          return;
        }

        if (!this.doReturn) {
          if (referred === nextMember) {
            this.currentMember = referred;
            break getNextMember;
          }

          this.doReturn = true;
          this.returnMember = this.currentMember;
        }

        this.currentMember = referred;
      } else {
        if (this.doReturn) {
          this.doReturn = false;
          this.currentMember = this.returnMember;
        } else {
          this.currentMember = nextMember;
        }
      }

      await message.channel.send(
        "The player is now <@" +
          this.memberOrder[this.currentMember] +
          ">'s\nThe turn order is: " +
          this.memberOrder.join(", ")
      ); // + "\nThe continued order will be: " +this.memberOrder.join(", ")
    } else if (message.content.startsWith("!turn"))
      await message.channel.send(
        "The turn is currently <@" +
          this.memberOrder[this.currentMember] +
          ">'s"
      );
    else if (
      message.content.startsWith("!setPlayer") &&
      this.isGM(message.member)
    ) {
      // !setPlayer
      if (message.mentions.members && message.mentions.members.size === 1) {
        const member = this.memberOrder.indexOf(
          message.mentions.members.first()
        );

        if (member === -1) {
          await message.channel.send(
            "Reference not found **(error 101)**\nYou cannot give the turn to a non-participant!"
          ); // Error 201
          return;
        }

        this.currentMember = member;

        await message.channel.send("Turn has been changed");
      } else {
        await message.channel.send(
          "Reference not found **(error 102)**\nYou cannot give the turn to multiple players!"
        ); // Error 301
      }
    } else if (message.content.startsWith("!exclude")) {
      // !exclude
      for (let member of message.mentions.members.values()) {
        await member.roles.add(this.spectator);
        await member.roles.remove(this.participant);
      }
      this.generateTurnOrder();
    } else if (message.content.startsWith("!include")) {
      // !include
      for (let member of message.mentions.members.values()) {
        await member.roles.add(this.participant);
        await member.roles.remove(this.spectator);
      }
      this.generateTurnOrder();
    }
    else if (message.content.startsWith("!reOrder") && this.isGM(message.member)) {
      this.generateTurnOrder();
    }
  }

  isParticipant(member: Discord.GuildMember): boolean {
    return member.roles.cache.has(this.participant.id);
  }

  isGM(member: Discord.GuildMember): boolean {
    return member.roles.cache.has(this.gm.id);
  }

  async initialize(gm?: Discord.GuildMember) {
    await this.channel.guild.roles.fetch();

    const roles = Array.from(this.channel.guild.roles.cache.values());

    this.participant = roles.find(
      (role) => role.name === this.channel.name + " participant"
    );
    console.log(this.participant);
    if (!this.participant) {
      this.participant = await this.channel.guild.roles.create({
        data: {
          name: this.channel.name + " participant",
          color: "BLACK",
        },
      });
    }

    this.spectator = roles.find(
      (role) => role.name === this.channel.name + " spectator"
    );
    if (!this.spectator) {
      this.spectator = await this.channel.guild.roles.create({
        data: {
          name: this.channel.name + " spectator",
          color: "BLACK",
        },
      });
      console.log(this.spectator.id);
    }

    this.gm = roles.find((role) => role.name === this.channel.name + " GM");
    if (!this.gm) {
      this.gm = await this.channel.guild.roles.create({
        data: {
          name: this.channel.name + " GM",
          color: "BLACK",
        },
      });
      console.log(this.gm.id);
    }

    if (gm) {
      gm.roles.add(this.gm);
      gm.roles.add(this.participant);
    }

    this.channel.overwritePermissions([
      {
        id: this.channel.guild.roles.everyone,
        deny: [
          Discord.Permissions.FLAGS.VIEW_CHANNEL,
          Discord.Permissions.FLAGS.SEND_MESSAGES,
          Discord.Permissions.FLAGS.ATTACH_FILES,
        ],
      },
      {
        id: this.participant,
        allow: [
          Discord.Permissions.FLAGS.VIEW_CHANNEL,
          Discord.Permissions.FLAGS.SEND_MESSAGES,
        ],
      },
      {
        id: this.spectator,
        allow: [
          Discord.Permissions.FLAGS.VIEW_CHANNEL,
          Discord.Permissions.FLAGS.SEND_MESSAGES,
        ],
      },
      {
        id: this.gm,
        allow: [
          Discord.Permissions.FLAGS.VIEW_CHANNEL,
          Discord.Permissions.FLAGS.SEND_MESSAGES,
          Discord.Permissions.FLAGS.ATTACH_FILES,
        ],
      },
    ]);

    this.generateTurnOrder();
  }

  async addMembers(members: Discord.Collection<string, Discord.GuildMember>) {
    for (let member of members.values()) {
      member.roles.add(this.participant);
    }
  }

  async generateTurnOrder(): Promise<void> {
    await this.channel.guild.members.fetch();

    this.memberOrder = Array.from(this.participant.members.values());
    this.currentMember = 0;
  }
}