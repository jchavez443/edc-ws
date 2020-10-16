import { Auth } from './interfaces'

export default class BasicAuth implements Auth {
    username: string

    password: string

    authenticated: boolean

    constructor(base64: string) {
        const userPass: string = Buffer.from(base64.replace('Basic ', ''), 'base64').toString('utf-8')

        const [username, password] = userPass.split(':')

        this.password = password
        this.username = username

        this.authenticated = false
    }
}
