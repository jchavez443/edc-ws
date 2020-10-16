import { v4 as uuidv4 } from 'uuid'
import { IAckEvent, IEvent } from './interface'

export default class AckEvent implements IAckEvent {
    readonly type: 'acknowledgement' = 'acknowledgement'

    readonly edc: '1.0' = '1.0'

    readonly id: string

    readonly trigger: string

    constructor(...args: [ackEvent: IAckEvent] | [casue: IEvent<any, any>]) {
        if (args[0].type === 'acknowledgement') {
            const ackEvent = <IAckEvent>args[0]

            this.id = ackEvent.id
            this.trigger = ackEvent.trigger
        } else {
            this.id = uuidv4()
            this.trigger = args[0].id
        }
    }
}
