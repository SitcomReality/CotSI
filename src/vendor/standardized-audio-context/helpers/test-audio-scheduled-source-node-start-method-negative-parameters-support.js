export const testAudioScheduledSourceNodeStartMethodNegativeParametersSupport = (nativeContext) => {
    const nativeAudioBufferSourceNode = nativeContext.createOscillator();
    try {
        nativeAudioBufferSourceNode.start(-1);
    }
    catch (err) {
        return err instanceof RangeError;
    }
    return false;
};
