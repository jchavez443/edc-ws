import { v4 as uuidv4 } from 'uuid'
import { IErrorEvent, IEvent } from './interface'

export default class ErrorEvent implements IErrorEvent {
    readonly type: 'error' = 'error'

    readonly edc: '1.0' = '1.0'

    readonly trigger: string

    details: { code: number; cn: string; message: string; data?: any | null }

    readonly failed: IEvent<any, any>

    readonly shared?: {} | {}[] | undefined

    readonly id: string

    constructor(
        ...args:
            | [failedEvent: IEvent<any, any>, deatils: { code: number; cn: string; message: string; data?: {} | null }]
            | [errorEvent: IErrorEvent]
    ) {
        if (args.length === 2) {
            const failedEvent = args[0]
            const details = args[1]

            this.trigger = failedEvent.id
            this.failed = failedEvent

            this.id = uuidv4()
            this.details = details

            this.shared = failedEvent.shared
        } else {
            const errorEvent = args[0]

            this.trigger = errorEvent.trigger
            this.details = errorEvent.details
            this.failed = errorEvent.failed
            this.id = errorEvent.id
            this.shared = errorEvent.shared
        }
    }
}
