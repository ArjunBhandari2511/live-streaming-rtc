import React, { useState } from 'react';
import axios from 'axios';

function Dashboard() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('');

    const createUser = async () => {
        await axios.post('http://localhost:5000/api/users/create', { username, email, role });
        alert("User Created Successfully!");
    };

    return (
        <div className='p-6 bg-gray-100 min-h-screen flex flex-col items-center'>
            <h2 className='text-2xl font-bold mb-4'>Admin Dashboard</h2>
            <input className='border p-2 rounded w-80 mb-2' type='text' placeholder='Username' onChange={(e) => setUsername(e.target.value)} />
            <input className='border p-2 rounded w-80 mb-2' type='email' placeholder='Email' onChange={(e) => setEmail(e.target.value)} />
            <input className='border p-2 rounded w-80 mb-2' type='text' placeholder='Role' onChange={(e) => setRole(e.target.value)} />
            <button className='bg-blue-500 text-white px-4 py-2 rounded' onClick={createUser}>Create User</button>
            <a href='/stream' className='mt-4'><button className='bg-green-500 text-white px-4 py-2 rounded'>Start Live Stream</button></a>
        </div>
    );
}
export default Dashboard;