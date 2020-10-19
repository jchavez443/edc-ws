import { v4 as uuidv4 } from 'uuid'
import { IErrorDetails, IErrorEvent } from './interface'

export default class ErrorEvent implements IErrorEvent {
    readonly type: 'error' = 'error'

    readonly edc: '1.0' = '1.0'

    readonly trigger?: string

    readonly details: { code: number; cn: string; message: string; failed: string; data?: any | null }

    readonly id: string

    constructor(arg: IErrorDetails | IErrorEvent) {
        if ((arg as IErrorDetails).code) {
            this.id = uuidv4()
            this.details = <IErrorDetails>arg
        } else {
            const errorEvent = <IErrorEvent>arg
            this.trigger = errorEvent.trigger
            this.details = errorEvent.details
            this.id = errorEvent.id
        }
    }
}
