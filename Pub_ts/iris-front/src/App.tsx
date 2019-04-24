import * as React from 'react';
import './-gen/App.css';

//import ConnexionUtil from './connexion-util';
import { Socketman } from './socketman';
import SidePanel from './side-panel';
import StreamArea from './stream-area';
import { StreamWrangler } from './stream-wrangler';

//import logo from './-ex-res/raw_logo.png';

class App extends React.Component {
    state = { isLoaded: true };

    componentDidMount() {
        Socketman.commence();
        StreamWrangler.commence();
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
                <StreamArea />
                <SidePanel />
            </div>
        );
    }
}

export default App;
