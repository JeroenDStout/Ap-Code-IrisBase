import * as React from 'react';
import './-gen/app.css';
import { DragWrangler, IItemSidebar } from './draggables';
import { Container, Draggable, DropResult } from "react-smooth-dnd";
import * as Fbemit from 'fbemitter';

class SidePanel extends React.Component {
    state = { Elem_Sidebar: Array<IItemSidebar>() };

    constructor(prop: any) {
        super(prop);
        this.onSideBarDrop = this.onSideBarDrop.bind(this);
        this.getChildPayload = this.getChildPayload.bind(this);
    }

    Draggables_Subscription_Sidebar_Any: Fbemit.EventSubscription;

    componentDidMount() {
        let self = this;
        this.Draggables_Subscription_Sidebar_Any = DragWrangler.Events_Sidebar.addListener(DragWrangler.Event_Name_Sidebar_Any, function () { self.update_bar() });
        this.update_bar();
    }

    componentWillUnmount() {
        this.Draggables_Subscription_Sidebar_Any.remove();
    }

    update_bar() {
        this.setState({ Elem_Sidebar: DragWrangler.Elem_Sidebar.slice() });
    }

    render() {
        return (
            <div className="side-panel">
                <div className="dnd">
                    <Container
                        orientation="vertical"
                        onDragStart={e => console.log("drag started", e)}
                        onDragEnd={e => console.log("drag end", e)}
                        onDrop={e => this.onSideBarDrop(e)}
                        getChildPayload={index =>
                            this.getChildPayload(index)
                        }
                        dropPlaceholder={{
                            animationDuration: 100,
                            showOnTop: true,
                            className: 'icon-drop-preview'
                        }}
                    >
                        {this.state.Elem_Sidebar.map(item => {
                            return (
                                <Draggable key={item.UUID}>
                                    {item.render_as_icon()}
                                </Draggable>
                            )}
                        )}
                    </Container>
                </div>
            </div>
        );
    }

    getChildPayload(index: number): any {
        return {
            origin: DragWrangler.Elem_Name_Sidebar,
            item: this.state.Elem_Sidebar[index]
        }
    }

    onSideBarDrop(result: DropResult) {
        DragWrangler.move_onto_sidebar(result);
    }
}

export default SidePanel;