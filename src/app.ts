import * as Discord from "discord.js";
import * as config from "./config.json";
import { promises as fsp } from "fs";

const client = new Discord.Client();

client.login(config.token);

client.on("ready", async ()=>{
	console.log("Ready");
});

client.on("message", async (message:Discord.Message)=>{
	if (message.author.bot || !message.guild) return;
	
	await message.guild.roles.fetch();
	
	const role = message.guild.roles.cache.find((role:Discord.Role)=>message.content.startsWith(role.name + ":"));
	
	if(role) {
		const filepath = config.storyPath + message.guild.name + "/" + (message.channel as Discord.TextChannel).name + ".md"
		await fsp.appendFile(filepath, message.content + "\r\n\r\n");
		message.channel.send(":white_check_mark:");
	}
	else if(message.content.startsWith("[")) {
		message.channel.send("Currently Undefined Error (err 001)"); // Make proper error message
	}
});