/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import { IAckEvent, IErrorEvent, IEvent } from '../src/interface'

const event: IEvent<any> = {
    edc: '1.0',
    id: 'id',
    type: 'type',
    trigger: 'triggerId',
    details: {
        test: 'string',
        test2: {
            str: 'adsf'
        }
    },
    shared: [{ test: 'ss' }, { test: 1 }, { test: null }, { test: undefined }, { test: { test: 1 } }],
    acknowledge: true
}

const ack: IAckEvent = {
    edc: '1.0',
    id: 'id',
    trigger: event.id,
    type: 'acknowledgement'
}

const error: IErrorEvent = {
    edc: '1.0',
    type: 'error',
    id: 'id',
    details: {
        cn: 'common-name',
        code: 404,
        data: null,
        message: 'the common-name error occured because'
    },
    trigger: event.id,
    failed: event,
    shared: event.shared
}
