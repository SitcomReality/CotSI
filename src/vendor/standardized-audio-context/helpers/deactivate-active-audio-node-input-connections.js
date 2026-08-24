import { isAudioBufferSourceNode } from '../guards/audio-buffer-source-node.js';
import { isAudioWorkletNode } from '../guards/audio-worklet-node.js';
import { isBiquadFilterNode } from '../guards/biquad-filter-node.js';
import { isConstantSourceNode } from '../guards/constant-source-node.js';
import { isGainNode } from '../guards/gain-node.js';
import { isOscillatorNode } from '../guards/oscillator-node.js';
import { isStereoPannerNode } from '../guards/stereo-panner-node.js';
import { getAudioNodeConnections } from './get-audio-node-connections.js';
import { getAudioParamConnections } from './get-audio-param-connections.js';
import { isActiveAudioNode } from './is-active-audio-node.js';
import { setInternalStateToPassive } from './set-internal-state-to-passive.js';
export const deactivateActiveAudioNodeInputConnections = (audioNode, trace) => {
    const { activeInputs } = getAudioNodeConnections(audioNode);
    activeInputs.forEach((connections) => connections.forEach(([source]) => {
        if (!trace.includes(audioNode)) {
            deactivateActiveAudioNodeInputConnections(source, [...trace, audioNode]);
        }
    }));
    const audioParams = isAudioBufferSourceNode(audioNode)
        ? [
            // Bug #149: Safari does not yet support the detune AudioParam.
            audioNode.playbackRate
        ]
        : isAudioWorkletNode(audioNode)
            ? Array.from(audioNode.parameters.values())
            : isBiquadFilterNode(audioNode)
                ? [audioNode.Q, audioNode.detune, audioNode.frequency, audioNode.gain]
                : isConstantSourceNode(audioNode)
                    ? [audioNode.offset]
                    : isGainNode(audioNode)
                        ? [audioNode.gain]
                        : isOscillatorNode(audioNode)
                            ? [audioNode.detune, audioNode.frequency]
                            : isStereoPannerNode(audioNode)
                                ? [audioNode.pan]
                                : [];
    for (const audioParam of audioParams) {
        const audioParamConnections = getAudioParamConnections(audioParam);
        if (audioParamConnections !== undefined) {
            audioParamConnections.activeInputs.forEach(([source]) => deactivateActiveAudioNodeInputConnections(source, trace));
        }
    }
    if (isActiveAudioNode(audioNode)) {
        setInternalStateToPassive(audioNode);
    }
};
