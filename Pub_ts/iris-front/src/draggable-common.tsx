import { Container, Draggable } from "react-smooth-dnd";
import { Socketman, SocketStateInfo } from "./socketman";
import * as Fbemit from 'fbemitter';
import { DragWrangler, DragObject, DragObjectHolder, EmitPost, EmitPostHolder, IDragObjectImpl } from "./draggables";
import { WidgetDepo } from "./widget-depo";
import * as SockMan from "./socketman";
import { IWidgetCollection, IWidgetFrameData, ISocketSendInstr, ISocketResponseHandler, IPostProps }  from './-ex-ts/Widget Interfaces'
import * as WbSckMsg from './-ex-ts/Websocket Protocol Messages'
import * as React from 'react';
import { SizeMe } from "react-sizeme";

const uuidv1 = require('uuid/v1');

class DraggableObjectImplNone implements IDragObjectImpl {
    onBegin(Data: DragObject): void {
        Data;
    }

    onEnd(Data: DragObject): void {
        Data;
    }

    render(Mode: string, Data: DragObject): JSX.Element {
        switch (Mode) {
            case "panel-small":
                return (<div className="panel small no-implement">...</div>);
            case "icon":
                return (<div className="icon"><span className="icon-img no-implement">...</span></div>);
            case "desk":
                return (<div className="desk no-implement">...</div>);
            case "widget":
                return (<div className="widget no-implement">...</div>);
        }

        Data; return (<div>{Mode}</div>);
    }

    emit_post_on(obj: DragObject, post: EmitPost): boolean {
        return false;
    }
}

class DraggableObjectImplPanel extends DraggableObjectImplNone {
    render(Mode: string, Data: DragObject): JSX.Element {
        switch (Mode) {
            case "panel-small":
                return (
                    <div className="dnd">
                        <Container
                            orientation="vertical"
                            onDragStart={e => DragWrangler.dnd_begin_drag(Data, e)}
                            onDragEnd={e => DragWrangler.dnd_end_drag(Data, e)}
                            onDrop={e => DragWrangler.dnd_drop(Data, e, {})}
                            removeOnDropOut={false}
                            getChildPayload={index => ({ child: DragWrangler.find_by_uuid(Data.Children_ID[index]), mode: "copy" })}
                            behaviour="copy"
                            dropPlaceholder={{
                                animationDuration: 100,
                                showOnTop: true,
                                className: 'icon-drop-preview'
                            }}
                        >
                            {Data.Children_ID.map(item => {
                                return (
                                    <Draggable key={item} className={item}>
                                        <DragObjectHolder object_uuid={item} parent_uuid={Data.ID} mode="icon" />
                                    </Draggable>
                                )}
                            )}
                        </Container>
                    </div>
                );
        }

        Data; return (<div>{Mode}</div>);
    }
}

class ConnexionData {
    Event_On_Connect: Fbemit.EventSubscription;
    Event_On_Disconnect: Fbemit.EventSubscription;
}

class DraggableObjectImplConnexion extends DraggableObjectImplNone {
    onBegin(Data: DragObject): void {
        Data.Data.ConnexionData = new ConnexionData();
        let local_data = Data.Data.ConnexionData as ConnexionData;
        let self = this;

        let desc = Data.Data.Desc;

        local_data.Event_On_Connect = Socketman.Events_Socket_Change.addListener(
            Socketman.Event_Name_Socket_Connect(desc["name"] as string), function(data:any) {
                self.on_connexion_state_update(Data);
            }
        );
        local_data.Event_On_Disconnect = Socketman.Events_Socket_Change.addListener(
            Socketman.Event_Name_Socket_Connect(desc["name"] as string), function(data:any) {
                self.on_connexion_state_update(Data);
            }
        );
    }

    onEnd(Data: DragObject): void {
        let local_data = Data.Data.ConnexionData as ConnexionData;
        local_data.Event_On_Connect.remove();
        local_data.Event_On_Disconnect.remove();
        delete Data.Data.ConnexionData;
    }

    on_connexion_state_update(Data: DragObject): void {
        if (undefined === Data.Holder)
            return;
        (Data.Holder as DragObjectHolder).forceUpdate();
    }

    render(Mode: string, Data: DragObject): JSX.Element {
        let desc = Data.Data.Desc;

        let _info = Socketman.get_socket_state_info(desc["name"]);
        if (_info === undefined) {
            switch (Mode) {
                case "icon":
                    return (
                        <div className="icon">no {desc["name"]}</div>
                    );
            }
        }

        let info = _info as SocketStateInfo;
        switch (Mode) {
            case "icon":
                return (
                    <div className={ info.available ? "icon" : "icon connexion-unavailable"}><span className="icon-img"><img src={info.host_icon}/></span><span className="icon-text">{desc["name"]}</span></div>
                );
        }

        Data; return (<div>{Mode}</div>);
    }
}

