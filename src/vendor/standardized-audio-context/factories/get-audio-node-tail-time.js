export const createGetAudioNodeTailTime = (audioNodeTailTimeStore) => {
    return (audioNode) => { var _a; return (_a = audioNodeTailTimeStore.get(audioNode)) !== null && _a !== void 0 ? _a : 0; };
};
