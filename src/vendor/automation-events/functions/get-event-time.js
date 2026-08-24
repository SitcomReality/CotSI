import { isCancelAndHoldAutomationEvent } from '../guards/cancel-and-hold-automation-event.js';
import { isCancelScheduledValuesAutomationEvent } from '../guards/cancel-scheduled-values-automation-event.js';
import { isExponentialRampToValueAutomationEvent } from '../guards/exponential-ramp-to-value-automation-event.js';
import { isLinearRampToValueAutomationEvent } from '../guards/linear-ramp-to-value-automation-event.js';
export const getEventTime = (automationEvent) => {
    if (isCancelAndHoldAutomationEvent(automationEvent) || isCancelScheduledValuesAutomationEvent(automationEvent)) {
        return automationEvent.cancelTime;
    }
    if (isExponentialRampToValueAutomationEvent(automationEvent) || isLinearRampToValueAutomationEvent(automationEvent)) {
        return automationEvent.endTime;
    }
    return automationEvent.startTime;
};
