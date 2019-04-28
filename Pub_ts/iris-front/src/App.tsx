import * as React from 'react';
import './-gen/app.css';

import { Socketman } from './socketman';
import SidePanel from './side-panel';
import { DragWrangler } from './draggables';
import './draggable-common';

class App extends React.Component {
    state = { isLoaded: true };

    componentDidMount() {
        Socketman.commence();
        DragWrangler.commence();
        //StreamWrangler.commence();
    }

    render_side_panel() {
        
    }

    render() {
        const { isLoaded } = this.state;

        if (!isLoaded) {
            return (<div>Loading...</div>);
        }

        return (
            <div>
                <SidePanel />
            </div>
        );
    }
}

export default App;
