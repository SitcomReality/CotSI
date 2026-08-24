import { getValueOfAutomationEventAtIndexAtTime } from '../functions/get-value-of-automation-event-at-index-at-time.js';
import { isAnyRampToValueAutomationEvent } from '../guards/any-ramp-to-value-automation-event.js';
import { isSetValueAutomationEvent } from '../guards/set-value-automation-event.js';
import { isSetValueCurveAutomationEvent } from '../guards/set-value-curve-automation-event.js';
export const getEndTimeAndValueOfPreviousAutomationEvent = (automationEvents, index, currentAutomationEvent, nextAutomationEvent, defaultValue) => {
    return currentAutomationEvent === undefined
        ? [nextAutomationEvent.insertTime, defaultValue]
        : isAnyRampToValueAutomationEvent(currentAutomationEvent)
            ? [currentAutomationEvent.endTime, currentAutomationEvent.value]
            : isSetValueAutomationEvent(currentAutomationEvent)
                ? [currentAutomationEvent.startTime, currentAutomationEvent.value]
                : isSetValueCurveAutomationEvent(currentAutomationEvent)
                    ? [
                        currentAutomationEvent.startTime + currentAutomationEvent.duration,
                        currentAutomationEvent.values[currentAutomationEvent.values.length - 1]
                    ]
                    : [
                        currentAutomationEvent.startTime,
                        getValueOfAutomationEventAtIndexAtTime(automationEvents, index - 1, currentAutomationEvent.startTime, defaultValue)
                    ];
};
