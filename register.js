import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const commands = [
    {
        name: 'ping',
        description: 'Replies with Pong!',
    },
    {
        name: 'play',
        description: '🎵 เล่นเพลงจาก YouTube',
        options: [
            {
                name: 'song',
                description: 'ชื่อเพลงหรือ URL ของเพลง',
                type: 3, // STRING
                required: true
            }
        ]
    },
    {
        name: 'stop',
        description: '⏹️ หยุดเพลงและออกจากห้องเสียง',
    },
    {
        name: 'skip',
        description: '⏭️ ข้ามเพลงปัจจุบัน',
    },
    {
        name: 'queue',
        description: '📋 ดูคิวเพลง',
    },
    {
        name: 'nowplaying',
        description: '🎵 ดูเพลงที่กำลังเล่นอยู่',
    },
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();