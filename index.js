import { Client, Events, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import { Player } from 'discord-player';
import { DefaultExtractors } from '@discord-player/extractor';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// สร้าง Player
const player = new Player(client);

// โหลด extractors
player.extractors.loadMulti(DefaultExtractors);

// Event เมื่อเริ่มเล่นเพลง
player.events.on('playerStart', (queue, track) => {
    console.log(`🎵 Now playing: ${track.title}`);
    queue.metadata.channel.send(`🎶 กำลังเล่น: **${track.title}**`);
});

// Event เมื่อเกิด error
player.events.on('error', (queue, error) => {
    console.error('❌ Player error:', error);
});

player.events.on('playerError', (queue, error) => {
    console.error('❌ Player error:', error);
    queue.metadata.channel.send('❌ เกิดข้อผิดพลาดในการเล่นเพลง');
});

// Event เมื่อคิวหมด
player.events.on('emptyQueue', (queue) => {
    queue.metadata.channel.send('📭 คิวเพลงหมดแล้ว!');
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

        console.log(`👋 ${member.user.tag} ออกจากเซิร์ฟเวอร์`);
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการแจ้งเตือนสมาชิกออก:', error);
    }
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, guild, member } = interaction;

    // 🏓 Ping
    if (commandName === 'ping') {
        await interaction.reply('Pong!');
    }

    // 🎵 Play - เล่นเพลง
    else if (commandName === 'play') {
        const query = options.getString('song');
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({
                content: '❌ คุณต้องอยู่ในห้องเสียงก่อน!',
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            const result = await player.play(voiceChannel, query, {
                nodeOptions: {
                    metadata: {
                        channel: interaction.channel
                    }
                }
            });

            const embed = new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle('🎵 เพิ่มเพลงเข้าคิว')
                .setDescription(`**${result.track.title}**`)
                .addFields(
                    { name: '⏱️ ความยาว', value: result.track.duration || 'ไม่ทราบ', inline: true },
                    { name: '👤 ศิลปิน', value: result.track.author || 'ไม่ทราบ', inline: true }
                )
                .setThumbnail(result.track.thumbnail);

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('❌ Error playing:', error);
            await interaction.editReply('❌ ไม่สามารถเล่นเพลงได้: ' + error.message);
        }
    }

    // ⏹️ Stop - หยุดเพลงและออกจากห้อง
    else if (commandName === 'stop') {
        const queue = player.nodes.get(guild.id);

        if (!queue) {
            return interaction.reply({
                content: '❌ ไม่มีเพลงกำลังเล่นอยู่',
                ephemeral: true
            });
        }

        queue.delete();
        await interaction.reply('⏹️ หยุดเพลงและออกจากห้องเสียงแล้ว');
    }

    // ⏭️ Skip - ข้ามเพลง
    else if (commandName === 'skip') {
        const queue = player.nodes.get(guild.id);

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({
                content: '❌ ไม่มีเพลงในคิว',
                ephemeral: true
            });
        }

        queue.node.skip();
        await interaction.reply('⏭️ ข้ามเพลงแล้ว');
    }

    // 📋 Queue - ดูคิวเพลง
    else if (commandName === 'queue') {
        const queue = player.nodes.get(guild.id);

        if (!queue || queue.tracks.size === 0) {
            return interaction.reply({
                content: '📭 ไม่มีเพลงในคิว',
                ephemeral: true
            });
        }

        const tracks = queue.tracks.toArray();
        const currentTrack = queue.currentTrack;

        let description = currentTrack ? `🎵 **กำลังเล่น:** ${currentTrack.title}\n\n` : '';
        description += tracks.slice(0, 10).map((track, i) => `${i + 1}. ${track.title}`).join('\n');

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📋 คิวเพลง')
            .setDescription(description)
            .setFooter({ text: `ทั้งหมด ${tracks.length} เพลงในคิว` });

        await interaction.reply({ embeds: [embed] });
    }

    // 🎵 Now Playing - เพลงที่กำลังเล่น
    else if (commandName === 'nowplaying') {
        const queue = player.nodes.get(guild.id);

        if (!queue || !queue.currentTrack) {
            return interaction.reply({
                content: '❌ ไม่มีเพลงกำลังเล่นอยู่',
                ephemeral: true
            });
        }

        const track = queue.currentTrack;
        const embed = new EmbedBuilder()
            .setColor(0xEB459E)
            .setTitle('🎵 กำลังเล่น')
            .setDescription(`**${track.title}**`)
            .addFields(
                { name: '⏱️ ความยาว', value: track.duration || 'ไม่ทราบ', inline: true },
                { name: '👤 ศิลปิน', value: track.author || 'ไม่ทราบ', inline: true }
            )
            .setThumbnail(track.thumbnail);

        await interaction.reply({ embeds: [embed] });
    }
});

client.login(process.env.TOKEN);