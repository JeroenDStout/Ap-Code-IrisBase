/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Socketman, SocketSendInstr } from './socketman';
import * as WsMsg  from './-ex-ts/Websocket Protocol Messages'
import * as React  from 'react'
import { DragObject, DragObjectHolder } from "./draggables";
import { IWidgetCollection, IWidgetCreator }  from './-ex-ts/Widget Interfaces'

const iris_connexion_name = "ir";

class PendingData {
    Awaiting = new Array<WidgetCollection>();
}

export class WidgetDepo {
    static Widget_Implementations = new Map<string, IWidgetCreator>();
    static Widget_Collections     = new Array<WidgetCollection>();
    static Pending_List           = new Map<string, PendingData>();

    static get_collection(Obj: DragObject): IWidgetCollection {
        let collection = new WidgetCollection();
        collection.Owner = Obj;
        this.Widget_Collections.push(collection);
        return collection;
    }

    static release_collection(collection: IWidgetCollection) {
        for (let i = 0; i < this.Widget_Collections.length; i++) {
            if (this.Widget_Collections[i] !== collection)
                continue;
            this.Widget_Collections.splice(i, 1);
            return;
        }
    }

    static obtain_or_request_creator_for_collection(collection: WidgetCollection, connexion: string, name: string): IWidgetCreator {
        let full_name = connexion + "::" + name;
        let req = WidgetDepo.Widget_Implementations.get(full_name);

        if (req !== undefined) {
            return req;
        }

        let pending_data = this.Pending_List.get(full_name);
        if (pending_data !== undefined) {
            (pending_data as PendingData).Awaiting.push(collection);
            return Global_Dummy_Widget_Creator;
        }

        let pending = new PendingData();
        pending.Awaiting.push(collection);
        this.Pending_List.set(full_name, pending);
        
        console.log("New request for " + full_name, this.Pending_List);
        
        this.internal_request_creator(connexion, name);

        return Global_Dummy_Widget_Creator;
    }

    static internal_request_creator(connexion: string, name: string) {
        let self = this;
            
            // Try to get the implementation from
            // the preferred connexion
        let msg = new WsMsg.Message();
        msg.String = "irws/supply_widgets";
        msg.Segments.set("", (new TextEncoder()).encode(JSON.stringify({ "widget" : name })));
        msg.set_accepts_response(true);

        let instr = new SocketSendInstr();
        instr.host_name = connexion;
        instr.message = msg;
        instr.on_success = function (msg: WsMsg.Message) {
            let dec = (new TextDecoder('utf-8')).decode(msg.Segments.get(""));
            self.add_widget_implementation_from_raw_js(connexion, name, dec);
        }
        instr.on_failure = function (msg: WsMsg.Message) {
            msg = new WsMsg.Message();
            msg.String = "irws/supply_widgets";
            msg.Segments.set("", (new TextEncoder()).encode(JSON.stringify({ "widget" : name })));
            msg.set_accepts_response(true);
                
            instr = new SocketSendInstr();
            instr.host_name = iris_connexion_name;
            instr.message = msg;
            instr.on_success = function (msg: WsMsg.Message) {
                let dec = (new TextDecoder('utf-8')).decode(msg.Segments.get(""));
                self.add_widget_implementation_from_raw_js(connexion, name, dec);
            }
            instr.on_failure = function (msg: WsMsg.Message) {
            }

            Socketman.send_message_on_socket(instr);
        }

        Socketman.send_message_on_socket(instr);
    }

    static add_widget_implementation_from_raw_js(connexion: string, name: string, script: string) {
        let full_name = connexion + "::" + name;

            // We (ab)use window to store our react so the
            // script can properly use it
        (<any>Window)["react"] = React;
        
            // Again (ab)using window to output the
            // function when we eval it
        let _script = script + "; Window[\"f\"] = create_implementation";
        let zzz:any = eval(_script);
        zzz;

            // Load our implementaiton and eval it
        let create_implementation:any = (<any>Window)["f"];
        let out:any = create_implementation();

        this.Widget_Implementations.set(full_name, out as IWidgetCreator);
        
            // TODO: handle error checking
        console.log("%c New Widget " + full_name, "font-weight: bold; background: #FDF", this.Widget_Implementations);

        let pending = this.Pending_List.get(full_name);
        if (pending !== undefined) {
            this.Pending_List.delete(full_name);

            let await_list = (pending as PendingData).Awaiting;
            for (let i = 0; i < await_list.length; i++) {
                let elem = await_list[i];
                if (elem.Owner.Holder === undefined)
                    continue;
                elem.Widget_Creators.set(full_name, out as IWidgetCreator);
                elem.remove_pending(full_name);
                (elem.Owner.Holder as DragObjectHolder).forceUpdate();
            }
        }
    }
}

class DummyWidgetComponent extends React.Component {
    state = { widget_collection: undefined, widget_frame_data: undefined, desc_data: undefined };

    constructor(prop: any) {
        super(prop);
        this.state.widget_collection = prop.widget_collection;
        this.state.widget_frame_data = prop.widget_frame_data;
        this.state.desc_data         = prop.desc_data;
    }
    
    componentDidMount() {
    }

    componentWillUnmount() {
    }

    render() {
        console.log("**************************", this.state.widget_collection, this.state.widget_frame_data, this.state.desc_data);

        return (React.createElement("div", { className: "dummy" }, "(dummy)"));
    }
}

class DummyWidgetCreator implements IWidgetCreator {
    Name = "Dummy";
    React_Module = DummyWidgetComponent;
}
let Global_Dummy_Widget_Creator = new DummyWidgetCreator();

class WidgetCollection implements IWidgetCollection {
    Widget_Creators = new Map<string, IWidgetCreator>();
    Pending = new Array<string>();
    Owner: DragObject;

    get_creator(connexion: string, name: string): IWidgetCreator {
        let full_name = connexion + "::" + name;
        let creator = this.Widget_Creators.get(full_name);

        if (creator !== undefined) {
            return creator as IWidgetCreator;
        }

        creator = WidgetDepo.obtain_or_request_creator_for_collection(this, connexion, name);
        this.Widget_Creators.set(full_name, creator as IWidgetCreator);
        
        if (creator.Name == "Dummy") {
            this.Pending.push(full_name);
        }

        return creator as IWidgetCreator;
    }

    get_all_loaded(): boolean {
        return this.Pending.length == 0;
    }

    remove_pending(name: string) {
        for (let i = 0; i < this.Pending.length; i++) {
            if (this.Pending[i] !== name)
                continue;
            this.Pending.splice(i--, 1);
        }
    }
}