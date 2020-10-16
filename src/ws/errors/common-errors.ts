/* eslint-disable max-classes-per-file */
import { ErrorEvent, IEvent } from '../../events'

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

    trigger: string

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
