import { Client, Events, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import { joinVoiceChannel } from '@discordjs/voice';
import dotenv from 'dotenv';
import {
    getQueue,
    createQueue,
    deleteQueue,
    playSong,
    searchSong,
    setupPlayerEvents
} from './music.js';

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,  // จำเป็นสำหรับการตรวจจับสมาชิกใหม่
        GatewayIntentBits.GuildVoiceStates  // จำเป็นสำหรับระบบเพลง
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

        // ค้นหาเพลง
        const song = await searchSong(query);
        if (!song) {
            return interaction.editReply('❌ ไม่พบเพลงที่ค้นหา');
        }

        // สร้างหรือดึง queue
        let queue = getQueue(guild.id);
        if (!queue) {
            queue = createQueue(guild.id);

            // เชื่อมต่อห้องเสียง
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: guild.id,
                adapterCreator: guild.voiceAdapterCreator,
            });

            queue.connection = connection;
            connection.subscribe(queue.player);

            // ตั้งค่า events
            setupPlayerEvents(guild.id, interaction.channel);
        }

        // เพิ่มเพลงเข้าคิว
        queue.songs.push(song);

        const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('🎵 เพิ่มเพลงเข้าคิว')
            .setDescription(`**${song.title}**`)
            .addFields(
                { name: '⏱️ ความยาว', value: song.duration || 'ไม่ทราบ', inline: true },
                { name: '📋 ลำดับในคิว', value: `${queue.songs.length}`, inline: true }
            )
            .setThumbnail(song.thumbnail);

        await interaction.editReply({ embeds: [embed] });

        // ถ้าไม่ได้เล่นอยู่ ให้เริ่มเล่น
        if (!queue.playing) {
            await playSong(guild.id, song);
            interaction.channel.send(`🎶 กำลังเล่น: **${song.title}**`);
        }
    }

    // ⏹️ Stop - หยุดเพลงและออกจากห้อง
    else if (commandName === 'stop') {
        const queue = getQueue(guild.id);

        if (!queue) {
            return interaction.reply({
                content: '❌ ไม่มีเพลงกำลังเล่นอยู่',
                ephemeral: true
            });
        }

        deleteQueue(guild.id);
        await interaction.reply('⏹️ หยุดเพลงและออกจากห้องเสียงแล้ว');
    }

    // ⏭️ Skip - ข้ามเพลง
    else if (commandName === 'skip') {
        const queue = getQueue(guild.id);

        if (!queue || queue.songs.length === 0) {
            return interaction.reply({
                content: '❌ ไม่มีเพลงในคิว',
                ephemeral: true
            });
        }

        queue.player.stop(); // จะ trigger AudioPlayerStatus.Idle
        await interaction.reply('⏭️ ข้ามเพลงแล้ว');
    }

    // 📋 Queue - ดูคิวเพลง
    else if (commandName === 'queue') {
        const queue = getQueue(guild.id);

        if (!queue || queue.songs.length === 0) {
            return interaction.reply({
                content: '📭 ไม่มีเพลงในคิว',
                ephemeral: true
            });
        }

        const songList = queue.songs
            .slice(0, 10)
            .map((song, index) => `${index === 0 ? '🎵' : `${index}.`} ${song.title}`)
            .join('\n');

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📋 คิวเพลง')
            .setDescription(songList)
            .setFooter({ text: `ทั้งหมด ${queue.songs.length} เพลง` });

        await interaction.reply({ embeds: [embed] });
    }

    // 🎵 Now Playing - เพลงที่กำลังเล่น
    else if (commandName === 'nowplaying') {
        const queue = getQueue(guild.id);

        if (!queue || queue.songs.length === 0) {
            return interaction.reply({
                content: '❌ ไม่มีเพลงกำลังเล่นอยู่',
                ephemeral: true
            });
        }

        const song = queue.songs[0];
        const embed = new EmbedBuilder()
            .setColor(0xEB459E)
            .setTitle('🎵 กำลังเล่น')
            .setDescription(`**${song.title}**`)
            .addFields(
                { name: '⏱️ ความยาว', value: song.duration || 'ไม่ทราบ', inline: true }
            )
            .setThumbnail(song.thumbnail);

        await interaction.reply({ embeds: [embed] });
    }
});

client.login(process.env.TOKEN);