import * as React from 'react';
import { SocketStateInfo, Socketman } from './socketman';
import * as Fbemit from 'fbemitter';
import './-gen/App.css';

class ConnexionUtil extends React.Component {
    state = { connexion_state: Array<SocketStateInfo>() };

    constructor(props:any) {
        super(props);

        this.state = {
            connexion_state: Array<SocketStateInfo>()
        };
    }

    socketManSubscription: Fbemit.EventSubscription;

    componentDidMount() {
        let self = this;
        this.socketManSubscription = Socketman.Events_Socket_Change.addListener('any', function () { self.update_sockets() });
        this.update_sockets();
    }

    componentWillUnmount() {
        this.socketManSubscription.remove();
    }

    update_sockets() {
        let socket_info = Socketman.get_socket_state_info();
        console.log(socket_info);
        this.setState({ connexion_state: socket_info });
    }

    render() {
        const { connexion_state } = this.state;
        
        return (<div className="connexion-util">
            {connexion_state.map(item =>
                <ConnexionElem state_info={item} key={item.host_name} />
            )}
        </div>);
    }
}

interface IConnexionElem {
    state_info: SocketStateInfo;
}

class ConnexionElem extends React.Component<IConnexionElem, object> {
    render() {
        const { state_info } = this.props;

        let className = "connexion";
        className += state_info.available ? " connected" : " disconnected";

        return (
            <div className={className} >
                <div><img src={state_info.host_icon} /></div>
                <div className="name">{state_info.host_name}</div>
                {state_info.available ? <div className="version">{state_info.host_version}</div> : ''}
            </div>
        );
    }
}

export default ConnexionUtil;