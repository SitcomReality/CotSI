import { isExponentialRampToValueAutomationEvent } from './exponential-ramp-to-value-automation-event.js';
import { isLinearRampToValueAutomationEvent } from './linear-ramp-to-value-automation-event.js';
export const isAnyRampToValueAutomationEvent = (automationEvent) => {
    return isExponentialRampToValueAutomationEvent(automationEvent) || isLinearRampToValueAutomationEvent(automationEvent);
};
