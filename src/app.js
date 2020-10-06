import React from 'react';
import { Routes, Route } from 'react-router-dom';

import Home from './home';
import Room from './room';

function App() {
  return (
    <div className='max-w-3xl mx-auto p-5 w-full h-full flex flex-col'>
      <h1 className='text-2xl font-bold text-center my-8'> WebRTC Test </h1>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/room/:id' element={<Room />} />
      </Routes>
    </div>
  );
}

export default App;
