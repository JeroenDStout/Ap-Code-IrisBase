import * as React from 'react';
import './-gen/app.css';
import ConnexionUtil from './connexion-util'

class SidePanel extends React.Component {
    render() {
        return (
            <div className="side-panel">
                <ConnexionUtil />
            </div>
        );
    }
}

export default SidePanel;