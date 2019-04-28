/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

//import * as React from 'react';
import { Socketman, ISocketConduit, SocketSendInstr, ConduitOpenInstr, ConduitInfo, SocketStateInfo } from './socketman';
import * as WsMsg  from './-ex-ts/Websocket Protocol Messages'
import * as LayProt from './-ex-ts/Layouts Protocol'
import * as React from 'react';
import * as Fbemit from 'fbemitter';
import { DragStartParams, DragEndParams, DropResult } from "react-smooth-dnd";
import './-gen/app.css';

const uuidv1 = require('uuid/v1');

export interface IDragObjectHolder {
    object_uuid: string;
    parent_uuid: string;
    mode: string;
}

export class DragObject {
    Holder: DragObjectHolder|undefined = undefined;
    ID: string = "n/a";
    Parent_ID: string = "00000000-0000-0000-0000-000000000000";
    Children_ID: Array<string> = [];
    Type_Name: string = "none";
    Data: any = {};
    Implementation: IDragObjectImpl|undefined = undefined;
    Implement_Init = false;
}

export interface IDragObjectImpl {
    onBegin(Data: DragObject): void;
    onEnd(Data: DragObject): void;
    render(Mode: string, Data: DragObject): JSX.Element;
}

export class DragWrangler {
    static Socketman_Subscription_Enum: Fbemit.EventSubscription;
    static Socketman_Subscription_State: Fbemit.EventSubscription;

    static Events_Side_Panel: Fbemit.EventEmitter = new Fbemit.EventEmitter();
    static Event_Name_Side_Panel_UUID = 'uuid-changed';

    static Side_Panel_ID: string;
    static Pending_Updates = Array<any>();

    static Object_Map = new Map<string, DragObject>();
    static Object_Implementations = new Map<string, IDragObjectImpl>();

    static Conduit_Iris: ISocketConduit;

    static Suspend_Because_Of_Dragging = false;

    static register_implementation(name: string, implementation: IDragObjectImpl) {
        this.Object_Implementations.set(name, implementation);
    }

    static commence() {
        console.log("Draggables commencing");

        let self = this;
        this.Socketman_Subscription_Enum  = Socketman.Events_Socket_Change.addListener(Socketman.Event_Name_Socket_Enum_Changed,  function () { self.update_sockets() });
        this.Socketman_Subscription_State = Socketman.Events_Socket_Change.addListener(Socketman.Event_Name_Socket_State_Changed, function () { self.update_sockets() });
    }

    static update_everything() {
        let self = this;

        let msg = new WsMsg.Message();
        msg.String = "get_uuid_for_name";
        msg.Segments.set(0, (new TextEncoder()).encode(JSON.stringify({ "name" : LayProt.Protocol.Name_User_Persistent_Panel })));
        msg.set_requires_repsonse(true);
        console.log(msg);

        let instr = new SocketSendInstr();
        instr.on_success = function (msg: WsMsg.Message) {
            let dec = JSON.parse((new TextDecoder('utf-8')).decode(msg.Segments.get(0)));

            let uuid = dec["uuid"];
            if (typeof (uuid) != 'string') {
                console.log("DragWrangler: Invalid return to 'get_uuid_for_name'", dec);
                return;
            }
            
            self.Side_Panel_ID = uuid;
            self.Events_Side_Panel.emit(self.Event_Name_Side_Panel_UUID, { set_uuid: uuid } );
            self.req_iris_update_replace([ self.Side_Panel_ID ]);
        }
        instr.on_failure = function (msg: WsMsg.Message) {
            console.log("DragWrangler: Could not get id!", msg);
        }

        instr.message = msg;
        this.Conduit_Iris.send_message(instr);
    }

    static req_iris_update_replace(ids: Array<string>) {
        let self = this;

        let msg = new WsMsg.Message();
        msg.String = "get_state_for_uuids";
        msg.Segments.set(0, (new TextEncoder()).encode(JSON.stringify(ids)));
        msg.set_requires_repsonse(true);
        
        let instr = new SocketSendInstr();
        instr.on_success = function (msg: WsMsg.Message) {
            let dec = JSON.parse((new TextDecoder('utf-8')).decode(msg.Segments.get(0)));
            console.log(dec);

            for (let result in dec){
               self.schedule_iris_update( { type: "update-item", uuid: result, value: dec[result] });
            }

            self.try_apply_iris_updates();
        }
        instr.on_failure = function () {
            console.log("DragWrangler: Could not get state for " + ids);
        }

        instr.message = msg;
        this.Conduit_Iris.send_message(instr);
    }