class DraggableObjectImplDesk extends DraggableObjectImplNone {
    render(Mode: string, Data: DragObject): JSX.Element {
        switch (Mode) {
            case "desk":
                return (
                    <div className="dnd">
                        <Container
                            orientation="horizontal"
                            onDragStart={e => DragWrangler.dnd_begin_drag(Data, e)}
                            onDragEnd={e => DragWrangler.dnd_end_drag(Data, e)}
                            onDrop={e => DragWrangler.dnd_drop(Data, e, {})}
                            getChildPayload={index => ({ child: DragWrangler.find_by_uuid(Data.Children_ID[index]) }) }
                            dropPlaceholder={{
                                animationDuration: 100,
                                showOnTop: true,
                                className: 'icon-drop-preview'
                            }}
                        >
                            {Data.Children_ID.map(item => {
                                return (
                                    <Draggable key={item} className={item}>
                                        <DragObjectHolder object_uuid={item} parent_uuid={Data.ID} mode="stream" />
                                    </Draggable>
                                )}
                            )}
                        </Container>
                    </div>
                );
        }
        

        Data; return (<div>{Mode}</div>);
    }
}

class DraggableObjectImplStream extends DraggableObjectImplNone {
    emit_post_on(Obj: DragObject, post: EmitPost): boolean {
        post.ID = uuidv1();
        Obj.Posts.splice(0, 0, post);
        if (Obj.Holder !== undefined)
            Obj.Holder.forceUpdate();
        return true;
    }

    render(Mode: string, obj: DragObject): JSX.Element {
    //    let holder = (obj.Holder as DragObjectHolder);
        
        switch (Mode) {
            case "stream":
                return (
                    <SizeMe monitorHeight>{({ size }) => <div style={{ height: "100%" }}>
                    <div className="stream">
                        <div className="top">
                            <div className="title">
                            </div>
                            <div className="stream-widget-dnd" style={{ maxHeight: ((size.height as number)*.55) + "px" }}>
                                <div className="scroll-area">
                                    <Container
                                        orientation="vertical"
                                        nonDragAreaSelector="*.no-drag"
                                        onDragStart={e => DragWrangler.dnd_begin_drag(obj, e)}
                                        onDragEnd={e => DragWrangler.dnd_end_drag(obj, e)}
                                        onDrop={e => DragWrangler.dnd_drop(obj, e, { transmute : "widget-frame" } )}
                                        getChildPayload={index => ({ child : DragWrangler.find_by_uuid(obj.Children_ID[index]) }) }
                                        dragBeginDelay={250}
                                        dropPlaceholder={{
                                            animationDuration: 100,
                                            showOnTop: true,
                                            className: 'icon-drop-preview'
                                        }}
                                        shouldAcceptDrop={(options:any, payload:any) => {
                                            console.log(options, payload);
                                            return true;
                                        }}
                                    >
                                        {obj.Children_ID.map(item => {
                                            return (
                                                <Draggable key={item} className={item}
                                                >
                                                    <DragObjectHolder object_uuid={item} parent_uuid={obj.ID} mode="widget-frame" />
                                                </Draggable>
                                            )}
                                        )}
                                    </Container>
                                </div>
                            </div>
                        </div>
                        <div className="stream-post-dnd">
                            <div className="scroll-area">
                                <Container
                                    orientation="vertical"
                                    nonDragAreaSelector="*.no-drag"
                                    onDragStart={e => DragWrangler.dnd_begin_drag(obj, e)}
                                    onDragEnd={e => DragWrangler.dnd_end_drag(obj, e)}
                                    onDrop={e => DragWrangler.dnd_drop(obj, e, { transmute : "widget-frame" } )}
                                    getChildPayload={index => ({ child : DragWrangler.find_by_uuid(obj.Children_ID[index]) }) }
                                    dragBeginDelay={250}
                                    shouldAcceptDrop={(options:any, payload:any) => {
                                        return false;
                                    }}
                                >
                                    {obj.Posts.map(item => {
                                        return (
                                            <Draggable key={item.ID}>
                                                <EmitPostHolder post={item} />
                                            </Draggable>
                                        )}
                                    )}
                                </Container>
                            </div>
                        </div>
                    </div>
                    </div>}</SizeMe>
                );
        }

        return (<div>{Mode}</div>);
    }
}

class WidgetFrameData implements IWidgetFrameData {
    Connexion: string = "";
    Type: string = "";
    Broken: boolean = true;
    Primary_Type: string;
    Desc: any;
    Widget_Collection: IWidgetCollection;
    Obj: any;

