export const isStereoPannerNode = (audioNode) => {
    return 'pan' in audioNode;
};
