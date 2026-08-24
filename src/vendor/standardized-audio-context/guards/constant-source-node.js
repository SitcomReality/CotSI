export const isConstantSourceNode = (audioNode) => {
    return 'offset' in audioNode;
};
