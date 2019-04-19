import * as React from 'react';
import './App.css';

import logo from './-ex-res/raw_logo.png';

class App extends React.Component {
  public render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo}/><h1 className="App-title">Welcome to Iris</h1>
        </header>
        <p className="App-intro">
         Hello, this might be a work in progress!
        </p>
      </div>
    );
  }
}

export default App;
