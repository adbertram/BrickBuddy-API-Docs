import { useReducer } from 'react';

// Initial state for the reducer
const initialState = {
    isItemSectionOpen: false,
    isBatchSectionOpen: false,
    isUserSectionOpen: false,
    isInventorySectionOpen: false,
    isSetSectionOpen: false,
    isBricklinkSectionOpen: false
};

// Reducer function to handle state updates
const uiReducer = (state, action) => {
    switch (action.type) {
        case 'TOGGLE_SECTION':
            return {
                ...state,
                [action.payload.section]: action.payload.value
            };
        default:
            return state;
    }
};

export const useUIState = () => {
    const [state, dispatch] = useReducer(uiReducer, initialState);

    // Create setter functions that dispatch actions
    const setIsItemSectionOpen = (value) => 
        dispatch({ type: 'TOGGLE_SECTION', payload: { section: 'isItemSectionOpen', value } });
    
    const setIsBatchSectionOpen = (value) => 
        dispatch({ type: 'TOGGLE_SECTION', payload: { section: 'isBatchSectionOpen', value } });
    
    const setIsUserSectionOpen = (value) => 
        dispatch({ type: 'TOGGLE_SECTION', payload: { section: 'isUserSectionOpen', value } });
    
    const setIsInventorySectionOpen = (value) => 
        dispatch({ type: 'TOGGLE_SECTION', payload: { section: 'isInventorySectionOpen', value } });
    
    const setIsSetSectionOpen = (value) => 
        dispatch({ type: 'TOGGLE_SECTION', payload: { section: 'isSetSectionOpen', value } });
    
    const setIsBricklinkSectionOpen = (value) => 
        dispatch({ type: 'TOGGLE_SECTION', payload: { section: 'isBricklinkSectionOpen', value } });

    return {
        ...state,
        setIsItemSectionOpen,
        setIsBatchSectionOpen,
        setIsUserSectionOpen,
        setIsInventorySectionOpen,
        setIsSetSectionOpen,
        setIsBricklinkSectionOpen
    };
};