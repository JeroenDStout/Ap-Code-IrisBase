import * as Fbemit from 'fbemitter';

class Socket {
    host_name: string;
    host_icon: string;
    host_port: number;
    connected: boolean;

    socket: WebSocket;
}

export class SocketStateInfo {
    host_name: string;
    host_icon: string;
    host_port: number;
    connected: boolean;
}

export class Socketman {
    static Current_Sockets: Array<Socket> = new Array<Socket>();

    static Events_Socket_Change: Fbemit.EventEmitter = new Fbemit.EventEmitter();
    static Connect_Timeout: NodeJS.Timeout;

    static commence(): void {
        console.log("Socketman commencing");
        this.fetch_connexion_enum();

        let self = this;
        this.Connect_Timeout = setTimeout(function () { self.try_connect_sockets(); }, 1000);
    }

    static get_socket_state_info(): Array<SocketStateInfo> {
        let array = new Array<SocketStateInfo>();

        for (let index = 0; index < this.Current_Sockets.length; ++index) {
            let value = this.Current_Sockets[index];
            let info = new SocketStateInfo();
            info.host_name = value.host_name;
            info.host_icon = value.host_icon;
            info.host_port = value.host_port;
            info.connected = value.connected;
            array.push(info);
        }

        return array;
    }

    static fetch_connexion_enum() {
        fetch("/web/iris/connexions.json")
            .then(res => {
                if (res.ok) {
                    return res.json();
                } else {
                    throw Error(res.statusText);
                }
            })
            .then(json => {
                this.receive_connexion_enum(json);
            });
    }

    static receive_connexion_enum(json: any) {
        console.log("Updating connexion enum");
        console.log(json);

        this.Current_Sockets = new Array<Socket>();

        for (let index = 0; index < json.length; ++index) {
            let value = json[index];
            let socket: Socket = new Socket();
            socket.host_name = value["name"];
            socket.host_icon = value["icon"];
            socket.host_port = value["port"];
            socket.connected = false;

            this.Current_Sockets.push(socket);
        }

        this.try_connect_sockets();
        this.Events_Socket_Change.emit('any');
    }

    static try_connect_sockets() {
        for (let index = 0; index < this.Current_Sockets.length; ++index) {
            let state = this.Current_Sockets[index];

            if (state.connected)
                continue;

            let ws = state.socket = new WebSocket('ws://' + location.hostname + ':' + state.host_port);
            let self = this;

            ws.onopen = function () {
                console.log('connected ' + state.host_name);
                state.connected = true;
                self.Events_Socket_Change.emit('any');
            };

            ws.onclose = function () {
                console.log('disconnected ' + state.host_name);
                let last_state = state.connected;
                state.connected = false;
                if (last_state != false) {
                    self.Events_Socket_Change.emit('any');
                }
            };

            ws.onmessage = function (data: any) {
                console.log(data);
            };
        }

        clearTimeout(this.Connect_Timeout);
        let self = this;
        this.Connect_Timeout = setTimeout(function () { self.try_connect_sockets(); }, 5000);
    }
}