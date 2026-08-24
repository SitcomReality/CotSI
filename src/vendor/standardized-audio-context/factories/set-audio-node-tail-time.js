export const createSetAudioNodeTailTime = (audioNodeTailTimeStore) => {
    return (audioNode, tailTime) => audioNodeTailTimeStore.set(audioNode, tailTime);
};
