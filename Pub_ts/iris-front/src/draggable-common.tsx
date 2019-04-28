import { Container, Draggable } from "react-smooth-dnd";
import { Socketman, SocketStateInfo } from "./socketman";
import * as Fbemit from 'fbemitter';
import { DragWrangler, DragObject, DragObjectHolder, IDragObjectImpl  } from "./draggables";
import * as React from 'react';

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
        }

        Data; return (<div>{Mode}</div>);
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
                            onDrop={e => DragWrangler.dnd_drop(Data, e)}
                            getChildPayload={index => Data.Children_ID[index]}
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
                return (<div className="panel small">small panel</div>);
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

DragWrangler.register_implementation("none",      new DraggableObjectImplNone());
DragWrangler.register_implementation("panel",     new DraggableObjectImplPanel());
DragWrangler.register_implementation("connexion", new DraggableObjectImplConnexion());