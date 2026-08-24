import { AutomationEventList } from './classes/automation-event-list.js';
import { createCancelAndHoldAutomationEvent } from './functions/create-cancel-and-hold-automation-event.js';
import { createCancelScheduledValuesAutomationEvent } from './functions/create-cancel-scheduled-values-automation-event.js';
import { createExponentialRampToValueAutomationEvent } from './functions/create-exponential-ramp-to-value-automation-event.js';
import { createLinearRampToValueAutomationEvent } from './functions/create-linear-ramp-to-value-automation-event.js';
import { createSetTargetAutomationEvent } from './functions/create-set-target-automation-event.js';
import { createSetValueAutomationEvent } from './functions/create-set-value-automation-event.js';
import { createSetValueCurveAutomationEvent } from './functions/create-set-value-curve-automation-event.js';
/*
 * @todo Explicitly referencing the barrel file seems to be necessary when enabling the
 * isolatedModules compiler option.
 */
export * from './interfaces/index.js';
export * from './types/index.js';
export { AutomationEventList };
export { createCancelAndHoldAutomationEvent };
export { createCancelScheduledValuesAutomationEvent };
export { createExponentialRampToValueAutomationEvent };
export { createLinearRampToValueAutomationEvent };
export { createSetTargetAutomationEvent };
export { createSetValueAutomationEvent };
export { createSetValueCurveAutomationEvent };
