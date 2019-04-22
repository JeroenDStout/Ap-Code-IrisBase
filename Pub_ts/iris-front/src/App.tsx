import * as React from 'react';
import './App.css';

import ConnexionUtil from './connexion-util';
import { Socketman } from './socketman';

import logo from './-ex-res/raw_logo.png';

class App extends React.Component {
    state = { isLoaded: true };

    componentDidMount() {
        Socketman.commence();
    }

    render() {
        const { isLoaded } = this.state;

        <div><img src={logo} /></div>;

        if (!isLoaded) {
            return (<div>Loading...</div>);
        }

        return <ConnexionUtil />;
    }
}

export default App;
