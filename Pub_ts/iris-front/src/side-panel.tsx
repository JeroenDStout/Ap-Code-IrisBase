import * as React from 'react';
import './-gen/app.css';
import { DragWrangler, DragObjectHolder } from './draggables';
import * as Fbemit from 'fbemitter';

class SidePanel extends React.Component {
    state = { Side_Panel_UUID : "" };

    Draggables_Subscription_Sidebar_Any: Fbemit.EventSubscription;

    componentDidMount() {
        let self = this;
        this.Draggables_Subscription_Sidebar_Any = DragWrangler.Events_Side_Panel.addListener(DragWrangler.Event_Name_Side_Panel_UUID,
            function (data: any) {
                console.log(data);
                if (data.set_uuid !== undefined)
                    self.setState({ Side_Panel_UUID : data.set_uuid });
            }
        );
    }

    componentWillUnmount() {
        this.Draggables_Subscription_Sidebar_Any.remove();
    }

    render() {
        if (this.state.Side_Panel_UUID == "") {
            return (<div className="side-panel loading">loading</div>);
        }

        return (
            <div className="side-panel">
                <div className="persistent panel small">
                    <DragObjectHolder key={this.state.Side_Panel_UUID} object_uuid={this.state.Side_Panel_UUID} parent_uuid="" mode="panel-small" />
                </div>
            </div>
        );
    }
}

export default SidePanel;