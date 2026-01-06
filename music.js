import {
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    StreamType,
    NoSubscriberBehavior
} from '@discordjs/voice';
import play from 'play-dl';

// เก็บข้อมูล player และ queue สำหรับแต่ละ server
const queues = new Map();

export function getQueue(guildId) {
    return queues.get(guildId);
}

export function createQueue(guildId) {
    const player = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Play
        }
    });

    const queue = {
        songs: [],
        player: player,
        connection: null,
        playing: false,
        loop: false
    };
    queues.set(guildId, queue);
    console.log(`✅ Created queue for guild: ${guildId}`);
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
        console.log(`🗑️ Deleted queue for guild: ${guildId}`);
    }
}

export async function playSong(guildId, song) {
    const queue = getQueue(guildId);
    if (!queue) {
        console.error('❌ No queue found for guild:', guildId);
        return false;
    }

    try {
        console.log(`🎵 Attempting to play: ${song.title}`);
        console.log(`🔗 URL: ${song.url}`);

        const stream = await play.stream(song.url);
        console.log(`📡 Stream type: ${stream.type}`);

        const resource = createAudioResource(stream.stream, {
            inputType: stream.type,
            inlineVolume: true
        });

        resource.volume?.setVolume(0.5);

        queue.player.play(resource);
        queue.playing = true;

        console.log(`✅ Started playing: ${song.title}`);
        return true;
    } catch (error) {
        console.error('❌ Error playing song:', error);
        queue.playing = false;
        return false;
    }
}

export async function searchSong(query) {
    try {
        console.log(`🔍 Searching for: ${query}`);

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
        if (results.length === 0) {
            console.log('❌ No results found');
            return null;
        }

        const video = results[0];
        console.log(`✅ Found: ${video.title}`);
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

    // Debug: ตรวจสอบสถานะ player
    queue.player.on(AudioPlayerStatus.Playing, () => {
        console.log(`▶️ Player is now playing for guild: ${guildId}`);
    });

    queue.player.on(AudioPlayerStatus.Buffering, () => {
        console.log(`⏳ Player is buffering for guild: ${guildId}`);
    });

    queue.player.on(AudioPlayerStatus.Idle, async () => {
        console.log(`⏸️ Player is idle for guild: ${guildId}`);

        // เพลงจบแล้ว เล่นเพลงถัดไป
        if (queue.loop && queue.songs.length > 0) {
            await playSong(guildId, queue.songs[0]);
        } else {
            queue.songs.shift();

            if (queue.songs.length > 0) {
                await playSong(guildId, queue.songs[0]);
                textChannel.send(`🎵 กำลังเล่น: **${queue.songs[0].title}**`);
            } else {
                queue.playing = false;
                textChannel.send('📭 คิวเพลงหมดแล้ว! ออกจากห้องเสียง...');

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
        console.error('Error resource:', error.resource);
        textChannel.send('❌ เกิดข้อผิดพลาดในการเล่นเพลง');
    });

    console.log(`🎧 Player events set up for guild: ${guildId}`);
}
