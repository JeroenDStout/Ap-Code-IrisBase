import * as React from 'react';
import './-gen/app.css';
import { DragWrangler, DragObjectHolder } from './draggables';
import * as Fbemit from 'fbemitter';
import './-gen/stream-area.css';

class LoadoutDesk extends React.Component {
    state = { Loadout_UUID : "" };

    Draggables_Subscription_Loadout_Any: Fbemit.EventSubscription;

    componentDidMount() {
        let self = this;
        this.Draggables_Subscription_Loadout_Any = DragWrangler.Events_Side_Panel.addListener(DragWrangler.Event_Name_Loadout_UUID,
            function (data: any) {
                console.log(data);
                if (data.set_uuid !== undefined)
                    self.setState({ Loadout_UUID : data.set_uuid });
            }
        );
    }

    componentWillUnmount() {
        this.Draggables_Subscription_Loadout_Any.remove();
    }

    render() {
        if (this.state.Loadout_UUID == "") {
            return (<div className="loadout-desk loading">loading</div>);
        }

        return (
            <div className="loadout-desk">
                <div className="streams-area">
                    <DragObjectHolder key={this.state.Loadout_UUID} object_uuid={this.state.Loadout_UUID} parent_uuid="" mode="desk" />
                </div>
            </div>
        );
    }
}

export default LoadoutDesk;