    static schedule_iris_update(update: any)
    {
        this.Pending_Updates.push(update);
    }

    static send_iris_update(update: any)
    {
            // Send a message which will perform
            // this update on the server side
        let msg = new WsMsg.Message();
        msg.String = "update_item";
        msg.Segments.set(0, (new TextEncoder()).encode(JSON.stringify(update)));
        msg.set_requires_repsonse(false);
        
        let instr = new SocketSendInstr();
        instr.message = msg;
        
        this.Conduit_Iris.send_message(instr);

            // Pretend iris immediately responsed
            // i.e., client side prediction
        this.schedule_iris_update(update);
    }

    static try_apply_iris_updates()
    {
        console.log("DragWrangler: Applying iris updates", this.Pending_Updates);

        let new_ids = Array<string>();

        for (let i = 0; i < this.Pending_Updates.length; i++) {
            let item:any = this.Pending_Updates[i];
            
            let _obj = this.find_by_uuid(item.uuid);
            if (_obj === undefined) {
                console.log("DragWrangler: Skip item", item);
                continue;
            }
            let obj = _obj as DragObject;

            if (item.type == "update-item") {
                console.log("DragWrangler: Update item", item);
                
                if (obj.Type_Name != item.value.base_type_name) {
                    if (undefined !== obj.Implementation) {
                        obj.Implementation.onEnd(obj);
                    }

                    obj.Type_Name      = item.value.base_type_name;
                    obj.Implementation = this.Object_Implementations.get(obj.Type_Name);

                    obj.Implement_Init = false;
                }
                
                this.make_children_orphan(item);
                obj.Children_ID    = item.value.children;
                obj.Data.Desc      = item.value.description;
                
                if (obj.Children_ID !== undefined) {
                    for (let c = 0; c < obj.Children_ID.length; c++) {
                        let child_obj = this.find_by_uuid(obj.Children_ID[c]);
                        if (undefined === child_obj) {
                            new_ids.push(obj.Children_ID[c]);
                            continue;
                        }
                        this.ensure_object_parent(child_obj as DragObject, obj);
                    }
                }

                if (obj.Holder !== undefined) {
                    obj.Holder.forceUpdate();
                }
            }
            if (item.type == "change-children") {
                console.log("DragWrangler: Change children", item);
                
                this.make_children_orphan(item);
                obj.Children_ID = item.children;
                
                if (obj.Children_ID !== undefined) {
                    for (let c = 0; c < obj.Children_ID.length; c++) {
                        let child_obj = this.find_by_uuid(obj.Children_ID[c]);
                        if (undefined === child_obj) {
                            new_ids.push(obj.Children_ID[c]);
                            continue;
                        }
                        this.ensure_object_parent(child_obj as DragObject, obj);
                    }
                }

                console.log(obj);

                if (obj.Holder !== undefined) {
                    obj.Holder.forceUpdate();
                }
            }
        }
        
        if (new_ids.length > 0) {
            console.log("DragWrangler: New ids", new_ids);
            this.req_iris_update_replace(new_ids);
        }

        this.Pending_Updates = [];
    }

    static make_children_orphan(object: DragObject) {
        if (object.Children_ID === undefined)
            return;

        for (let index = 0; index < object.Children_ID.length; index++) {
            let obj = this.find_by_uuid(object.Parent_ID) as DragObject;
            obj.Parent_ID = "";
        }
    }

    static ensure_object_parent(object: DragObject, parent: DragObject) {
        if (object.Parent_ID == parent.ID)
            return;
            
        console.log("DragWrangler: Move", object);

        let _obj = this.find_by_uuid(object.Parent_ID);
        if (_obj === undefined) {
            console.log("Previous parent undefined?!", object);
            return;
        }

        let prev_parent = _obj as DragObject;
        for (let index = 0; index < prev_parent.Children_ID.length; index++) {
            if (prev_parent.Children_ID[index] != object.ID)
                continue;
            prev_parent.Children_ID.splice(index, 1);
        }
            
        if (prev_parent.Holder === undefined)
            return;

        (prev_parent.Holder as DragObjectHolder).forceUpdate();
    }

