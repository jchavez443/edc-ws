/* eslint-disable max-classes-per-file */
import { v4 as uuidv4 } from 'uuid'
import { ErrorEvent, IErrorDetails, IErrorEvent, IEvent } from '../../events'

export class TimeoutError extends Error {
    public timeout: number | undefined

    static type: string = 'TimeoutError'

    public readonly type: string

    constructor(message?: string, timeout?: number) {
        if (timeout) {
            super(`Timeout in ${timeout}ms: ${message}`)
        } else {
            super(`Timeout: ${message}`)
        }

        this.type = TimeoutError.type
        this.timeout = timeout
    }
}

export class AckedErrorEvent<T> extends Error {
    id: string

    trigger?: string

    data?: T

    cn: string

    code: number

    failed: string

    constructor(error: IErrorEvent<T>) {
        super(`Caught ErrorEvent:  ${error.details.message}`)

        this.name = 'AckedErrorEvent'

        this.id = error.id
        this.trigger = error.trigger
        this.data = error.details.data
        this.cn = error.details.cn
        this.code = error.details.code
        this.failed = error.details.failed
    }
}

export class InvalidJsonErrorEvent implements ErrorEvent<any> {
    readonly type: 'error' = 'error'

    readonly edc: '1.0' = '1.0'

    details: IErrorDetails<any>

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

export class InvalidEventErrorEvent implements ErrorEvent<any> {
    readonly type: 'error' = 'error'

    readonly edc: '1.0' = '1.0'

    details: IErrorDetails<any>

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
