/* eslint-disable max-classes-per-file */
import { v4 as uuidv4 } from 'uuid'
import { ErrorEvent, IErrorDetails, IErrorEvent, IEvent } from '../../events'

export class TimeoutError extends Error {
    public timeout: number | undefined

    constructor(message?: string, timeout?: number) {
        if (timeout) {
            super(`Timeout in ${timeout}ms: ${message}`)
        } else {
            super(`Timeout: ${message}`)
        }

        this.name = 'TimeoutError'
        this.timeout = timeout
    }
}

export class AckedErrorEvent extends Error {
    failed: IEvent<any, any>

    id: string

    trigger?: string

    shared?: {}

    data?: any

    cn: string

    code: number

    constructor(error: ErrorEvent) {
        super(`Caught ErrorEvent:  ${error.details.message}`)

        this.name = 'AckedErrorEvent'

        this.failed = error.failed
        this.id = error.id
        this.trigger = error.trigger
        this.data = error.details.data
        this.cn = error.details.cn
        this.code = error.details.code
    }
}

export class InvalidJsonErrorEvent implements ErrorEvent {
    readonly type: 'error' = 'error'

    readonly edc: '1.0' = '1.0'

    details: IErrorDetails

    id: string

    constructor(failedEvent: string) {
        this.id = uuidv4()
        this.details = {
            code: 32700,
            cn: 'Parse error',
            message: 'Invalid Json',
            failed: failedEvent
        }
    }
}

export class InvalidEventErrorEvent implements ErrorEvent {
    readonly type: 'error' = 'error'

    readonly edc: '1.0' = '1.0'

    details: IErrorDetails

    readonly id: string

    readonly trigger?: string

    constructor(arg: string | IEvent<any, any>) {
        this.id = uuidv4()

        if (typeof arg === 'string') {
            this.details = {
                code: 32600,
                cn: 'Invalid Request',
                message: 'The JSON sent is not a valid Event object.',
                failed: arg
            }
        } else {
            this.trigger = arg.id
            this.details = {
                code: 32600,
                cn: 'Invalid Request',
                message: 'The JSON sent is not a valid Event object.',
                failed: JSON.stringify(arg)
            }
        }
    }
}
