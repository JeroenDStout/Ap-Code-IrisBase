import * as Fbemit from 'fbemitter';
import * as WsWH   from './-ex-ts/Websocket Protocol What-ho'
import * as WsMsg  from './-ex-ts/Websocket Protocol Messages'
import * as WsSh   from './-ex-ts/Websocket Protocol Shared'
import * as WidInf from './-ex-ts/Widget Interfaces'
const { detect } = require('detect-browser');
const browser = detect();

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

export class ConduitInfo {
}

export interface ISocketResponseHandler extends WidInf.ISocketResponseHandler {
    on_success(msg: WsMsg.Message): void;
    on_failure(msg: WsMsg.Message): void;
}

export class SocketSendInstr implements WidInf.ISocketSendInstr {
    host_name: string;
    message: WsMsg.Message;
    on_success(msg: WsMsg.Message): void { msg; };
    on_failure(msg: WsMsg.Message|undefined): void { msg; };
}

export interface ISocketConduit {
    Is_Currently_Open: boolean;
    Has_Been_Closed: boolean;

    on_receive_message(msg: WsMsg.Message): void;
    on_receive_info(msg: ConduitInfo): void;

    send_message(instr: SocketSendInstr): void;
}

class SocketConduit implements ISocketConduit {
    Is_Currently_Open = false;
    Has_Been_Closed = false;
    
    Conduit_ID: number;
    Recipient_ID: number;
    Socket: Socket;
    Original_Handler: SocketResponseHandler;

    on_receive_message(msg: WsMsg.Message): void {
        console.log("Unhandled message", msg);
    }
    on_receive_info(msg: ConduitInfo): void {
        console.log("Unhandled info", msg);
    }

    send_message(instr: SocketSendInstr): void {
        instr.message.Recipient_ID   = this.Recipient_ID;
        instr.host_name              = this.Socket.host_name;
        Socketman.send_message_on_socket(instr);
    }
}

export class ConduitOpenInstr {
    host_name: string;
    message: WsMsg.Message;
    on_success(msg: WsMsg.Message): void { msg; };
    on_failure(msg: WsMsg.Message): void { msg; };
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
    static Current_Conduits = new Map<number, SocketConduit>();

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

    static get_socket_state_info(name: string): SocketStateInfo|undefined {
        let ret = new SocketStateInfo();

        for (let index = 0; index < this.Current_Sockets.length; ++index) {
            let value = this.Current_Sockets[index];
            if (value.host_name != name)
                continue;
                
            ret.host_name      = value.host_name;
            ret.host_icon      = value.host_icon;
            ret.host_port      = value.host_port;
            ret.available      = value.welcomed;
            ret.host_version   = value.host_version;
            ret.host_long_name = value.host_long_name;
            return ret;
        }

        return undefined;
    }

    static send_message_on_socket(instr:SocketSendInstr): ISocketResponseHandler|undefined
    {
        if (instr.message === undefined) {
            console.log("Socketman: No message supplied with instructions", instr);
            return undefined;
        }

            // Find open socket
        let socket = this.Open_Sockets.get(instr.host_name);
        if (socket === undefined) {
            console.log("Socketman: Message on non-open socket: '" + instr.host_name + "'", instr.message);
            instr.on_failure(undefined);
            return undefined;
        }

        let res_handler: SocketResponseHandler|undefined = undefined;

        if (instr.message.get_accepts_response()) {
            res_handler = this.create_response_handler(socket as Socket);
            res_handler.on_success = instr.on_success;
            res_handler.on_failure = instr.on_failure;
            instr.message.Reply_To_Me_ID = res_handler.message_id;
        }
        
        socket.socket.send(WsMsg.try_stringify_message(instr.message));

        return res_handler;
    }

    static open_conduit(instr: ConduitOpenInstr): ISocketConduit {
        let conduit = new SocketConduit();
        let self = this;

            // Find open socket
        let socket = this.Open_Sockets.get(instr.host_name);
        if (socket == undefined) {
            console.log("Socketman: Open conduit on non-open socket: '" + instr.host_name + "'", instr.message);
            return conduit;
        }
        
            // Get free id
        conduit.Conduit_ID = this.get_free_id();
        conduit.Socket = socket;

            // Get handler for conduit request
        conduit.Original_Handler = this.create_response_handler(socket);
        conduit.Original_Handler.on_success = function (msg: WsMsg.Message) {
            if (!msg.get_confirm_open_conduit()) {
                this.on_failure(msg);
                return;
            }
            conduit.Is_Currently_Open = true;
            conduit.Has_Been_Closed = false;
            self.Current_Conduits.set(conduit.Original_Handler.message_id, conduit);
            console.log("Conduit open... ", self.Current_Conduits, msg);
            conduit.Recipient_ID = msg.Opened_Conduit_ID;
            instr.on_success(msg);
        }
        conduit.Original_Handler.on_failure = function (msg: WsMsg.Message) {
            console.log("Failed to open conduit!", msg);
            conduit.Is_Currently_Open = false;
            conduit.Has_Been_Closed = true;
            instr.on_failure(msg);
        }
        
            // Create en passant routing info
        instr.message.Recipient_ID    = 0;
        instr.message.Reply_To_Me_ID  = conduit.Original_Handler.message_id;
        
        console.log("Open conduit '" + socket.host_long_name + "', using '" + instr.message.String + "', id " + conduit.Recipient_ID);

            // Send
        socket.socket.send(WsMsg.try_stringify_message(instr.message));

        return conduit;
    }

