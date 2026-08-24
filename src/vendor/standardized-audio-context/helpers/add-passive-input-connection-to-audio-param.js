import { insertElementInSet } from './insert-element-in-set.js';
export const addPassiveInputConnectionToAudioParam = (passiveInputs, [source, output, eventListener], ignoreDuplicates) => {
    const passiveInputConnections = passiveInputs.get(source);
    if (passiveInputConnections === undefined) {
        passiveInputs.set(source, new Set([[output, eventListener]]));
    }
    else {
        insertElementInSet(passiveInputConnections, [output, eventListener], (passiveInputConnection) => passiveInputConnection[0] === output, ignoreDuplicates);
    }
};
