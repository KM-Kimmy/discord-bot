import { Client, Events, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers  // จำเป็นสำหรับการตรวจจับสมาชิกใหม่
    ]
});

client.on(Events.ClientReady, readyClient => {
    console.log(`Logged in as ${readyClient.user.tag}!`);
});

// 🎉 ต้อนรับสมาชิกใหม่
client.on(Events.GuildMemberAdd, async member => {
    try {
        const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;
        const channel = member.guild.channels.cache.get(welcomeChannelId);

        if (!channel) {
            console.error('❌ ไม่พบห้องต้อนรับ! กรุณาตรวจสอบ WELCOME_CHANNEL_ID ใน .env');
            return;
        }

        // สร้าง Embed สวยงาม
        const welcomeEmbed = new EmbedBuilder()
            .setColor(0x5865F2) // สี Discord Blurple
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

        console.log(`✅ ต้อนรับ ${member.user.tag} สำเร็จ!`);
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการต้อนรับสมาชิก:', error);
    }
});

// 👋 แจ้งเตือนเมื่อมีคนออกจากเซิร์ฟเวอร์
client.on(Events.GuildMemberRemove, async member => {
    try {
        const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;
        const channel = member.guild.channels.cache.get(welcomeChannelId);

        if (!channel) {
            console.error('❌ ไม่พบห้องแจ้งเตือน! กรุณาตรวจสอบ WELCOME_CHANNEL_ID ใน .env');
            return;
        }

        // สร้าง Embed สำหรับแจ้งออก
        const leaveEmbed = new EmbedBuilder()
            .setColor(0xED4245) // สีแดง
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

        console.log(`👋 ${member.user.tag} ออกจากเซิร์ฟเวอร์`);
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการแจ้งเตือนสมาชิกออก:', error);
    }
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ping') {
        await interaction.reply('Pong!');
    }
});

client.login(process.env.TOKEN);