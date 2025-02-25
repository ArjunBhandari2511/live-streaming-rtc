import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import StreamPage from './pages/StreamPage';
import Home from './pages/Home';

function App() {
    return (
        <Router>
            <Routes>
                <Route path='/' element={<Home />} />
                <Route path='/dashboard' element={<Dashboard />} />
                <Route path='/stream' element={<StreamPage />} />
            </Routes>
        </Router>
    );
}
export default App;