import React, { useReducer, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
    canMethodHaveBody, 
    parseJsonInput, 
    validateMandatoryParams, 
    isParamMandatory,
    constructUrl,
    getTestConfig,
    buildRequestParams,
    hasArrayBody,
    getArrayBodyItemSchema
} from '../testUtils';
import LoadingButton from '../../../components/LoadingButton';
import config from '../../../theme/config';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { FaRegCopy } from 'react-icons/fa';

// Add theme colors definition with more vibrant and contrasting colors
const themeColors = {
  primary: {
    light: 'bg-blue-200 text-blue-800',
    DEFAULT: 'bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200'
  },
  secondary: {
    light: 'bg-purple-200 text-purple-800',
    DEFAULT: 'bg-purple-600 hover:bg-purple-700 text-white transition-colors duration-200'
  },
  status: {
    success: {
      light: 'bg-emerald-200 text-emerald-800',
      DEFAULT: 'bg-emerald-600 hover:bg-emerald-700 text-white transition-colors duration-200'
    },
    warning: {
      light: 'bg-amber-200 text-amber-800',
      DEFAULT: 'bg-amber-600 hover:bg-amber-700 text-white transition-colors duration-200'
    },
    error: {
      light: 'bg-rose-200 text-rose-800',
      DEFAULT: 'bg-rose-600 hover:bg-rose-700 text-white transition-colors duration-200'
    }
  },
  surface: {
    light: 'bg-gray-100',
    DEFAULT: 'bg-white',
    dark: 'bg-gray-200'
  },
  background: {
    light: 'bg-white'
  },
  border: {
    DEFAULT: 'border-gray-300'
  },
  text: {
    primary: 'text-gray-900',
    secondary: 'text-gray-700'
  }
};

