export const isExponentialRampToValueAutomationEvent = (automationEvent) => {
    return automationEvent.type === 'exponentialRampToValue';
};
