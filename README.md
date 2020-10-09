# Event Driven Communications (EDC) w/ WebSockets

## EDC-WS 
Is a server-clinet pakage that uses websockets to endable EDC.

## Event Driven Communications (EDC) protcool
Is a JSON based communications protocol that follows these rules:

### Event
An Event is a JSON object defined as

Note: for `"type"` `error` and `acknowledgement` are reserved for **Error Event** and **Acknowledgement Event** respectivley

```json
{
    "type": string,                //Event type 
    "id": string,                  //UUID for the event,
    "trigger":? string,            // UUID of the event triggering this event
    "acknowledge":? boolean,       // The event must be acknowledged
    "details":? {},           // Details of this event
    "shared":? {},            // Shared information from the chain of events, (modifiable),
    "failed":? Event               // If a error occurs on an event that did not request acknowledgement
}
```

### Acknowledgement Event

```json
{
    "type": "acknowledgement",
    "id": "71e92430-77b6-48ad-899c-7a5fc769f328",
    "trigger": "af0f0d3e-5c48-4265-9f3e-e37a21ff84c1"
}
```

### Error Event

```json
Error Event 
{
    "type": "error",
    "id": "71e92430-77b6-48ad-899c-7a5fc769f328",
    "trigger": "af0f0d3e-5c48-4265-9f3e-e37a21ff84c1",
    "details": { error details },
    "shared": { shared data from erroring event },
    "failed": { erroring event }
}
```

#### Error Event Details
The `details` of the error event MUST include
* `cn` the common name of the error
* `code` the number for the error
* `message` the message to help understand the error

A `data` field is allowed for any additional information about the error

```ts
details: { 
    code: number; 
    cn: string; 
    message: string;
    data: {} | null 
}
```


### Fields

#### type
The type field represent the event type.  It can be any string except `error` and `acknowldegement` which are reserved.

#### id
The id field is a UUID and MUST be unique for **all** events

#### trigger
The trigger is set to the event that triggered the new event.  `new event.trigger = cause.id` 

The concept is meant to build a chain of events with `events` becoming the `cuase` of `new events`.  An `event` is not limited to causing only a linear chain.  It is possible for one `cause` to trigger multiple `events`.  `cause --> event1 & event2`

#### acknowledge
If an event is sent with the `"acknowledge": true` flag then the recieving system MUST reply with an `event`, `error`, or `acknowledgement` with the `trigger` field set to the `id` of the sent event.

Example:

```json
A --> B
{
    "type": "initiate",
    "id": "0a385c23-4b65-4d9f-8c78-6b7bf5ad0530",
    "acknowledge": true,
}
--------------------------------------------------
B --> A

Ack Event
{
    "type": "acknowledgement",
    "id": "71e92430-77b6-48ad-899c-7a5fc769f328",
    "trigger": "0a385c23-4b65-4d9f-8c78-6b7bf5ad0530"
}
-- Or --
Error Event 
{
    "type": "error",
    "id": "93de2206-9669-4e07-948d-329f4b722ee2",
    "trigger": "0a385c23-4b65-4d9f-8c78-6b7bf5ad0530",
    "details": {
        ...
     },
    "failed": {
        "type": "initiate",
        "id": "0a385c23-4b65-4d9f-8c78-6b7bf5ad0530",
        "acknowledge": true,
    }
}
-- Or --
Responding Event
{
    "type": "next-event",
    "id": "a201b948-4282-49e8-ae92-1c146ddd538b",
    "trigger":  "0a385c23-4b65-4d9f-8c78-6b7bf5ad0530"
}
```

#### details
The details is any JSON object and would hold the details for the OCCURING event.  It is not inteded to be used for `shared` properties that relate to the chain of events.

#### shared
The shared property is any JSON object.  It is inteded to be used as a property that a `chain of events` share in common.

When an event is `triggered` by a `cause` then it SHOULD set the `trigger` to the `cause.id` and copy the `cause.shared` data to the `new event`.  The shared data is not immutable and can evolve.  

Examples would include a connectionId that events share incommon, a callId for a phone call, a survey id, or start time or a `chain of events`.

```json
A --> B
{
    "type": "survey-question",
    "id": "e680a8a0-ad3e-4f9e-991b-fa0fe752b8d1",
    "details": {
        "question": "what is your favorite programming language?"
    },
    "shared": {
        "survey": "programming-favorites",
        "step": 0
    }
}
-----------------------------------------------------------------
B --> A
// Note the shared data is copied
{
    "type": "survey-answer",
    "id": "09d0bc49-29be-4e2e-a347-aee23f9a815b",
    "trigger": "e680a8a0-ad3e-4f9e-991b-fa0fe752b8d1",
    "details": {
        "answer": "I love them all!"
    },
    "shared": {
        "survey": "programming-favorites",
        "step": 0
    }
}
----------------------------------------------------------------
A --> B
// Note that the shared.step was increased
{
    "type": "survey-question",
    "id": "9d37afee-9b68-4d8f-ae63-2bc8f9b2d7a7",
    "trigger": "09d0bc49-29be-4e2e-a347-aee23f9a815b",
    "details": {
        "question": "Who is your favorite computer scientist?"
    },
    "shared": {
        "survey": "programming-favorites",
        "step": 1
    }
}
```

#### failed
Is only used with the `"type": "error"` event.  It MUST be a copy of the event that triggered the error

```json
{
    "type": "error",
    "id": "93de2206-9669-4e07-948d-329f4b722ee2",
    "trigger": "0a385c23-4b65-4d9f-8c78-6b7bf5ad0530",
    "details": {
        ...
     },
    "failed": {
        "type": "initiate",
        "id": "0a385c23-4b65-4d9f-8c78-6b7bf5ad0530",
        "acknowledge": true,
    }
}
```