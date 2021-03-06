/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

//import * as React from 'react';
import { Socketman, ISocketConduit, SocketSendInstr, ConduitOpenInstr, ConduitInfo, SocketStateInfo } from './socketman';
import * as WsMsg  from './-ex-ts/Websocket Protocol Messages'
import * as LayProt from './-ex-ts/Layouts Protocol'
import * as WidgetIntf from './-ex-ts/Widget Interfaces'
import * as React from 'react';
import * as Fbemit from 'fbemitter';
import * as ReactJson from 'react-json-view';
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
    Posts = new Array<EmitPost>();
}

export class EmitPost implements WidgetIntf.IPostProps {
    obj: any;
    ID: string = "n/a";
    receive_time: Date = new Date(0);
    latency: number = -1;
    emitter_title: string = "";
    re_user_action: string = "";
    generic_body: any = undefined;
    generic_is_ok: any = undefined;
    data_list = new Array<any>();
}

export interface IDragObjectImpl {
    onBegin(Data: DragObject): void;
    onEnd(Data: DragObject): void;
    render(Mode: string, Data: DragObject): JSX.Element;
    emit_post_on(obj: DragObject, post: EmitPost): void;
}

export class DragWrangler {
    static Socketman_Subscription_Enum: Fbemit.EventSubscription;
    static Socketman_Subscription_State: Fbemit.EventSubscription;

    static Events_Side_Panel: Fbemit.EventEmitter = new Fbemit.EventEmitter();
    static Event_Name_Side_Panel_UUID = 'side-panel-uuid-changed';
    static Event_Name_Loadout_UUID = 'loadout-uuid-changed';

    static Side_Panel_ID: string;
    static Current_Loadout_ID: string;
    static Pending_Updates = Array<any>();

    static Object_Map = new Map<string, DragObject>();
    static Object_Implementations = new Map<string, IDragObjectImpl>();

    static Conduit_Iris: ISocketConduit;
    
    static Suspend_Because_Of_Updating = false;
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

            // Get uuid for the persistent panel
        let msg = new WsMsg.Message();
        msg.String = "get_uuid_for_name";
        msg.Segments.set("", (new TextEncoder()).encode(JSON.stringify({ "name" : LayProt.Protocol.Name_User_Persistent_Panel })));
        msg.set_accepts_response(true);

        let instr = new SocketSendInstr();
        instr.on_success = function (msg: WsMsg.Message) {
            let dec = JSON.parse((new TextDecoder('utf-8')).decode(msg.Segments.get("")));

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
            console.log("DragWrangler: Could not get persistent panel id!", msg);
        }

        instr.message = msg;
        this.Conduit_Iris.send_message(instr);

            // Get uuid for the default loadout
        msg = new WsMsg.Message();
        msg.String = "get_uuid_for_name";
        msg.Segments.set("", (new TextEncoder()).encode(JSON.stringify({ "name" : "lo-default-default", "add" : true })));
        msg.set_accepts_response(true);

        instr = new SocketSendInstr();
        instr.on_success = function (msg: WsMsg.Message) {
            let dec = JSON.parse((new TextDecoder('utf-8')).decode(msg.Segments.get("")));

            let uuid = dec["uuid"];
            if (typeof (uuid) != 'string') {
                console.log("DragWrangler: Invalid return to 'get_uuid_for_name'", dec);
                return;
            }
            
            self.Current_Loadout_ID = uuid;
            self.Events_Side_Panel.emit(self.Event_Name_Loadout_UUID, { set_uuid: uuid } );
            self.req_iris_update_replace([ self.Current_Loadout_ID ]);
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
        msg.Segments.set("", (new TextEncoder()).encode(JSON.stringify(ids)));
        msg.set_accepts_response(true);
        
        let instr = new SocketSendInstr();
        instr.on_success = function (msg: WsMsg.Message) {
            let dec = JSON.parse((new TextDecoder('utf-8')).decode(msg.Segments.get("")));
            console.log(dec);

            for (let result in dec){
               self.schedule_iris_update( { type: "update-item", uuid: result, ...dec[result] });
            }

            self.try_apply_iris_updates();
        }
        instr.on_failure = function () {
            console.log("DragWrangler: Could not get state for " + ids);
        }
        
            console.log("HMMM", msg);

        instr.message = msg;
        this.Conduit_Iris.send_message(instr);
    }

    static schedule_iris_update(update: any)
    {
        this.Pending_Updates.push(update);
    }

    static send_iris_update(update: any)
    {
        console.log("send_iris_update", update);

            // Send a message which will perform
            // this update on the server side
        let msg = new WsMsg.Message();
        msg.String = "update_state_for_uuid";
        msg.Segments.set("", (new TextEncoder()).encode(JSON.stringify(update)));
        msg.set_accepts_response(false);
        
        let instr = new SocketSendInstr();
        instr.message = msg;
        
        this.Conduit_Iris.send_message(instr);

            // Pretend iris immediately responsed
            // i.e., client side prediction
        this.schedule_iris_update(update);
        this.try_apply_iris_updates();
    }

