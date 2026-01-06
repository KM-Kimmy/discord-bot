import { REST, Routes, ChannelType } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const commands = [
    {
        name: 'ping',
        description: '🏓 ตรวจสอบว่าบอทออนไลน์อยู่หรือไม่',
    },
    {
        name: 'setwelcome',
        description: '⚙️ ตั้งค่าห้องต้อนรับสมาชิก',
        options: [
            {
                name: 'channel',
                description: 'เลือกห้องที่จะใช้ต้อนรับสมาชิก',
                type: 7, // CHANNEL
                required: true,
                channel_types: [0] // GUILD_TEXT
            }
        ]
    },
    {
        name: 'removewelcome',
        description: '❌ ปิดการแจ้งเตือนสมาชิกเข้า/ออก',
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