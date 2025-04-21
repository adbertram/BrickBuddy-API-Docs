import { useReducer } from 'react';

// Initial state for the reducer
const initialState = {
    response: null,
    responseHeaders: null,
    requestUrl: '',
    error: null,
    lastRequestData: null
};

// Reducer function to handle state updates
const responseReducer = (state, action) => {
    switch (action.type) {
        case 'SET_RESPONSE':
            return { ...state, response: action.payload };
        case 'SET_RESPONSE_HEADERS':
            return { ...state, responseHeaders: action.payload };
        case 'SET_REQUEST_URL':
            return { ...state, requestUrl: action.payload };
        case 'SET_ERROR':
            return { ...state, error: action.payload };
        case 'SET_LAST_REQUEST_DATA':
            return { ...state, lastRequestData: action.payload };
        case 'RESET_STATE':
            return initialState;
        default:
            return state;
    }
};

export const useResponseState = () => {
    const [state, dispatch] = useReducer(responseReducer, initialState);

    // Create setter functions that dispatch actions
    const setResponse = (data) => dispatch({ type: 'SET_RESPONSE', payload: data });
    const setResponseHeaders = (headers) => dispatch({ type: 'SET_RESPONSE_HEADERS', payload: headers });
    const setRequestUrl = (url) => dispatch({ type: 'SET_REQUEST_URL', payload: url });
    const setError = (error) => dispatch({ type: 'SET_ERROR', payload: error });
    const setLastRequestData = (data) => dispatch({ type: 'SET_LAST_REQUEST_DATA', payload: data });

    const setters = {
        setResponse,
        setResponseHeaders,
        setRequestUrl,
        setLastRequestData,
        setError
    };

    return {
        // State
        ...state,
        // Setters object for passing to test functions
        setters
    };
};