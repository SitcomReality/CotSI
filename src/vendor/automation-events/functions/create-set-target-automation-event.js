export const createSetTargetAutomationEvent = (target, startTime, timeConstant) => {
    return { startTime, target, timeConstant, type: 'setTarget' };
};
