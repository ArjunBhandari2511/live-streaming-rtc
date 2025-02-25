import React from 'react';

function Stream() {
    return (
        <div className='p-6 flex flex-col items-center'>
            <h2 className='text-2xl font-bold'>Live Stream</h2>
            <video className='w-full max-w-3xl mx-auto mt-4' autoPlay playsInline></video>
        </div>
    );
}
export default Stream;