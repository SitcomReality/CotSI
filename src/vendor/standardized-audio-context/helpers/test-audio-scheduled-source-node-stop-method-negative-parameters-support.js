export const testAudioScheduledSourceNodeStopMethodNegativeParametersSupport = (nativeContext) => {
    const nativeAudioBufferSourceNode = nativeContext.createOscillator();
    try {
        nativeAudioBufferSourceNode.stop(-1);
    }
    catch (err) {
        return err instanceof RangeError;
    }
    return false;
};
