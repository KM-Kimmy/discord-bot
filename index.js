import { Client, Events, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// โหลดการตั้งค่า Server
const CONFIG_FILE = './serverConfig.json';

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const data = fs.readFileSync(CONFIG_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('❌ Error loading config:', error);
    }
    return {};
}

function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('❌ Error saving config:', error);
    }
}

let serverConfig = loadConfig();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

client.on(Events.ClientReady, readyClient => {
    console.log(`Logged in as ${readyClient.user.tag}!`);
    console.log(`Serving ${readyClient.guilds.cache.size} servers`);
});

// 🎉 ต้อนรับสมาชิกใหม่
client.on(Events.GuildMemberAdd, async member => {
    try {
        // ดึงการตั้งค่าของ Server นี้
        const guildConfig = serverConfig[member.guild.id];
        if (!guildConfig || !guildConfig.welcomeChannelId) {
            console.log(`⚠️ No welcome channel set for ${member.guild.name}`);
            return;
        }

        const channel = member.guild.channels.cache.get(guildConfig.welcomeChannelId);
        if (!channel) {
            console.error(`❌ Welcome channel not found for ${member.guild.name}`);
            return;
        }

        const welcomeEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🎉 ยินดีต้อนรับสมาชิกใหม่!')
            .setDescription(`สวัสดี ${member}! ยินดีต้อนรับสู่ **${member.guild.name}**`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '👤 ชื่อผู้ใช้', value: member.user.tag, inline: true },
                { name: '🆔 User ID', value: member.id, inline: true },
                { name: '👥 สมาชิกคนที่', value: `${member.guild.memberCount}`, inline: true }
            )
            .setFooter({
                text: `เข้าร่วมเมื่อ`,
                iconURL: member.guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

        await channel.send({
            content: `🎊 ยินดีต้อนรับ ${member}!`,
            embeds: [welcomeEmbed]
        });

        console.log(`✅ [${member.guild.name}] ต้อนรับ ${member.user.tag} สำเร็จ!`);
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการต้อนรับสมาชิก:', error);
    }
});

// 👋 แจ้งเตือนเมื่อมีคนออกจากเซิร์ฟเวอร์
client.on(Events.GuildMemberRemove, async member => {
    try {
        // ดึงการตั้งค่าของ Server นี้
        const guildConfig = serverConfig[member.guild.id];
        if (!guildConfig || !guildConfig.welcomeChannelId) {
            return;
        }

        const channel = member.guild.channels.cache.get(guildConfig.welcomeChannelId);
        if (!channel) {
            return;
        }

        const leaveEmbed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('👋 มีสมาชิกออกจากเซิร์ฟเวอร์')
            .setDescription(`**${member.user.tag}** ได้ออกจาก **${member.guild.name}** แล้ว`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '👤 ชื่อผู้ใช้', value: member.user.tag, inline: true },
                { name: '🆔 User ID', value: member.id, inline: true },
                { name: '👥 สมาชิกคงเหลือ', value: `${member.guild.memberCount}`, inline: true }
            )
            .setFooter({
                text: `ออกเมื่อ`,
                iconURL: member.guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

        await channel.send({
            content: `😢 ลาก่อน **${member.user.tag}**`,
            embeds: [leaveEmbed]
        });

        console.log(`👋 [${member.guild.name}] ${member.user.tag} ออกจากเซิร์ฟเวอร์`);
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการแจ้งเตือนสมาชิกออก:', error);
    }
});

// คำสั่ง Slash Commands
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, guild, member } = interaction;

    // 🏓 Ping
    if (commandName === 'ping') {
        const latency = Date.now() - interaction.createdTimestamp;
        await interaction.reply(`🏓 Pong! (${latency}ms)`);
    }

    // ⚙️ Set Welcome Channel
    else if (commandName === 'setwelcome') {
        // ตรวจสอบสิทธิ์
        if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({
                content: '❌ คุณต้องมีสิทธิ์ "Manage Server" เพื่อใช้คำสั่งนี้',
                ephemeral: true
            });
        }

        const channel = options.getChannel('channel');

        // บันทึกการตั้งค่า
        if (!serverConfig[guild.id]) {
            serverConfig[guild.id] = {};
        }
        serverConfig[guild.id].welcomeChannelId = channel.id;
        saveConfig(serverConfig);

        const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('✅ ตั้งค่าสำเร็จ!')
            .setDescription(`ห้องต้อนรับถูกตั้งค่าเป็น ${channel}`)
            .addFields(
                { name: '🎉 เมื่อมีคนเข้า', value: 'บอทจะส่งข้อความต้อนรับที่นี่', inline: true },
                { name: '👋 เมื่อมีคนออก', value: 'บอทจะส่งข้อความแจ้งเตือนที่นี่', inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        console.log(`⚙️ [${guild.name}] Set welcome channel to #${channel.name}`);
    }

    // ❌ Remove Welcome Channel
    else if (commandName === 'removewelcome') {
        // ตรวจสอบสิทธิ์
        if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({
                content: '❌ คุณต้องมีสิทธิ์ "Manage Server" เพื่อใช้คำสั่งนี้',
                ephemeral: true
            });
        }

        if (serverConfig[guild.id]) {
            delete serverConfig[guild.id].welcomeChannelId;
            saveConfig(serverConfig);
        }

        await interaction.reply({
            content: '✅ ปิดการแจ้งเตือนสมาชิกเข้า/ออกแล้ว',
            ephemeral: true
        });
    }
});

client.login(process.env.TOKEN);