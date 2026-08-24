import { getValueForKey } from './get-value-for-key.js';
import { pickElementFromSet } from './pick-element-from-set.js';
export const deletePassiveInputConnectionToAudioNode = (passiveInputs, source, output, input) => {
    const passiveInputConnections = getValueForKey(passiveInputs, source);
    const matchingConnection = pickElementFromSet(passiveInputConnections, (passiveInputConnection) => passiveInputConnection[0] === output && passiveInputConnection[1] === input);
    if (passiveInputConnections.size === 0) {
        passiveInputs.delete(source);
    }
    return matchingConnection;
};
