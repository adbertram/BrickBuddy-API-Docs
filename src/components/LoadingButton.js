import React from 'react';

const LoadingButton = ({ 
  isLoading = false, 
  children, 
  onClick, 
  disabled = false,
  className = '',
  type = 'button',
  loadingText = 'Loading...'
}) => {
  return (
    <button
      type={type}
      className={`loading-btn ${disabled ? 'cursor-not-allowed opacity-75' : ''} ${className}`}
      onClick={onClick}
      disabled={isLoading || disabled}
    >
      {isLoading ? (
        <>
          <svg 
            className="loading-btn-spinner animate-spin"
            xmlns="http://www.w3.org/2000/svg" 
            width="20"
            height="20"
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{loadingText}</span>
        </>
      ) : children}
    </button>
  );
};

export default LoadingButton; 