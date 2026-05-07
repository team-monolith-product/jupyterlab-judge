import { Signal } from '@lumino/signaling';
import { JudgeSignal } from './tokens';

/**
 * A signal that emits whenever a submission is submitted.
 */
export const submitted = new Signal<any, JudgeSignal.ISubmissionArgs>({});

/**
 * A signal that emits when code is executed.
 */
export const executed = new Signal<any, JudgeSignal.IExecutionArgs>({});

/**
 * A signal that emits whenever a problem is opened via openOrCreateFromId.
 */
export const opened = new Signal<any, JudgeSignal.IOpenedArgs>({});
