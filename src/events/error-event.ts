import { v4 as uuidv4 } from 'uuid'
import { IErrorDetails, IErrorEvent, IEvent } from './interface'

export default class ErrorEvent<T> implements IErrorEvent<T> {
    readonly type: 'error' = 'error'

    readonly edc: '1.0' = '1.0'

    readonly trigger?: string

    readonly details: { code: number; cn: string; message: string; failed: string; data?: T }

    readonly id: string

    constructor(
        ...args:
            | [IErrorDetails<T>]
            | [IErrorEvent<T>]
            | [failedEvent: IEvent<any, any>, details: { code: number; cn: string; message: string; data?: T }]
    ) {
        if (args.length === 2) {
            this.id = uuidv4()
            this.trigger = args[0].id
            this.details = { ...args[1], ...{ failed: JSON.stringify(args[0]) } }
        } else if ((args[0] as IErrorDetails<T>).code) {
            this.id = uuidv4()
            this.details = <IErrorDetails<T>>args[0]
        } else {
            const errorEvent = <IErrorEvent<T>>args[0]
            this.trigger = errorEvent.trigger
            this.details = errorEvent.details
            this.id = errorEvent.id
        }
    }
}
