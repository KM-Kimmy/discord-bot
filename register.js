import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const commands = [
    {
        name: 'ping',
        description: '🏓 ตรวจสอบว่าบอทออนไลน์อยู่หรือไม่',
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