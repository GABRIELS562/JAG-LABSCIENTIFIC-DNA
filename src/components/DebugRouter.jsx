import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const DebugRouter = () => {
  const location = useLocation();
  
  useEffect(() => {
    }, [location]);
  
  return null;
};

export default DebugRouter;