import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState
} from '@discordjs/voice';
import play from 'play-dl';

// เก็บข้อมูล player และ queue สำหรับแต่ละ server
const queues = new Map();

export function getQueue(guildId) {
    return queues.get(guildId);
}

export function createQueue(guildId) {
    const queue = {
        songs: [],
        player: createAudioPlayer(),
        connection: null,
        playing: false,
        loop: false
    };
    queues.set(guildId, queue);
    return queue;
}

export function deleteQueue(guildId) {
    const queue = queues.get(guildId);
    if (queue) {
        queue.player.stop();
        if (queue.connection) {
            queue.connection.destroy();
        }
        queues.delete(guildId);
    }
}

export async function playSong(guildId, song) {
    const queue = getQueue(guildId);
    if (!queue) return;

    try {
        const stream = await play.stream(song.url);
        const resource = createAudioResource(stream.stream, {
            inputType: stream.type
        });

        queue.player.play(resource);
        queue.playing = true;

        return true;
    } catch (error) {
        console.error('❌ Error playing song:', error);
        return false;
    }
}

export async function searchSong(query) {
    try {
        // ถ้าเป็น URL
        if (play.yt_validate(query) === 'video') {
            const info = await play.video_info(query);
            return {
                title: info.video_details.title,
                url: info.video_details.url,
                duration: info.video_details.durationRaw,
                thumbnail: info.video_details.thumbnails[0]?.url
            };
        }

        // ถ้าเป็นคำค้นหา
        const results = await play.search(query, { limit: 1 });
        if (results.length === 0) return null;

        const video = results[0];
        return {
            title: video.title,
            url: video.url,
            duration: video.durationRaw,
            thumbnail: video.thumbnails[0]?.url
        };
    } catch (error) {
        console.error('❌ Error searching song:', error);
        return null;
    }
}

export function setupPlayerEvents(guildId, textChannel) {
    const queue = getQueue(guildId);
    if (!queue) return;

    queue.player.on(AudioPlayerStatus.Idle, async () => {
        // เพลงจบแล้ว เล่นเพลงถัดไป
        if (queue.loop && queue.songs.length > 0) {
            // Loop mode: เล่นเพลงเดิม
            await playSong(guildId, queue.songs[0]);
        } else {
            // ลบเพลงที่เล่นจบออก
            queue.songs.shift();

            if (queue.songs.length > 0) {
                // เล่นเพลงถัดไป
                await playSong(guildId, queue.songs[0]);
                textChannel.send(`🎵 กำลังเล่น: **${queue.songs[0].title}**`);
            } else {
                // ไม่มีเพลงในคิวแล้ว
                queue.playing = false;
                textChannel.send('📭 คิวเพลงหมดแล้ว! ออกจากห้องเสียง...');

                // รอ 30 วินาทีแล้วออกจากห้อง
                setTimeout(() => {
                    const currentQueue = getQueue(guildId);
                    if (currentQueue && !currentQueue.playing) {
                        deleteQueue(guildId);
                    }
                }, 30000);
            }
        }
    });

    queue.player.on('error', error => {
        console.error('❌ Player error:', error);
        textChannel.send('❌ เกิดข้อผิดพลาดในการเล่นเพลง');
    });
}
