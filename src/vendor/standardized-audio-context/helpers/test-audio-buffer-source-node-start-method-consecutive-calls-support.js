export const testAudioBufferSourceNodeStartMethodConsecutiveCallsSupport = (nativeContext) => {
    const nativeAudioBufferSourceNode = nativeContext.createBufferSource();
    nativeAudioBufferSourceNode.start();
    try {
        nativeAudioBufferSourceNode.start();
    }
    catch {
        return true;
    }
    return false;
};
