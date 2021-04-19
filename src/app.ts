import * as Discord from "discord.js";
import * as config from "./config.json";
import ChannelHandler from "./ChannelHandler"
import GuildHandler from "./GuildHandler"

const intents = new Discord.Intents([
	Discord.Intents.NON_PRIVILEGED,
	"GUILD_MEMBERS"
]);
const client = new Discord.Client({
	ws: {intents}
});
const guilds:Map<Discord.Guild,GuildHandler> = new Map();

client.login(config.token);

client.on("ready", async ()=>{
	console.log("Ready");

  // await client.channels.fetch();

	// await client.channels.fetch();
	// for (const channel of Array.from(client.channels.cache.values())) {
		// if (channel instanceof Discord.TextChannel) {
			// channels.set(<Discord.TextChannel>channel, new ChannelHandler(client, <Discord.TextChannel>channel))
		// }
	// }
});

client.on("message", async (message:Discord.Message)=>{
	if (message.author.bot || !message.guild) return;
	
	if (!guilds.has(message.guild)){
		const newHandler = new GuildHandler(client, message.guild);
		guilds.set(message.guild, newHandler);
		await newHandler.initialize();
	}
	
	const handler = guilds.get(message.guild);
	if (handler) handler.handleMessage(message);
});