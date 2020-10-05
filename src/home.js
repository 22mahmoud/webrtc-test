import React from 'react';
import { useClipboard } from 'use-clipboard-copy';
import { Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

const baseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://veve-rtc.netlify.app';

const Home = () => {
  const room = React.useRef(uuidv4());
  const { copied, copy } = useClipboard({
    copiedTimeout: 1000,
  });
  const url = `${baseUrl}/room/${room.current}`;

  const handleOnClick = React.useCallback(() => {
    copy(url);
  }, [url, copy])

  return (
    <div className='text-center mt-24'>
      <h2 className='text-xl font-thin mb-4'>Copy the room url below and share it with your friend</h2>
      <div className='flex flex-col justify-center items-center mt-8'>
        <Link className='text-blue-700 hover:text-blue-800' to={`room/${room.current}`}>
          {url} 
        </Link>
        <button 
          className="text-gray-900 border-solid border-4 border-blue-500 my-2 py-2 px-4 rounded"
          onClick={handleOnClick}
        >
          <span className='text-md'> {copied ? `✅ Copied` : `🔗 Copy`}</span>
        </button>
      </div>
    </div>
  );
}

export default Home;
