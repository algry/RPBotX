import * as Discord from "discord.js";
import * as config from "./config.json";
import { promises as fsp } from "fs";
import {EOL} from "os";

export default class ChannelHandler
{
	channel:Discord.TextChannel;
	client:Discord.Client;
	
	memberOrder:Discord.GuildMember[];
	returnMember:number;
	currentMember:number;
	doReturn:boolean;
	
	constructor(client:Discord.Client, channel:Discord.TextChannel)
	{
		this.client = client;
		this.channel = channel;
		this.currentMember = 0;
	}
	
	async handleMessage(message:Discord.Message):Promise<void>
	{
		console.log(this.memberOrder.map(member=>member.id));
		console.log(this.memberOrder[this.currentMember].id);
		
		await message.guild.roles.fetch();
	
		const role = message.guild.roles.cache.find((role:Discord.Role)=>message.content.startsWith(role.name + ":"));
		
		if(role) {
			if(message.member.id !== this.memberOrder[this.currentMember].id) 
			{
				await message.channel.send("It is not currently your turn!");
				return;
			}
			const filepath = config.storyPath + message.guild.name + "/" + (message.channel as Discord.TextChannel).name + ".md"
			await fsp.appendFile(filepath, message.content + EOL + EOL);
			await message.channel.send(":white_check_mark:");
		}
		else if(message.content.startsWith("[")) {
			await message.channel.send("Tag not found **(error 100)**\nTry checking the character or narrator tag for typos!"); // Error 100
		}
		else if(message.content.startsWith("!done")) {
			if(message.member.id !== this.memberOrder[this.currentMember].id) 
			{
				await message.channel.send("It is not currently your turn!");
				return;
			}
			let nextMember = this.currentMember + 1;
			if(nextMember === this.memberOrder.length) nextMember = 0;
			
			getNextMember:if(message.mentions.members && message.mentions.members.size !== 0) {
				if (message.mentions.members.size > 1) {
					await message.channel.send("Reference overload **(error 300)**\nYou cannot pass the turn to more than one player!"); // Error 300
					return;
				}
				
				const referred = this.memberOrder.indexOf(message.mentions.members.first()); // Player who got passed to
				
				if (referred === -1) {
					await message.channel.send("Reference not found **(error 200)**\nYou cannot pass the turn to a non-participant!"); // Error 200
					return;
				}
				
				if (referred === this.currentMember) {
					await message.channel.send("Reference duplicate **(error 400)**\nYou cannot pass the turn to yourself!"); // Error 200
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
			}
			else {
				if(this.doReturn){
					this.doReturn = false;
					this.currentMember = this.returnMember;
				}
				else {
					this.currentMember = nextMember;
				}
			}
			
			await message.channel.send("The player is now <@" + this.memberOrder[this.currentMember] + ">'s\nThe turn order is: " +this.memberOrder.join(", ")) // + "\nThe continued order will be: " +this.memberOrder.join(", ")
		}
		else if(message.content.startsWith("!turn")) await message.channel.send("The turn is currently <@" + this.memberOrder[this.currentMember] + ">'s");
		else if(message.content.startsWith("!setPlayer")) {
			if(message.mentions.members && message.mentions.members.size === 1) {
				const member = this.memberOrder.indexOf(message.mentions.members.first());
				
				if (member === -1) {
					await message.channel.send("Reference not found **(error 201)**\nYou cannot give the turn to a non-participant!"); // Error 201
					return;
				}
				
				this.currentMember = member;
				
				await message.channel.send("Turn has been changed");
			}
			else {
				await message.channel.send("Reference not found **(error 301)**\nYou cannot give the turn to multiple players!"); // Error 301
			}
		}
	}
	
	async reloadOrder():Promise<void>
	{
		await this.channel.guild.members.fetch();
		const members = this.channel.guild.members.cache.filter((member:Discord.GuildMember)=>
		{
			return member.permissionsIn(this.channel).has("VIEW_CHANNEL") && !member.user.bot;
		});
		this.memberOrder = Array.from(members.values());
	}
}

// a -> d, d -> a, a -> d. b. c...
// a, b, c, d, e