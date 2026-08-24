export const isBiquadFilterNode = (audioNode) => {
    return 'frequency' in audioNode && 'gain' in audioNode;
};
