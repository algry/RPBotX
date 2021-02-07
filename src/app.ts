import * as Discord from "discord.js";
import * as config from "./config.json";
import ChannelHandler from "./ChannelHandler"

const intents = new Discord.Intents([
	Discord.Intents.NON_PRIVILEGED,
	"GUILD_MEMBERS"
]);
const client = new Discord.Client({
	ws: {intents}
});
const channels:Map<Discord.TextChannel,ChannelHandler> = new Map();

client.login(config.token);

client.on("ready", async ()=>{
	console.log("Ready");
	
	// await client.channels.fetch();
	// for (const channel of Array.from(client.channels.cache.values())) {
		// if (channel instanceof Discord.TextChannel) {
			// channels.set(<Discord.TextChannel>channel, new ChannelHandler(client, <Discord.TextChannel>channel))
		// }
	// }
});

client.on("message", async (message:Discord.Message)=>{
	if (message.author.bot || !message.guild) return;
	
	if (!channels.has(<Discord.TextChannel>message.channel)){
		const newHandler = new ChannelHandler(client, <Discord.TextChannel>message.channel);
		channels.set(<Discord.TextChannel>message.channel, newHandler);
		await newHandler.reloadOrder();
	}
	
	const handler = channels.get(<Discord.TextChannel>message.channel);
	if (handler) handler.handleMessage(message);
});