    get_desc(): any {
        return this.Obj.Data.Desc;
    }
    notify_update_desc(): void {
        console.log("mod ________________", this.Obj);
        DragWrangler.handle_object_updated(this.Obj);
    }

    Update_Items = new Array<any>();
    request_updates(obj: any) {
        if (obj.rerender_update !== undefined) {
            this.Update_Items.push(obj);
        }
    }

    remove_updates(obj: any) {
        for (let i = 0; i < this.Update_Items.length; i++) {
            if (this.Update_Items[i] !== obj)
                continue;
            this.Update_Items.splice(i, 1);
            return;
        }
    }

    rerender_notify(): void {
        for (let i = 0; i < this.Update_Items.length; i++) {
            this.Update_Items[i].rerender_update();
        }
    }
    
    create_socket_send_with_msg(): ISocketSendInstr {
        let instr = new SockMan.SocketSendInstr();
        instr.message = new WbSckMsg.Message();
        return instr;
    }

    send_socket(instr: ISocketSendInstr): ISocketResponseHandler|undefined {
        return Socketman.send_message_on_socket(instr);
    }

    create_post_props(): IPostProps {
        let post = new EmitPost();
        post.obj = this.Obj;
        post.receive_time = new Date(Date.now());
        return post;
    }
    emit_post(post: IPostProps): void {
        DragWrangler.emit_post_on_object(post as EmitPost);
    }
}

class DraggableObjectImplWidgetFrame extends DraggableObjectImplNone {
    onBegin(Obj: DragObject): void {
        Obj.Data.WidgetFrameData = new WidgetFrameData();
        let w_data = Obj.Data.WidgetFrameData as WidgetFrameData;
        w_data.Obj = Obj;
        w_data.Connexion = "";
        w_data.Primary_Type = Obj.Data.Desc.Primary_Type;
        w_data.Widget_Collection = WidgetDepo.get_collection(Obj);
        w_data.Desc = Obj.Data.Desc;

        if (Obj.Data.Desc !== null && Obj.Data.Desc !== undefined &&
            Obj.Data.Desc["name"] !== undefined &&
            Obj.Data.Desc["host"] !== undefined &&
            Obj.Data.Desc["port"] !== undefined)
        {
            console.log("~ Upgrade from connexion", Obj);

            w_data.Connexion    = Obj.Data.Desc["name"];
            w_data.Primary_Type = "browser";
            
                // We set a value technically belonging
                // to the server, but as it is implied
                // we do not actually update the server
            Obj.Data.Desc.Primary_Type = w_data.Type;
        }
    }

    onEnd(Obj: DragObject): void {
        let w_data = Obj.Data.WidgetFrameData as WidgetFrameData;
        WidgetDepo.release_collection(w_data.Widget_Collection);

        if (Obj.Data.WidgetFrameData !== undefined) {
            delete Obj.Data.WidgetFrameData;
        }
    }

    render(Mode: string, Obj: DragObject): JSX.Element {
        if (Obj.Data.WidgetFrameData === undefined)
            return (<div/>);

        let w_data = Obj.Data.WidgetFrameData as WidgetFrameData;
        w_data.rerender_notify();

        let socket_info: SocketStateInfo|undefined;

        if (w_data.Connexion != "") {
            socket_info = Socketman.get_socket_state_info(w_data.Connexion);
        }

        let creator = w_data.Widget_Collection.get_creator(w_data.Connexion, w_data.Primary_Type);
        let broken = !w_data.Widget_Collection.get_all_loaded();

        switch (Mode) {
            case "icon":
                return (<div className="icon widgets-broken">widget-frame :)</div>);
            case "widget-frame":
                return (
                    <div className={ broken ? "widget-frame broken" : "widget-frame" }>
                        {socket_info !== undefined && <img className="socket-icon" src={(socket_info as SocketStateInfo).host_icon} />}
                        <creator.React_Module mode="header" widget_frame_data={w_data} desc_data={Obj.Data.Desc} />
                        {broken && <div className="hatch" /> }
                    </div>
                );
        }

        return (<div>{Mode}</div>);
    }
}

DragWrangler.register_implementation("none",            new DraggableObjectImplNone());
DragWrangler.register_implementation("dummy",           new DraggableObjectImplNone());
DragWrangler.register_implementation("panel",           new DraggableObjectImplPanel());
DragWrangler.register_implementation("desk",            new DraggableObjectImplDesk());
DragWrangler.register_implementation("stream",          new DraggableObjectImplStream());
DragWrangler.register_implementation("connexion",       new DraggableObjectImplConnexion());
DragWrangler.register_implementation("widget-frame",    new DraggableObjectImplWidgetFrame());