const ArrayBodyForm = ({ schema, value = [], onChange }) => {
    const addItem = () => {
        const newItem = {};
        Object.keys(schema).forEach(key => {
            newItem[key] = '';
        });
        onChange([...value, newItem]);
    };

    const removeItem = (index) => {
        const newValue = [...value];
        newValue.splice(index, 1);
        onChange(newValue);
    };

    const updateItem = (index, field, newValue) => {
        const newArray = [...value];
        const updatedItem = { ...newArray[index] };
        
        // Only add the field if it has a value
        if (newValue !== undefined && newValue !== '') {
            updatedItem[field] = newValue;
        } else {
            delete updatedItem[field];
        }
        
        newArray[index] = updatedItem;
        onChange(newArray);
    };

    return (
        <div className="space-y-4">
            {value.map((item, index) => (
                <div key={index} className={`p-4 border rounded-lg ${themeColors.background.light} ${themeColors.border.DEFAULT} relative`}>
                    <button
                        onClick={() => removeItem(index)}
                        className={`absolute top-2 right-2 ${themeColors.status.error.light} hover:${themeColors.status.error.DEFAULT}`}
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                    <div className="space-y-3">
                        {Object.entries(schema).map(([name, config]) => {
                            const isRequired = config.required;
                            const label = `${name}${isRequired ? ' *' : ''}`;
                            
                            return (
                                <div key={name} className="space-y-1">
                                    <label className={`block text-sm font-medium ${themeColors.text.primary}`}>
                                        {label}
                                    </label>
                                    {config.options ? (
                                        <select
                                            value={config.multiple_select ? (item[name] || []) : (item[name] || '')}
                                            onChange={(e) => {
                                                if (config.multiple_select) {
                                                    // For multi-select, handle array of selected options
                                                    const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
                                                    updateItem(index, name, selectedOptions);
                                                } else {
                                                    // For single select, handle single value
                                                    updateItem(index, name, e.target.value || null);
                                                }
                                            }}
                                            className={`mt-1 block w-full rounded-md ${themeColors.border.DEFAULT} shadow-sm focus:${themeColors.primary.DEFAULT} focus:ring-${themeColors.primary.DEFAULT} sm:text-sm ${themeColors.background.light} ${themeColors.text.primary}`}
                                            multiple={config.multiple_select}
                                        >
                                            {!config.multiple_select && <option value=""></option>}
                                            {config.options.map((option) => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type={config.type === 'number' ? 'number' : 'text'}
                                            value={item[name] || ''}
                                            onChange={(e) => updateItem(index, name, e.target.value)}
                                            className={`mt-1 block w-full rounded-md ${themeColors.border.DEFAULT} shadow-sm focus:${themeColors.primary.DEFAULT} focus:ring-${themeColors.primary.DEFAULT} sm:text-sm ${themeColors.background.light} ${themeColors.text.primary}`}
                                            placeholder={`Enter ${name}`}
                                        />
                                    )}
                                    {config.description && (
                                        <p className={`text-xs ${themeColors.text.secondary}`}>{config.description}</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
            <button
                onClick={addItem}
                type="button"
                className={`mt-2 inline-flex items-center px-3 py-2 border ${themeColors.border.DEFAULT} shadow-sm text-sm leading-4 font-medium rounded-md ${themeColors.text.primary} ${themeColors.surface.DEFAULT} hover:${themeColors.surface.light} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:${themeColors.primary.DEFAULT}`}
            >
                + Add Item
            </button>
        </div>
    );
};

const ParameterFields = ({ parameters, inputValues, onInputChange, testConfig }) => {
    if (!parameters) return null;

    const renderParameterSection = (paramType, params) => {
        if (!params || Object.keys(params).length === 0) {
            // If this is a GET request and we're rendering query parameters, 
            // add pagination parameters even if there are no other query params
            if (paramType === 'query' && testConfig.verb === 'GET') {
                params = {};
            } else {
                return null;
            }
        }

        // Handle array-based body
        if (paramType === 'body' && hasArrayBody(testConfig)) {
            const schema = getArrayBodyItemSchema(testConfig);
            return (
                <div className="mt-4">
                    <h3 className={`text-sm font-semibold ${themeColors.text.primary} mb-2`}>
                        Body Parameters (Array)
                    </h3>
                    <ArrayBodyForm
                        schema={schema}
                        value={inputValues.body || []}
                        onChange={(newValue) => onInputChange('body', newValue)}
                    />
                </div>
            );
        }

        return (
            <div className="mt-4">
                <h3 className={`text-sm font-semibold ${themeColors.text.primary} mb-2`}>
                    {paramType.charAt(0).toUpperCase() + paramType.slice(1)} Parameters
                </h3>
                <div className="space-y-3">
                    {Object.entries(params).map(([name, config]) => {
                        const isRequired = config.required;
                        const label = `${name}${isRequired ? ' *' : ''}`;
                        const value = inputValues[name] ?? null;
                        
                        return (
                            <div key={name} className="space-y-1">
                                <label className={`block text-sm font-medium ${themeColors.text.primary}`}>
                                    {label}
                                </label>
                                {config.options ? (
                                    <select
                                        value={config.multiple_select ? (value || []) : (value || '')}
                                        onChange={(e) => {
                                            if (config.multiple_select) {
                                                // For multi-select, handle array of selected options
                                                const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
                                                onInputChange(name, selectedOptions);
                                            } else {
                                                // For single select, handle single value
                                                onInputChange(name, e.target.value || null);
                                            }
                                        }}
                                        className={`mt-1 block w-full rounded-md ${themeColors.border.DEFAULT} shadow-sm focus:${themeColors.primary.DEFAULT} focus:ring-${themeColors.primary.DEFAULT} sm:text-sm ${themeColors.background.light} ${themeColors.text.primary}`}
                                        multiple={config.multiple_select}
                                    >
                                        {!config.multiple_select && <option value=""></option>}
                                        {config.options.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type={config.type === 'number' ? 'number' : 'text'}
                                        value={value || ''}
                                        onChange={(e) => onInputChange(name, e.target.value || null)}
                                        className={`mt-1 block w-full rounded-md ${themeColors.border.DEFAULT} shadow-sm focus:${themeColors.primary.DEFAULT} focus:ring-${themeColors.primary.DEFAULT} sm:text-sm ${themeColors.background.light} ${themeColors.text.primary}`}
                                        placeholder={`Enter ${name}`}
                                    />
                                )}
                                {config.description && (
                                    <p className={`text-xs ${themeColors.text.secondary}`}>{config.description}</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div>
            {renderParameterSection('body', parameters.body)}
            {renderParameterSection('path', parameters.path)}
            {renderParameterSection('query', parameters.query)}
        </div>
    );
};

// Utility function to filter out null/empty values from an object
const filterEmptyValues = (obj) => {
    // If it's null/undefined, return as is
    if (!obj) return obj;
    
    // If it's an array, map over it and filter each item
    if (Array.isArray(obj)) {
        return obj
            .map(item => {
                if (typeof item === 'object') {
                    const filteredItem = filterEmptyValues(item);
                    // Only include the item if it has properties after filtering
                    return Object.keys(filteredItem).length > 0 ? filteredItem : null;
                }
                return item !== null && item !== '' ? item : null;
            })
            .filter(item => item !== null);
    }
    
    // If it's an object, filter its properties
    if (typeof obj === 'object') {
        const filtered = {};
        Object.entries(obj).forEach(([key, value]) => {
            // For arrays, filter each item
            if (Array.isArray(value)) {
                const filteredArray = filterEmptyValues(value);
                if (filteredArray.length > 0) {
                    filtered[key] = filteredArray;
                }
            }
            // For objects, recursively filter
            else if (value && typeof value === 'object') {
                const filteredValue = filterEmptyValues(value);
                if (Object.keys(filteredValue).length > 0) {
                    filtered[key] = filteredValue;
                }
            }
            // For primitive values, only include if not null/empty
            else if (value !== null && value !== '') {
                filtered[key] = value;
            }
        });
        return filtered;
    }
    
    // For primitive values, return as is
    return obj;
};

// Initial state for the reducer
const initialState = {
    useJsonInput: false,
    jsonInput: '',
    jsonError: '',
    showDetails: false,
    queryJsonInput: '',
    bodyJsonInput: '',
    isTesting: false,
    response: null,
    lastRequestData: null,
    requestUrl: '',
    showPagination: false,
    missingParams: []
};

// Reducer function to handle state updates
const testSectionReducer = (state, action) => {
    switch (action.type) {
        case 'SET_USE_JSON_INPUT':
            return { ...state, useJsonInput: action.payload };
        case 'SET_JSON_INPUT':
            return { ...state, jsonInput: action.payload };
        case 'SET_JSON_ERROR':
            return { ...state, jsonError: action.payload };
        case 'SET_SHOW_DETAILS':
            return { ...state, showDetails: action.payload };
        case 'SET_QUERY_JSON_INPUT':
            return { ...state, queryJsonInput: action.payload };
        case 'SET_BODY_JSON_INPUT':
            return { ...state, bodyJsonInput: action.payload };
        case 'SET_IS_TESTING':
            return { ...state, isTesting: action.payload };
        case 'SET_RESPONSE':
            return { ...state, response: action.payload };
        case 'SET_LAST_REQUEST_DATA':
            return { ...state, lastRequestData: action.payload };
        case 'SET_REQUEST_URL':
            return { ...state, requestUrl: action.payload };
        case 'TOGGLE_PAGINATION':
            return { ...state, showPagination: !state.showPagination };
        case 'SET_SHOW_PAGINATION':
            return { ...state, showPagination: action.payload };
        case 'SET_MISSING_PARAMS':
            return { ...state, missingParams: action.payload };
        default:
            return state;
    }
};

const TestSection = ({ 
    title, 
    description,
    resource,
    action,
    tests,
    inputValues = {},
    onInputChange,
    onTest,
    children,
    isOpen,
    onToggle,
    apiDocs
}) => {
    const [state, dispatch] = useReducer(testSectionReducer, initialState);
    const {
        useJsonInput,
        jsonInput,
        jsonError,
        showDetails,
        queryJsonInput,
        bodyJsonInput,
        isTesting,
        response,
        lastRequestData,
        requestUrl,
        showPagination,
        missingParams
    } = state;

    // Get test configuration
    const testConfig = getTestConfig(tests, resource, action);
    if (!testConfig) {
        return <div>Test configuration not found</div>;
    }

    const { verb: method, endpoint, parameters } = testConfig;

    // Use useEffect to calculate missing params and update state
    useEffect(() => {
        // Check for mandatory parameters
        const calculateMissingParams = () => {
            if (useJsonInput) {
                let newMissingParams = [];
                console.log('Validating JSON input...');
                console.log('Parameters config:', parameters);
                console.log('Query JSON:', queryJsonInput);
                console.log('Body JSON:', bodyJsonInput);

                // Check query parameters if they exist
                if (parameters.query) {
                    console.log('Validating query parameters...');
                    if (queryJsonInput.trim()) {
                        try {
                            const queryData = JSON.parse(queryJsonInput);
                            console.log('Parsed query data:', queryData);
                            console.log('Query parameters config:', parameters.query);
                            
                            Object.entries(parameters.query)
                                .filter(([key, config]) => {
                                    console.log(`Checking if ${key} is required:`, config);
                                    return config.required;
                                })
                                .forEach(([key, config]) => {
                                    console.log(`Validating query param ${key}:`, config);
                                    const isArrayParam = Array.isArray(config);
                                    console.log(`Is array param: ${isArrayParam}`);
                                    console.log(`Value:`, queryData[key]);
                                    
                                    if (isArrayParam && (!queryData[key] || !Array.isArray(queryData[key]))) {
                                        newMissingParams.push(`${key} must be an array`);
                                    } else if (!isArrayParam && !queryData[key] && queryData[key] !== false && queryData[key] !== 0) {
                                        newMissingParams.push(key);
                                    }
                                });
                        } catch (e) {
                            console.error('Query JSON parse error:', e);
                            console.error('Invalid query JSON:', queryJsonInput);
                            newMissingParams.push('Invalid query JSON: ' + e.message);
                        }
                    } else if (Object.values(parameters.query).some(config => config.required)) {
                        newMissingParams.push('Query parameters required');
                    }
                }

                // Check body parameters if they exist
                if (parameters.body) {
                    console.log('Validating body parameters...');
                    if (bodyJsonInput.trim()) {
                        try {
                            const bodyData = JSON.parse(bodyJsonInput);
                            console.log('Parsed body data:', bodyData);
                            console.log('Body parameters config:', parameters.body);
                            
                            Object.entries(parameters.body)
                                .filter(([key, config]) => {
                                    console.log(`Checking if ${key} is required:`, config);
                                    return config.required;
                                })
                                .forEach(([key, config]) => {
                                    console.log(`Validating body param ${key}:`, config);
                                    const isArrayParam = Array.isArray(config);
                                    console.log(`Is array param: ${isArrayParam}`);
                                    console.log(`Value:`, bodyData[key]);
                                    
                                    if (isArrayParam && (!bodyData[key] || !Array.isArray(bodyData[key]))) {
                                        newMissingParams.push(`${key} must be an array`);
                                    } else if (!isArrayParam && !bodyData[key] && bodyData[key] !== false && bodyData[key] !== 0) {
                                        newMissingParams.push(key);
                                    }
                                });
                        } catch (e) {
                            console.error('Body JSON parse error:', e);
                            console.error('Invalid body JSON:', bodyJsonInput);
                            newMissingParams.push('Invalid body JSON: ' + e.message);
                        }
                    } else if (Object.values(parameters.body).some(config => config.required)) {
                        newMissingParams.push('Body parameters required');
                    }
                }

                console.log('Missing params:', newMissingParams);
                return newMissingParams;
            } else {
                const newMissingParams = [];
                
                // Check query parameters
                if (parameters.query) {
                    Object.entries(parameters.query).forEach(([key, config]) => {
                        if (config.required && (!inputValues[key] || inputValues[key] === '')) {
                            newMissingParams.push(key);
                        }
                    });
                }

                // Check body parameters
                if (parameters.body) {
                    if (hasArrayBody(testConfig)) {
                        // For array bodies, check if there's at least one item and all required fields are filled
                        const bodyArray = inputValues.body || [];
                        if (bodyArray.length === 0) {
                            newMissingParams.push('At least one item required');
                        } else {
                            const schema = getArrayBodyItemSchema(testConfig);
                            bodyArray.forEach((item, index) => {
                                Object.entries(schema).forEach(([key, config]) => {
                                    if (config.required && (!item[key] || item[key] === '')) {
                                        newMissingParams.push(`Item ${index + 1}: ${key}`);
                                    }
                                });
                            });
                        }
                    } else {
                        // Original object body validation
                        Object.entries(parameters.body).forEach(([key, config]) => {
                            if (config.required && (!inputValues[key] || inputValues[key] === '')) {
                                newMissingParams.push(key);
                            }
                        });
                    }
                }

                // Check path parameters
                if (parameters.path) {
                    Object.entries(parameters.path).forEach(([key, config]) => {
                        if (config.required && (!inputValues[key] || inputValues[key] === '')) {
                            newMissingParams.push(key);
                        }
                    });
                }

                return newMissingParams;
            }
        };

        const newMissingParams = calculateMissingParams();
        
        // Only dispatch if the missing params have changed to avoid infinite loops
        if (JSON.stringify(newMissingParams) !== JSON.stringify(missingParams)) {
            dispatch({ type: 'SET_MISSING_PARAMS', payload: newMissingParams });
        }
    }, [testConfig, parameters, inputValues, useJsonInput, queryJsonInput, bodyJsonInput, missingParams]);

    const isDisabled = missingParams.length > 0;

    const getMethodColor = (method) => {
        switch (method) {
            case 'GET':
                return 'method-get';
            case 'POST':
                return 'method-post';
            case 'PUT':
                return 'method-put';
            case 'DELETE':
                return 'method-delete';
            case 'PATCH':
                return 'method-patch';
            default:
                return 'bg-gray-200';
        }
    };

    const getMethodButtonColor = (method) => {
        switch (method) {
            case 'GET':
                return 'bg-blue-600 hover:bg-blue-700 text-white';
            case 'POST':
                return 'bg-emerald-600 hover:bg-emerald-700 text-white';
            case 'PUT':
                return 'bg-amber-600 hover:bg-amber-700 text-white';
            case 'DELETE':
                return 'bg-red-600 hover:bg-red-700 text-white';
            case 'PATCH':
                return 'bg-indigo-600 hover:bg-indigo-700 text-white';
            default:
                return 'bg-gray-700 hover:bg-gray-800 text-white';
        }
    };

    const getButtonText = () => {
        if (isTesting) {
            return 'Testing...';
        } 
        if (missingParams.length > 0) {
            return 'Missing parameters';
        }
        return `Test ${method.toUpperCase()}`;
    };

    const handleTest = async () => {
        // Check if we have required fields
        if (missingParams.length > 0) {
            return;
        }

        dispatch({ type: 'SET_IS_TESTING', payload: true });
        dispatch({ type: 'SET_JSON_ERROR', payload: null });
        dispatch({ type: 'SET_RESPONSE', payload: null });

        try {
            const requestParams = buildRequestParams(testConfig, inputValues);
            
            // Set local lastRequestData before making the API call
            dispatch({ 
                type: 'SET_LAST_REQUEST_DATA', 
                payload: {
                    method: requestParams.method,
                    queryParams: requestParams.queryParams,
                    body: requestParams.body,
                    pathParams: requestParams.pathParams
                }
            });
            
            const response = await onTest(requestParams);
            dispatch({ type: 'SET_RESPONSE', payload: response });
        } catch (error) {
            console.error('Test failed:', error);
            dispatch({ type: 'SET_JSON_ERROR', payload: error.message || 'Test failed' });
        } finally {
            dispatch({ type: 'SET_IS_TESTING', payload: false });
        }
    };

    const handleCopyResponse = async () => {
        if (response?.data) {
            try {
                await navigator.clipboard.writeText(JSON.stringify(response.data, null, 2));
            } catch (error) {
                console.error('Failed to copy response:', error);
            }
        }
    };

    // Add this function to render API documentation
    const renderApiDocumentation = () => {
        if (!apiDocs) return null;
        
        return (
            <div className="mb-6 bg-blue-50 rounded-lg overflow-hidden">
                <div className="bg-blue-600 px-4 py-3">
                    <h3 className="text-lg font-semibold text-white">{apiDocs.title}</h3>
                </div>
                <div className="p-4">
                    <p className="text-gray-700 mb-4">{apiDocs.content}</p>
                    
                    {apiDocs.examples && apiDocs.examples.length > 0 && (
                        <div className="mb-4">
                            <h4 className="text-md font-semibold text-blue-800 mb-2">Examples</h4>
                            {apiDocs.examples.map((example, index) => (
                                <div key={index} className="mb-3">
                                    <p className="text-sm font-medium text-gray-700 mb-1">{example.title}</p>
                                    {example.json && (
                                        <pre className="bg-gray-800 text-green-300 p-3 rounded font-mono text-sm overflow-x-auto">
                                            {example.json}
                                        </pre>
                                    )}
                                    {example.query && (
                                        <pre className="bg-gray-800 text-green-300 p-3 rounded font-mono text-sm overflow-x-auto">
                                            {example.query}
                                        </pre>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {apiDocs.notes && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
                            <p className="text-sm text-yellow-700">
                                <strong>Note:</strong> {apiDocs.notes}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderPaginationSection = () => {
        if (method !== 'GET') return null;

        return (
            <div className={`mb-4 border rounded-lg ${themeColors.border.DEFAULT} overflow-hidden`}>
                <div 
                    className={`flex items-center justify-between p-3 ${themeColors.surface.dark} cursor-pointer`}
                    onClick={() => dispatch({ type: 'TOGGLE_PAGINATION' })}
                >
                    <h3 className={`text-sm font-semibold ${themeColors.text.primary}`}>
                        Pagination Parameters
                    </h3>
                    <div className="transform transition-transform duration-200" style={{ transform: showPagination ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                        ▶
                    </div>
                </div>
                {showPagination && (
                    <div className="p-4 space-y-3">
                        {[
                            {
                                name: 'limit',
                                type: 'number',
                                placeholder: 'Limit (default: 100, max: 1000)',
                                description: 'Limit (default: 100, max: 1000)',
                                min: '1',
                                max: '1000'
                            },
                            {
                                name: 'per_page', 
                                type: 'number',
                                placeholder: 'Items per page (default: 100, max: 1000)',
                                description: 'Items per page (default: 100, max: 1000)',
                                min: '1',
                                max: '1000'
                            },
                            {
                                name: 'sort',
                                placeholder: 'Sort field (default: createdAt)',
                                description: 'Sort field (default: createdAt)'
                            },
                            {
                                name: 'order',
                                type: 'select', 
                                placeholder: 'Select sort order (default: desc)',
                                description: 'Sort order (default: desc)',
                                options: ['asc', 'desc']
                            }
                        ].map(field => (
                            <div key={field.name} className="space-y-1">
                                <label className={`block text-sm font-medium ${themeColors.text.primary}`}>
                                    {field.name}
                                </label>
                                {field.type === 'select' ? (
                                    <select
                                        value={inputValues[field.name] || ''}
                                        onChange={(e) => onInputChange(field.name, e.target.value)}
                                        className={`mt-1 block w-full rounded-md ${themeColors.border.DEFAULT} shadow-sm focus:${themeColors.primary.DEFAULT} focus:ring-${themeColors.primary.DEFAULT} sm:text-sm ${themeColors.background.light} ${themeColors.text.primary}`}
                                    >
                                        <option value="">{field.placeholder}</option>
                                        {field.options.map(option => (
                                            <option key={option} value={option}>{option}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type={field.type}
                                        value={inputValues[field.name] || ''}
                                        onChange={(e) => onInputChange(field.name, e.target.value)}
                                        className={`mt-1 block w-full rounded-md ${themeColors.border.DEFAULT} shadow-sm focus:${themeColors.primary.DEFAULT} focus:ring-${themeColors.primary.DEFAULT} sm:text-sm ${themeColors.background.light} ${themeColors.text.primary}`}
                                        placeholder={field.placeholder}
                                        min={field.min}
                                        max={field.max}
                                    />
                                )}
                                <p className={`text-xs ${themeColors.text.secondary}`}>{field.description}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={`border rounded-lg overflow-hidden ${themeColors.border.DEFAULT} ${themeColors.surface.DEFAULT} mb-4`}>
            <div 
                className={`flex items-center justify-between p-4 ${themeColors.surface.dark} cursor-pointer`}
                onClick={onToggle}
            >
                <div>
                    <h3 className={`text-lg font-medium ${themeColors.text.primary}`}>
                        {title}
                        <span className={`ml-2 text-sm font-mono px-2 py-1 rounded ${getMethodColor(method)}`}>
                            {method}
                        </span>
                    </h3>
                    <p className={`text-sm ${themeColors.text.secondary}`}>{description}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm font-mono text-gray-500 dark:text-gray-400">{endpoint}</p>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                dispatch({ type: 'SET_SHOW_DETAILS', payload: !showDetails });
                            }}
                            className="text-xs px-2 py-1 bg-white text-blue-600 border border-blue-300 rounded hover:bg-blue-50 transition-colors"
                        >
                            {showDetails ? 'Hide Details' : 'Show Details'}
                        </button>
                    </div>
                    {showDetails && (
                        <div className="mt-2 space-y-1 text-sm font-mono">
                            <p className="text-gray-600 dark:text-gray-400">Endpoint URL: <span className="text-gray-800 dark:text-gray-300">{constructUrl(endpoint, inputValues)}</span></p>
                            {Object.keys(inputValues).length > 0 && (
                                <div className="text-gray-600 dark:text-gray-400">
                                    Input Values:
                                    <pre className="mt-1 text-gray-800 dark:text-gray-300 bg-gray-50 dark:bg-dark-bg-primary p-2 rounded">
                                        {JSON.stringify(inputValues, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="transform transition-transform duration-200 dark:text-dark-text-primary" style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                    ▶
                </div>
            </div>
            {isOpen && (
                <div className="p-4 space-y-4 bg-gray-50">
                    {renderApiDocumentation()}
                    
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                {state.missingParams.length > 0 && (
                                    <div className={`px-3 py-1 rounded text-sm ${themeColors.status.error.light}`}>
                                        Missing parameters: {state.missingParams.join(', ')}
                                    </div>
                                )}
                            </div>
                            {children}
                        </div>

                        <div className="grid grid-cols-2 gap-4 !grid !grid-cols-2 w-full" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                            <div className="w-full">
                                {renderPaginationSection()}
                                <ParameterFields
                                    parameters={parameters}
                                    inputValues={inputValues}
                                    onInputChange={onInputChange}
                                    testConfig={testConfig}
                                />
                            </div>

                            <div>
                                {/* Request Details */}
                                <div className="border rounded-lg overflow-hidden text-sm">
                                    <div className="bg-gray-50 px-3 py-2 border-b">
                                        <h3 className="font-semibold text-gray-700">Request Details</h3>
                                    </div>
                                    <div className="divide-y">
                                        {/* Endpoint and Method */}
                                        <div className="px-3 py-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="text-xs font-medium text-gray-500">Endpoint</div>
                                                    <code className="text-xs bg-gray-50 px-1.5 py-0.5 rounded block truncate">
                                                        {requestUrl || endpoint || 'No request made yet'}
                                                    </code>
                                                </div>
                                                <div className="flex-shrink-0">
                                                    <div className="text-xs font-medium text-gray-500">Method</div>
                                                    <span className={`inline-block px-1.5 py-0.5 text-xs rounded ${getMethodColor(method)}`}>
                                                        {method}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Query Parameters */}
                                        <div className="px-3 py-2">
                                            <div className="text-xs font-medium text-gray-500 mb-1">Query Parameters</div>
                                            <pre className="text-xs bg-gray-50 p-1.5 rounded overflow-x-auto max-h-24">
                                                {lastRequestData?.queryParams && Object.keys(lastRequestData.queryParams).length > 0
                                                    ? JSON.stringify(lastRequestData.queryParams, null, 2)
                                                    : 'No query parameters'}
                                            </pre>
                                        </div>

                                        {/* Body Parameters */}
                                        <div className="px-3 py-2">
                                            <div className="text-xs font-medium text-gray-500 mb-1">Body Parameters</div>
                                            <pre className="text-xs bg-gray-50 p-1.5 rounded overflow-x-auto max-h-24">
                                                {lastRequestData?.body && Object.keys(lastRequestData.body).length > 0
                                                    ? JSON.stringify(lastRequestData.body, null, 2)
                                                    : 'No body parameters'}
                                            </pre>
                                        </div>

                                        {/* Path Parameters */}
                                        <div className="px-3 py-2">
                                            <div className="text-xs font-medium text-gray-500 mb-1">Path Parameters</div>
                                            <pre className="text-xs bg-gray-50 p-1.5 rounded overflow-x-auto max-h-24">
                                                {lastRequestData?.pathParams && Object.keys(lastRequestData.pathParams).length > 0
                                                    ? JSON.stringify(lastRequestData.pathParams, null, 2)
                                                    : 'No path parameters'}
                                            </pre>
                                        </div>
                                    </div>
                                </div>

                                {/* Response Details */}
                                <div className="border rounded-lg overflow-hidden mt-4 text-sm">
                                    <div className="bg-gray-50 px-3 py-2 border-b flex items-center justify-between">
                                        <h3 className="font-semibold text-gray-700">Response</h3>
                                        {response && (
                                            <div className="flex items-center space-x-2">
                                                <span className={`inline-block px-1.5 py-0.5 text-xs rounded ${
                                                    response.success 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : 'bg-red-100 text-red-800'
                                                }`}>
                                                    Status: {response.meta?.http_status_code || response.status}
                                                </span>
                                                <button
                                                    onClick={handleCopyResponse}
                                                    className="text-gray-500 hover:text-gray-700 transition-colors"
                                                    title="Copy Response"
                                                >
                                                    <FaRegCopy className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="divide-y">
                                        {/* Response Headers */}
                                        <div className="px-3 py-2">
                                            <div className="text-xs font-medium text-gray-500 mb-1">Headers</div>
                                            <pre className="text-xs bg-gray-50 p-1.5 rounded overflow-x-auto max-h-24">
                                                {response?.headers && Object.keys(response.headers).length > 0
                                                    ? JSON.stringify(response.headers, null, 2)
                                                    : 'No headers available'}
                                            </pre>
                                        </div>

                                        {/* Response Body */}
                                        <div className="px-3 py-2">
                                            <div className="text-xs font-medium text-gray-500 mb-1">Body</div>
                                            <pre className={`text-xs p-1.5 rounded overflow-x-auto max-h-48 ${
                                                response 
                                                    ? response.success 
                                                        ? 'bg-green-50' 
                                                        : 'bg-red-50'
                                                    : 'bg-gray-50'
                                            }`}>
                                                {response 
                                                    ? JSON.stringify(response, null, 2)
                                                    : 'No response received yet'}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Execute API Button - Full Width */}
                        <div className="mb-6">
                            <LoadingButton
                                onClick={handleTest}
                                disabled={isDisabled}
                                isLoading={isTesting}
                                className={`w-full flex justify-center items-center px-6 py-4 rounded-lg font-bold text-md tracking-wide shadow-md transition-all duration-300 ${
                                    isDisabled
                                        ? 'bg-amber-50 text-amber-900 cursor-not-allowed border border-amber-200'
                                        : `${getMethodButtonColor(method)} hover:shadow-lg transform hover:-translate-y-1`
                                }`}
                                tooltip={getButtonText()}
                            >
                                {isDisabled && missingParams.length > 0 ? (
                                    <div className="flex items-center overflow-hidden">
                                        <ExclamationTriangleIcon 
                                            className="text-amber-600 mr-1 flex-shrink-0" 
                                            style={{ height: '50px', width: '50px' }} 
                                        />
                                        <span className="whitespace-nowrap overflow-hidden text-ellipsis text-lg">
                                            Required: <span className="font-semibold">{missingParams.join(', ')}</span>
                                        </span>
                                    </div>
                                ) : (
                                    <span className={`${isDisabled ? 'text-gray-800' : 'drop-shadow-sm'}`}>
                                        {isTesting ? 'Executing...' : getButtonText()}
                                    </span>
                                )}
                            </LoadingButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

TestSection.propTypes = {
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    resource: PropTypes.string.isRequired,
    action: PropTypes.string.isRequired,
    tests: PropTypes.object.isRequired,
    inputValues: PropTypes.object,
    onInputChange: PropTypes.func.isRequired,
    onTest: PropTypes.func.isRequired,
    children: PropTypes.node,
    isOpen: PropTypes.bool,
    onToggle: PropTypes.func,
    apiDocs: PropTypes.object
};

export default TestSection;