    static dnd_begin_drag(parent: DragObject, e: DragStartParams) {
        this.Suspend_Because_Of_Dragging = true;
    }

    static dnd_end_drag(parent: DragObject, e: DragEndParams) {
        this.Suspend_Because_Of_Dragging = false;
        this.try_apply_iris_updates();
    }

    static dnd_drop(parent: DragObject, e: DropResult) {
        let obj = this.find_by_uuid(e.payload as string) as DragObject;
        
        if (obj.Parent_ID == parent.ID) {
            parent.Children_ID.splice(e.removedIndex as number, 1);
        }

        let new_child_id = parent.Children_ID.slice();

        new_child_id.splice(e.addedIndex as number, 0, e.payload as string);
        
        this.send_iris_update( { type: "change-children", uuid: parent.ID, children: new_child_id });
        this.try_apply_iris_updates();
    }

    static find_by_uuid(uuid: string): DragObject|undefined {
        return this.Object_Map.get(uuid);
    }
    
    static create_empty_object_with_uuid(uuid: string): DragObject {
        let obj = new DragObject();
        obj.ID = uuid;
        obj.Implementation = this.Object_Implementations.get("none");
        return obj;
    }

    static obtain_object_for_holder(uuid: string, parent: string, holder: DragObjectHolder): DragObject {
        let _obj = this.find_by_uuid(uuid);
        if (_obj === undefined) {
            _obj = this.create_empty_object_with_uuid(uuid);
        }

        let obj = _obj as DragObject;
        obj.Holder = holder;
        obj.Parent_ID = parent;

        this.Object_Map.set(uuid, obj);

        return obj;
    }

    static update_sockets(): void {
        console.log("DragWrangler: update sockets");
        
            // Obtain a list of all current sockets
        let _info = Socketman.get_socket_state_info('ir');
        if (_info === undefined)
            return;
        let info = _info as SocketStateInfo;
        
            // Check iris' state
        if (this.Conduit_Iris == undefined || !this.Conduit_Iris.Is_Currently_Open) {
            if (!info.available)
                return;
                    
            let self = this;

            let msg = new WsMsg.Message();
            msg.String            = "lay/conduit_connect_layouts";
            msg.set_requires_repsonse(true);

            let instr = new ConduitOpenInstr();
            instr.host_name  = "ir";
            instr.message    = msg;

            instr.on_success = function (msg: WsMsg.Message) {
                self.update_everything();
            }

            this.Conduit_Iris = Socketman.open_conduit(instr);
            this.Conduit_Iris.on_receive_message = function (msg: WsMsg.Message) {
                console.log("Draggables receive message", msg);
            }
            this.Conduit_Iris.on_receive_info = function (info: ConduitInfo) {
                console.log("Draggables receive info", info);
            }
        }
    }

    static get_unique_uuid(): string {
        return uuidv1();
    }
}

export class DragObjectHolder extends React.PureComponent<IDragObjectHolder, object> {
    state = { object_uuid: "", parent_uuid: "", drag_object: new DragObject(), mode: "none", mode_init: false };

    constructor(prop: any) {
        super(prop);
        this.state.object_uuid = prop.object_uuid;
        this.state.parent_uuid = prop.parent_uuid;
        this.state.mode        = prop.mode;
    }
    
    componentDidMount() {
        this.setState({ drag_object: DragWrangler.obtain_object_for_holder(this.state.object_uuid, this.state.parent_uuid, this) });
    }

    render() {
        console.log("Rendering holder (" + this.state.object_uuid + ")", this.state.drag_object)
        
        if (!this.state.drag_object.Implement_Init) {
            if (this.state.drag_object.Implementation !== undefined) {
                (this.state.drag_object.Implementation as IDragObjectImpl).onBegin(this.state.drag_object);
            }
            this.state.drag_object.Implement_Init = true;
        }

        if (this.state.mode == "none") {
            return (<div>loading</div>);
        }
        if (this.state.drag_object.Implementation == undefined) {
            console.log(this);
            return (<div>n/a</div>);
        }
        
        return (this.state.drag_object.Implementation as IDragObjectImpl).render(this.state.mode, this.state.drag_object);
    }
}