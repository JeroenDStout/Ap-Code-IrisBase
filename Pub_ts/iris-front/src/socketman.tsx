import * as Fbemit from 'fbemitter';
import * as WsWH   from './-ex-ts/Websocket Protocol What-ho'
import * as WsMsg  from './-ex-ts/Websocket Protocol Messages'

class Socket {
    host_name: string;
    host_icon: string;
    host_port: number;
    host_long_name: string;
    host_version: string;
    connected: boolean;
    welcomed: boolean;

    socket: WebSocket;
}

export class SocketStateInfo {
    host_name: string;
    host_icon: string;
    host_port: number;
    host_long_name: string;
    host_version: string;
    available: boolean;
}

export interface ISocketResponseHandler {
    on_success(msg: WsMsg.Message): void;
    on_failure(msg: WsMsg.Message): void;
}

export class SocketResponseHandler implements ISocketResponseHandler {
    message_id: number;
    one_time_use: boolean;
    on_success(msg: WsMsg.Message): void { msg; }
    on_failure(msg: WsMsg.Message): void { msg; }
}

export class Socketman {
    static Current_Sockets = new Array<Socket>();
    static Open_Sockets = new Map<string, Socket>();
    static Pending_Handlers = new Map<number, SocketResponseHandler>();

    static Next_Free_Message_ID            = 1;

    static Event_Name_Any                  = 'any';
    static Event_Name_Socket_Enum_Changed  = 'enum';
    static Event_Name_Socket_State_Changed = 'state';
    static Event_Name_Socket_Connect(name: string): string { return 'connect ' + name; };
    static Event_Name_Socket_Disconnect(name: string): string { return 'connect ' + name; };

    static Events_Socket_Change: Fbemit.EventEmitter = new Fbemit.EventEmitter();
    static Connect_Timeout: NodeJS.Timeout;

    static commence(): void {
        console.log("Socketman: commencing");
        this.fetch_connexion_enum();

        let self = this;
        this.Connect_Timeout = setTimeout(function () { self.try_connect_sockets(); }, 1000);
    }

    static get_socket_state_info(): Array<SocketStateInfo> {
        let array = new Array<SocketStateInfo>();

        for (let index = 0; index < this.Current_Sockets.length; ++index) {
            let value = this.Current_Sockets[index];
            let info = new SocketStateInfo();
            info.host_name      = value.host_name;
            info.host_icon      = value.host_icon;
            info.host_port      = value.host_port;
            info.available      = value.welcomed;
            info.host_version   = value.host_version;
            info.host_long_name = value.host_long_name;
            array.push(info);
        }

        return array;
    }

    static send_en_passant_on_socket(socket_name:string, message:WsMsg.Message): ISocketResponseHandler|undefined
    {
            // Find open socket
        let socket = this.Open_Sockets.get(socket_name);
        if (socket == undefined) {
            console.log("Socketman: Message on non-open socket: '" + socket_name + "'", message);
            return undefined;
        }

        let res_handler: SocketResponseHandler|undefined = undefined;

            // Create en passant routing info
        message.Recipient_ID        = 0;
        message.Reply_To_Me_ID      = 0;

        if (message.get_requires_response()) {
            res_handler = this.create_response_handler(socket as Socket);
            message.Reply_To_Me_ID = res_handler.message_id;
        }
        
        socket.socket.send(WsMsg.try_stringify_message(message));

        return res_handler;
    }

    static create_response_handler(socket: Socket): SocketResponseHandler {
            // For now messy way of getting free message id
        let id = this.Next_Free_Message_ID;
        while (this.Pending_Handlers.has(id)) {
            id = this.Next_Free_Message_ID = (this.Next_Free_Message_ID + 1) & 0xFFFF;
        }

        let ret = new SocketResponseHandler();
        ret.message_id = id;
        this.Pending_Handlers.set(id, ret);

        return ret;
    }