    static create_response_handler(socket: Socket): SocketResponseHandler {
        let ret = new SocketResponseHandler();
        ret.message_id = this.get_free_id();
        this.Pending_Handlers.set(ret.message_id, ret);

        return ret;
    }

    static get_free_id(): number {
            // For now messy way of getting free message id
        let id = this.Next_Free_Message_ID;
        while (this.Pending_Handlers.has(id) || this.Current_Conduits.has(id)) {
            id = (this.Next_Free_Message_ID = ((this.Next_Free_Message_ID + 1) & 0xFFFFFFFF));
        }
        
        this.Next_Free_Message_ID += 1;

        return id;
    }

    static deliver_to_response_handler(msg: WsMsg.Message) {
        let _handler = this.Pending_Handlers.get(msg.Recipient_ID);
        if (_handler === undefined) {
            throw "Unknown handler requested as recipient ID: " + msg.Recipient_ID;
        }

        let handler = _handler as SocketResponseHandler;

        console.log(msg);

        if (msg.get_is_OK()) {
            handler.on_success(msg);
        }
        else {
            handler.on_failure(msg);
        }

        if (handler.one_time_use) {
            this.Pending_Handlers.delete(msg.Recipient_ID);
        }
    }

    static deliver_to_conduit(msg: WsMsg.Message) {
        let _handler = this.Current_Conduits.get(msg.Recipient_ID);
        if (_handler === undefined) {
            throw "Unknown handler requested as recipient ID: " + msg.Recipient_ID;
        }

        let handler = _handler as SocketConduit;
        console.log(handler);

        handler.on_receive_message(msg);
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
                prop.Client_Name = "Iris Web (" + browser.name + ")";
                prop.Client_Version = WsSh.Protocol.Version;

                ws.send(WsWH.create_what_ho_message(prop));
            };

            ws.onclose = function () {
                console.log('disconnected ' + state.host_name);
                let last_state = state.connected;
                state.connected = false;
                state.welcomed = false;
                if (last_state != false) {
                    self.Open_Sockets.delete(state.host_name);

                    console.log(self.Event_Name_Socket_Disconnect(state.host_name));

                    self.Events_Socket_Change.emit(self.Event_Name_Socket_Disconnect(state.host_name));
                    self.Events_Socket_Change.emit(self.Event_Name_Socket_State_Changed);
                    self.Events_Socket_Change.emit(self.Event_Name_Any);
                }
            };

            ws.onmessage = function (message: any) {
                    // If we are not connected yet, the response
                    // must be the protocol message
                if (!state.welcomed) {
                    let prop = WsWH.parse_what_ho_response(new Uint8Array(message.data));
                    state.welcomed = true;

                    state.host_long_name = prop.Server_Name;
                    state.host_version = prop.Server_Version;
                    
                    self.Open_Sockets.set(state.host_name, state);
                    
                    console.log(self.Event_Name_Socket_Connect(state.host_name));

                    console.log('Socketman: welcomed ' + state.host_name);
                    self.Events_Socket_Change.emit(self.Event_Name_Socket_Connect(state.host_name));
                    self.Events_Socket_Change.emit(self.Event_Name_Socket_State_Changed);
                    self.Events_Socket_Change.emit(self.Event_Name_Any);

                        // Debug: send rq for stats!
                    let msg = new WsMsg.Message();
                    msg.String            = "stats";
                    msg.set_accepts_response(true);

                    let instr = new SocketSendInstr();
                    instr.host_name = state.host_name;
                    instr.message   = msg;

                    instr.on_success = function (s_msg: WsMsg.Message) {
                        console.log("Asked " + state.host_long_name + " for stats:", s_msg.get_segment_as_json(""));
                    }
                    instr.on_failure = function (s_msg: WsMsg.Message) {
                        console.log("Asked " + state.host_long_name + " for stats, but got failure: ", s_msg.String);
                    }

                    self.send_message_on_socket(instr);
                    return;
                }
                
                let msg = WsMsg.try_parse_message(new Uint8Array(message.data));
                console.log("Message from '" + state.host_long_name + "'", msg);
                
                if (msg.get_is_response()) {
                    self.deliver_to_response_handler(msg);
                }
                else {
                    self.deliver_to_conduit(msg);
                }
            };
        }

        clearTimeout(this.Connect_Timeout);
        let self = this;
        this.Connect_Timeout = setTimeout(function () { self.try_connect_sockets(); }, 5000);
    }
}