    static try_apply_iris_updates()
    {
        if (0 == this.Pending_Updates.length)
            return;

        if (this.Suspend_Because_Of_Dragging)
            return;
        if (this.Suspend_Because_Of_Updating)
            return;
        
        this.Suspend_Because_Of_Updating = true;

        console.log("DragWrangler: Applying iris updates", this.Pending_Updates);

        let new_ids = Array<string>();

        let update_length = this.Pending_Updates.length;
        for (let i = 0; i < update_length; i++) {
            let item:any = this.Pending_Updates[i];

            console.log(item);
            
            let _obj = this.find_by_uuid(item.uuid);
            if (_obj === undefined) {
                console.log("DragWrangler: Skip item", item);
                continue;   
            }
            let obj = _obj as DragObject;

            if (item.type == LayProt.Protocol.Name_Action_Update_Item) {
                console.log("DragWrangler: Update item", obj, item);
                
                if (item.base_type_name !== undefined &&
                    obj.Type_Name != item.base_type_name)
                {
                    if (undefined !== obj.Implementation) {
                        obj.Implementation.onEnd(obj);
                    }

                    obj.Type_Name      = item.base_type_name;
                    obj.Implementation = this.Object_Implementations.get(obj.Type_Name);

                    obj.Implement_Init = false;
                }
                
                if (item.children !== undefined) {
                    this.make_children_orphan(item);
                    obj.Children_ID    = item.children;
                    
                    for (let c = 0; c < obj.Children_ID.length; c++) {
                        let child_obj = this.find_by_uuid(obj.Children_ID[c]);
                        if (undefined === child_obj) {
                            new_ids.push(obj.Children_ID[c]);
                            continue;
                        }
                        this.ensure_object_parent(child_obj as DragObject, obj);
                    }
                }
                
                console.log("HMM ------------------------- desc", item.desc);

                if (item.desc !== undefined) {
                    obj.Data.Desc      = item.desc;
                }

                if (obj.Holder !== undefined) {
                    obj.Holder.forceUpdate();
                }

                if (item.uuid == this.Current_Loadout_ID) {
                    console.log("DESK", item)
                    if (obj.Type_Name == "dummy") {
                        this.send_iris_update( {
                            type: LayProt.Protocol.Name_Action_Update_Item, uuid: obj.ID,
                            base_type_name : "desk"
                        });
                    }
                }
            }
            if (item.type == LayProt.Protocol.Name_Action_Update_Children) {
                console.log("DragWrangler: Change children", item);
                
                    // Technically we should only care about the
                    // slient key (rather than children), but we
                    // trust the server implicitly and just copy
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

        this.Pending_Updates.splice(0, update_length);
        
        this.Suspend_Because_Of_Updating = false;
        this.try_apply_iris_updates();
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

    static dnd_drop(parent: DragObject, e: DropResult, extra: any) {
        let obj = e.payload.child as DragObject;
        
        if (e.addedIndex === null)
            return;

        console.log("dnd_drop", parent, obj, e);
        
        if (e.payload.mode !== undefined && e.payload.mode == "copy") {
            obj = this.copy_object(obj);
            console.log("dnd_drop copy", obj);
        }
        if (extra.transmute !== undefined) {
            console.log("dnd_drop transmute", obj, extra.transmute);
            this.send_iris_update( { type: LayProt.Protocol.Name_Action_Update_Item, uuid: obj.ID, base_type_name: extra.transmute });
        }

        if (obj.Parent_ID == parent.ID) {
            parent.Children_ID.splice(e.removedIndex as number, 1);
        }

        let new_child_id = parent.Children_ID.slice();

        new_child_id.splice(e.addedIndex as number, 0, obj.ID as string);

        function onlyUnique(value:any, index:any, self:any) { 
            return self.indexOf(value) === index;
        }
        new_child_id = new_child_id.filter(onlyUnique);
        
        this.send_iris_update( { type: LayProt.Protocol.Name_Action_Update_Children, uuid: parent.ID, children: new_child_id, salient: [ obj.ID ] });
        this.try_apply_iris_updates();
    }

    static find_by_uuid(uuid: string): DragObject|undefined {
        return this.Object_Map.get(uuid);
    }
    
    static create_empty_object_with_uuid(uuid: string): DragObject {
        let obj = new DragObject();
        obj.ID = uuid;
        obj.Type_Name = "dummy";
        obj.Implementation = this.Object_Implementations.get("none");
        
        this.Object_Map.set(uuid, obj);

        return obj;
    }
    
    static copy_object(template: DragObject): DragObject {
        let obj = this.create_empty_object_with_uuid(uuidv1());
        
        this.send_iris_update( { type: LayProt.Protocol.Name_Action_Create_Item, uuid: obj.ID });
        this.send_iris_update( { type: LayProt.Protocol.Name_Action_Update_Item, uuid: obj.ID, Type_Name: template.Type_Name, desc: template.Data.Desc });

        return obj;
    }

    static handle_object_updated(obj: DragObject)
    {
        this.send_iris_update( { type: LayProt.Protocol.Name_Action_Update_Item, uuid: obj.ID, Type_Name: obj.Type_Name, desc: obj.Data.Desc });
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
            msg.set_accepts_response(true);

            let instr = new ConduitOpenInstr();
            instr.host_name  = "ir";
            instr.message    = msg;

            instr.on_success = function (msg: WsMsg.Message) {
                self.update_everything();
            }

            this.Conduit_Iris = Socketman.open_conduit(instr);
            this.Conduit_Iris.on_receive_message = function (msg: WsMsg.Message) {
                if (msg.String == "update_state_for_uuid") {
                    console.log("update", msg);
                    self.schedule_iris_update(JSON.parse((new TextDecoder('utf-8')).decode(msg.Segments.get(""))));
                    self.try_apply_iris_updates();
                    return;
                }
                console.log("Draggables receive message", msg);
            }
            this.Conduit_Iris.on_receive_info = function (info: ConduitInfo) {
                console.log("Draggables receive info", info);
            }
        }
    }

    static emit_post_on_object(post: EmitPost) {
        let parent = this.find_by_uuid(post.obj.Parent_ID);

        if (parent !== undefined) {
            let ac_parent = parent as DragObject;
            if (ac_parent.Implementation && ac_parent.Implementation.emit_post_on(ac_parent, post)) {
                return;
            }

            console.log("%c Could not emit post on object", "font-weight: bold; background: #FDD", parent, post);
        }
        
        console.log("%c Could not emit post for object: no parent", "font-weight: bold; background: #FDD", post);
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

interface IPostHolder {
    post: EmitPost;
}

export class EmitPostHolder extends React.PureComponent<IPostHolder, object> {
    state = { post: new EmitPost() };

    constructor(prop: any) {
        super(prop);
        this.state.post = prop.post;
    }

    render() {
        let post = this.props.post;
        let elem = new Array<any>();

        if (post === undefined)
            return (<div>uh oh</div>);

        if (post.receive_time.getTime() != 0) {
            var h = post.receive_time.getHours();
            var m = post.receive_time.getMinutes();
            var s = post.receive_time.getSeconds();

            var time_string =   ((h < 10) ? "0" + h : h) + ":"
                              + ((m < 10) ? "0" + m : m) + ":"
                              + ((s < 10) ? "0" + s : s);

            if (post.latency != -1) {
                time_string += " (" + post.latency + "ms)";
            }

            elem.push(<div className="time">{time_string}</div>);
        }

        if (post.generic_is_ok !== undefined) {
            if (post.generic_is_ok === "OK") {
                elem.push(<div className="generic-is-ok ok">{'\u2713'}</div>);
            }
            else if (post.generic_is_ok === "FAILED") {
                elem.push(<div className="generic-is-ok failed">{'\u2718'}</div>);
            }
        }

        if (post.emitter_title.length > 0) {
            elem.push(<div className="title">{post.emitter_title}</div>);
        }

        if (post.re_user_action.length > 0) {
            elem.push(<div className="re-user-action">{post.re_user_action}</div>);
        }

        if (post.generic_body !== undefined) {
            elem.push(<div className="body">{post.generic_body}</div>);
        }

        for (let i = 0; i < post.data_list.length; i++) {
            let con = post.data_list[i];
            if (typeof (con) === 'string') {
                elem.push(<div>{con}</div>);
                continue;
            }
            if (typeof (con) === 'object') {
                elem.push(<ReactJson.default collapsed={2} sortKeys={true} indentWidth={2} enableClipboard={false}
                                 displayObjectSize={false} displayDataTypes={false} theme={{
                                    base00: 'rgba(0, 0, 0, 0)',
                                    base01: '#073642',
                                    base02: '#586e75',
                                    base03: '#657b83',
                                    base04: '#839496',
                                    base05: '#93a1a1',
                                    base06: '#eee8d5',
                                    base07: '#fdf6e3',
                                    base08: '#dc322f',
                                    base09: '#cb4b16',
                                    base0A: '#b58900',
                                    base0B: '#859900',
                                    base0C: '#2aa198',
                                    base0D: '#268bd2',
                                    base0E: '#6c71c4',
                                    base0F: '#d33682'
                        }} src={con} />);
                continue;
            }
            elem.push(<div className="line">Unknown element</div>);
        }
        
        return (<div className="post">{...elem}</div>);
    }
}