    static deliver_to_response_handler(msg: WsMsg.Message) {
        let _handler = this.Pending_Handlers.get(msg.Recipient_ID);
        if (_handler === undefined) {
            throw "Unknown handler requested as recipient ID: " + msg.Recipient_ID;
        }

        let handler = _handler as SocketResponseHandler;

        console.log(handler);

        if (msg.get_has_succeeded()) {
            handler.on_success(msg);
        }
        else {
            handler.on_failure(msg);
        }

        if (handler.one_time_use) {
            this.Pending_Handlers.delete(msg.Recipient_ID);
        }
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
        console.log("Socketman: Updating connexion enum", json);

        this.Current_Sockets = new Array<Socket>();

        for (let index = 0; index < json.length; ++index) {
            let value = json[index];
            let socket: Socket = new Socket();
            socket.host_name = value["name"];
            socket.host_long_name = value["long_name"];
            socket.host_icon = value["icon"];
            socket.host_port = value["port"];
            socket.host_version = "?";
            socket.connected = false;

            this.Current_Sockets.push(socket);
        }

        this.try_connect_sockets();
        this.Events_Socket_Change.emit(this.Event_Name_Any);
        this.Events_Socket_Change.emit(this.Event_Name_Socket_Enum_Changed);
    }

    static try_connect_sockets() {
        for (let index = 0; index < this.Current_Sockets.length; ++index) {
            let state = this.Current_Sockets[index];

            if (state.connected)
                continue;

            let ws = state.socket = new WebSocket('ws://' + location.hostname + ':' + state.host_port);
            state.socket.binaryType = 'arraybuffer';

            let self = this;

            ws.onopen = function () {
                console.log('Socketman: connected ' + state.host_name);
                state.connected = true;
                state.welcomed = false;

                let prop = new WsWH.ClientProperties;
                prop.Client_Name = "Iris Web (" + navigator.userAgent + ")";
                prop.Client_Version = "v0.0.1"

                ws.send(WsWH.create_what_ho_message(prop));
            };

            ws.onclose = function () {
                console.log('disconnected ' + state.host_name);
                let last_state = state.connected;
                state.connected = false;
                state.welcomed = false;
                if (last_state != false) {
                    self.Open_Sockets.delete(state.host_name);
                    self.Events_Socket_Change.emit(self.Event_Name_Socket_Connect(state.host_name));
                    self.Events_Socket_Change.emit(self.Event_Name_Socket_State_Changed);
                    self.Events_Socket_Change.emit(self.Event_Name_Any);
                }
            };

            ws.onmessage = function (message: any) {
                console.log(message);

                    // If we are not connected yet, the response
                    // must be the protocol message
                if (!state.welcomed) {
                    let prop = WsWH.parse_what_ho_response(new Uint8Array(message.data));
                    state.welcomed = true;

                    state.host_long_name = prop.Server_Name;
                    state.host_version = prop.Server_Version;
                    
                    self.Open_Sockets.set(state.host_name, state);

                    console.log('welcomed ' + state.host_name);
                    self.Events_Socket_Change.emit(self.Event_Name_Socket_Disconnect(state.host_name));
                    self.Events_Socket_Change.emit(self.Event_Name_Socket_State_Changed);
                    self.Events_Socket_Change.emit(self.Event_Name_Any);

                    let msg = new WsMsg.Message();
                    msg.String            = "ping";
                    msg.set_requires_repsonse(true);

                    let handler = self.send_en_passant_on_socket(state.host_name, msg) as SocketResponseHandler;
                    handler.on_success = function (s_msg: WsMsg.Message) {
                        console.log("huzzah! " + s_msg.String);
                        console.log(new TextDecoder().decode(s_msg.Segments.get(0) as Uint8Array));
                    }

                    return;
                }
                
                let des = WsMsg.try_parse_message(new Uint8Array(message.data));
                console.log(new TextDecoder().decode(des.Segments.get(0) as Uint8Array));
            };
        }

        clearTimeout(this.Connect_Timeout);
        let self = this;
        this.Connect_Timeout = setTimeout(function () { self.try_connect_sockets(); }, 5000);
    }
}