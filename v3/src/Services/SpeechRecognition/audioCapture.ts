export const TARGET_SAMPLE_RATE = 16000;
export const MIN_AUDIO_SAMPLES = TARGET_SAMPLE_RATE / 2;

export const mergeFloat32Arrays = (chunks: Float32Array[]) => {
    if (!chunks.length) {
        return new Float32Array(0);
    }

    if (chunks.length === 1) {
        return chunks[0];
    }

    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
    }

    return merged;
};

export const resampleAudio = (audioData: Float32Array, fromRate: number, toRate: number) => {
    if (fromRate === toRate || audioData.length === 0) {
        return audioData;
    }

    const ratio = fromRate / toRate;
    const newLength = Math.max(1, Math.round(audioData.length / ratio));
    const resampled = new Float32Array(newLength);

    for (let index = 0; index < newLength; index += 1) {
        const sourceIndex = index * ratio;
        const lowerIndex = Math.floor(sourceIndex);
        const upperIndex = Math.min(lowerIndex + 1, audioData.length - 1);
        const blend = sourceIndex - lowerIndex;
        resampled[index] = audioData[lowerIndex] * (1 - blend) + audioData[upperIndex] * blend;
    }

    return resampled;
};

export class MicrophoneCapture {
    private audioContext: AudioContext | null = null;
    private sourceNode: MediaStreamAudioSourceNode | null = null;
    private processorNode: ScriptProcessorNode | null = null;
    private gainNode: GainNode | null = null;
    private stream: MediaStream | null = null;
    private chunks: Float32Array[] = [];

    async start(stream: MediaStream) {
        this.stop();
        this.stream = stream;
        this.chunks = [];

        const audioContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
        await audioContext.resume();

        const sourceNode = audioContext.createMediaStreamSource(stream);
        const processorNode = audioContext.createScriptProcessor(4096, 1, 1);
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0;

        processorNode.onaudioprocess = (event) => {
            const channel = event.inputBuffer.getChannelData(0);
            this.chunks.push(new Float32Array(channel));
        };

        sourceNode.connect(processorNode);
        processorNode.connect(gainNode);
        gainNode.connect(audioContext.destination);

        this.audioContext = audioContext;
        this.sourceNode = sourceNode;
        this.processorNode = processorNode;
        this.gainNode = gainNode;
    }

    stop(): Float32Array {
        const sampleRate = this.audioContext?.sampleRate ?? TARGET_SAMPLE_RATE;
        const merged = mergeFloat32Arrays(this.chunks);

        this.processorNode?.disconnect();
        this.sourceNode?.disconnect();
        this.gainNode?.disconnect();

        void this.audioContext?.close();
        this.stream?.getTracks().forEach((track) => track.stop());

        this.processorNode = null;
        this.sourceNode = null;
        this.gainNode = null;
        this.audioContext = null;
        this.stream = null;
        this.chunks = [];

        return resampleAudio(merged, sampleRate, TARGET_SAMPLE_RATE);
    }
}

export const isMicrophoneCaptureSupported = () =>
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof AudioContext !== "undefined";
