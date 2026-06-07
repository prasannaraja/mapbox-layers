import React, { useState } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import Sidebar from './components/Sidebar/Sidebar';
import MapView from './components/MapView/MapView';
import './App.css';

const App: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <Provider store={store}>
      <div className="app-shell">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(c => !c)}
        />
        <main className="app-main">
          <MapView />
        </main>
      </div>
    </Provider>
  );
};

export default App;
