export const isValidLatencyHint = (latencyHint) => {
    return (latencyHint === undefined ||
        typeof latencyHint === 'number' ||
        (typeof latencyHint === 'string' && (latencyHint === 'balanced' || latencyHint === 'interactive' || latencyHint === 'playback')));
};
