/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import * as React from 'react';
import { SocketStateInfo, Socketman } from './socketman';
import { DropResult } from "react-smooth-dnd";
import * as Fbemit from 'fbemitter';
import './-gen/app.css';

const uuidv1 = require('uuid/v1');

export interface IDraggable {
    UUID: string;
    Reference_Name: string;

    Can_Reside_On_Sidebar: boolean;

    Is_Being_Dragged: boolean;
}

export interface IItemSidebar extends IDraggable {
    render_as_icon(): JSX.Element;
}

class ItemSocketRep implements IItemSidebar {
    UUID: string;
    Reference_Name: string;
    Can_Reside_On_Sidebar: boolean;
    Info: SocketStateInfo;
    Is_Being_Dragged: boolean;

    constructor() {
        this.UUID = DragWrangler.get_unique_uuid();
        this.Reference_Name = "";
        this.Can_Reside_On_Sidebar = true;
        this.Info = new SocketStateInfo();
    }

    render_as_icon(): JSX.Element {
        return (
            <div className="icon">
                <img src={this.Info.host_icon} />
                <div className="host-name"><span>{this.Info.host_name}</span></div>
            </div>
        );
    }
}

export class DragWrangler {
    static Elem_Sidebar = Array<IItemSidebar>();
    static Elem_Name_Sidebar = 'sidebar';

    static Socketman_Subscription_Enum: Fbemit.EventSubscription;
    static Socketman_Subscription_State: Fbemit.EventSubscription;

    static Events_Sidebar: Fbemit.EventEmitter = new Fbemit.EventEmitter();
    static Event_Name_Sidebar_Any = 'any';

    static commence() {
        console.log("Draggables commencing");

        let self = this;
        this.Socketman_Subscription_Enum  = Socketman.Events_Socket_Change.addListener(Socketman.Event_Name_Socket_Enum_Changed,  function () { self.update_sockets() });
        this.Socketman_Subscription_State = Socketman.Events_Socket_Change.addListener(Socketman.Event_Name_Socket_State_Changed, function () { self.update_sockets() });
    }

    static move_onto_sidebar(props: DropResult): void {
        console.log("drop " + props.payload.Reference_Name);
        
        const { removedIndex, addedIndex, payload } = props;

        if (removedIndex === null && addedIndex === null)
            return;
        
        if (payload.origin == this.Elem_Name_Sidebar) {
            if (removedIndex === addedIndex)
                return;
                
            this.Elem_Sidebar.splice(removedIndex as number, 1);
            this.Elem_Sidebar.splice(addedIndex as number, 0, props.payload.item);

            this.Events_Sidebar.emit(this.Event_Name_Sidebar_Any);
            return;
        }
    }

    static remove_from_sidebar(item: IDraggable): void {
        
    }

    static update_sockets(): void {
        console.log("DragWrangler: update sockets");
        
            // Obtain a list of all current sockets
        let info_to_be_found = Socketman.get_socket_state_info();

            // Loop through current sockets
        for (let it_info = 0; it_info < info_to_be_found.length; it_info++) {
            let sock_info = info_to_be_found[it_info];
            this.find_or_update_socket_state(this.Elem_Sidebar, sock_info);
        }

        this.Events_Sidebar.emit(this.Event_Name_Sidebar_Any);
    }

    static find_or_update_socket_state(list: Array<IItemSidebar>, info: SocketStateInfo): void {
        let elem_name = "socket-state-" + info.host_name;

        for (let it_list = 0; it_list < list.length; it_list++) {
            let list_elem = list[it_list];
            if (elem_name != list_elem.Reference_Name)
                continue;
            let sock = (list_elem as ItemSocketRep);
            sock.Info = Object.assign({}, info);
            return;
        }

        console.log("Add to sidebar: " + elem_name);

        let add = new ItemSocketRep();
        add.Reference_Name = elem_name;
        add.Info = Object.assign({}, info);
        list.splice(0, 0, add);
    }

    static get_unique_uuid(): string {
        return uuidv1();
    }
}