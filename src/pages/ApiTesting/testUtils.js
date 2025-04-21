import { localSettings } from '../../utils/localSettings';
import { getMockResponse } from './mockApiData.js';

/**
 * Makes an API request and handles state updates
 */
export const makeApiRequest = async (
    url,
    method = 'GET',
    body = null,
    stateSetters,
    customConfig = {},
    useMock = false // Add useMock parameter, default to false
) => {
    const {
        setResponse,
        setResponseHeaders,
        setRequestUrl,
        setError,
        setLastRequestData
    } = stateSetters;

    // Clear all states before making a new request
    setResponse(null);
    setResponseHeaders(null);
    setRequestUrl('');
    setError(null);
    setLastRequestData(null);

    // Set new request URL
    setRequestUrl(url);

    // Parse query parameters from the actual URL
    const urlObj = new URL(url, window.location.origin);
    const queryParams = Object.fromEntries(urlObj.searchParams.entries());
    
    // Extract path parameters if any
    const pathParams = {};
    const pathRegex = /:([^/]+)/g;
    let match;
    let pathUrl = url;
    while ((match = pathRegex.exec(url)) !== null) {
        const paramName = match[1];
        // Check if this parameter is replaced in the actual URL
        const paramRegex = new RegExp(`/${match[0]}(/|$)`, 'g');
        const valueMatch = pathUrl.match(new RegExp(`/([^/]+)(/|$)`, 'g'));
        if (valueMatch && valueMatch.length > 0) {
            // Extract the value (remove leading and trailing slashes)
            const value = valueMatch[0].replace(/^\/|\/$/g, '');
            pathParams[paramName] = value;
            // Update pathUrl to remove processed part
            pathUrl = pathUrl.replace(valueMatch[0], '/');
        }
    }

    // Set request data with query, body, and path parameters
    setLastRequestData({
        method,
        ...(Object.keys(queryParams).length > 0 && { queryParams }),
        ...(body && { body }),
        ...(Object.keys(pathParams).length > 0 && { pathParams })
    });

    try {
        // --- START MOCK LOGIC ---
        if (useMock) {
            console.warn(`Using mock data for ${method} ${url}`);
            const mockResponse = await getMockResponse(url, method, body);
            
            // Set states similar to the real request flow
            setResponse(mockResponse);
            setResponseHeaders(mockResponse.headers || {});
            if (!mockResponse.success && mockResponse.meta?.error?.message) {
                setError(mockResponse.meta.error.message);
            } else {
                setError(null); // Clear error on success
            }
            return mockResponse; // Return the mock response directly
        }
        // --- END MOCK LOGIC ---

        const makeRequest = async (customRequest = {}, fullUrl = url) => {
            const headers = {
                'Content-Type': 'application/json',
                ...customConfig.headers,
                ...customRequest.headers
            };

            const apiRawResponse = await fetch(fullUrl, {
                method: customRequest.method || method,
                headers,
                ...(customRequest.body ? { body: customRequest.body } : body && { body: JSON.stringify(body) }),
                ...(process.env.NODE_ENV === 'development' && { credentials: 'include' })
            });

            let apiResponse = await apiRawResponse.json();

            // Convert headers to a plain object for easier handling
            const responseHeaders = {};
            apiRawResponse.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });

            if (!apiRawResponse.ok) {
                throw {
                    response: {
                        data: apiResponse.data || [],
                        success: false,
                        meta: {
                            http_status_code: apiRawResponse.status,
                            error: apiResponse.meta?.error || {
                                code: 'API_ERROR',
                                message: apiResponse.data?.message || 'API request failed'
                            }
                        },
                        headers: responseHeaders
                    }
                };
            }

            return { 
                apiResponse, 
                apiRawResponse,
                headers: responseHeaders,
                status: apiRawResponse.status
            };
        };

        // Make the request
        let { apiResponse, apiRawResponse, headers, status } = await makeRequest();

        let truncated = false;
        let totalCount = null;

        let data = apiResponse.data;

        if (Array.isArray(data)) {
            totalCount = data.length;
            if (data.length > 25) {
                data = data.slice(0, 25);
                truncated = true;
            }
        }
        apiResponse.data = data;

        // Add headers and status to the response object
        apiResponse.headers = headers;
        apiResponse.status = status;

        setResponse(apiResponse);
        setResponseHeaders(headers);
        return apiResponse;
    } catch (err) {
        // Use the error response if it exists, otherwise create one
        const errorResponse = err.response || {
            data: [],
            success: false,
            meta: {
                http_status_code: err.status || 500,
                error: {
                    code: err.code || 'REQUEST_ERROR',
                    message: err.message || 'An error occurred'
                }
            },
            headers: {}
        };
        
        setResponse(errorResponse);
        setResponseHeaders(errorResponse.headers || {});
        if (errorResponse.meta?.error?.message) {
            setError(errorResponse.meta.error.message);
        }
        return errorResponse;
    }
};

/**
 * Extract query parameters from a URL
 * @param {string} url - The URL to parse
 * @returns {Object} - Object containing query parameters
 */
export const getQueryParams = (url) => {
    try {
        const urlObj = new URL(url);
        const params = {};
        urlObj.searchParams.forEach((value, key) => {
            params[key] = value;
        });
        return params;
    } catch (error) {
        return {};
    }
};

/**
 * Get the base endpoint without query parameters
 * @param {string} url - The URL to parse
 * @returns {string} - The base endpoint
 */
export const getBaseEndpoint = (url) => {
    try {
        const urlObj = new URL(url);
        return urlObj.pathname;
    } catch (error) {
        return url;
    }
};

/**
 * Parse and validate JSON input
 * @param {string} jsonString - The JSON string to parse
 * @returns {Object} - Object containing parsed data and any error
 */
export const parseJsonInput = (jsonString) => {
    try {
        const data = JSON.parse(jsonString);
        return { data, error: null };
    } catch (error) {
        return { data: null, error: 'Invalid JSON format' };
    }
};

/**
 * Check if an HTTP method can have a request body
 * @param {string} method - The HTTP method
 * @returns {boolean} - Whether the method can have a body
 */
export const canMethodHaveBody = (method) => {
    return ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase());
};

/**
 * Get test configuration from tests.json
 * @param {string} resource - The resource name (e.g., 'items')
 * @param {string} action - The action name (e.g., 'create', 'get')
 * @returns {Object} - Test configuration object
 */
export const getTestConfig = (tests, resource, action) => {
    try {
        if (!tests[resource] || !tests[resource][action]) {
            throw new Error(`Test configuration not found for ${resource}.${action}`);
        }
        const config = { ...tests[resource][action] };
        
        // Remove pagination parameters from query parameters for GET requests
        if (config.verb === 'GET' && config.parameters?.query) {
            const { page, per_page, sort, order, ...otherParams } = config.parameters.query;
            config.parameters = {
                ...config.parameters,
                query: otherParams
            };
        }
        
        return config;
    } catch (error) {
        console.error('Error getting test configuration:', error);
        return null;
    }
};

/**
 * Build request parameters based on test configuration
 * @param {Object} testConfig - The test configuration object
 * @param {Object} inputValues - The actual input values
 * @returns {Object} - Request parameters object
 */
export const buildRequestParams = (testConfig, inputValues) => {
    const result = {
        method: testConfig.verb,
        url: testConfig.endpoint.startsWith('/') ? testConfig.endpoint : `/${testConfig.endpoint}`,
        queryParams: {},
        pathParams: {},
        body: null,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    // Process parameters based on their types
    if (testConfig.parameters) {
        // Handle query parameters
        if (testConfig.parameters.query) {
            Object.entries(testConfig.parameters.query).forEach(([key, config]) => {
                if (inputValues[key] !== undefined && inputValues[key] !== '') {
                    result.queryParams[key] = inputValues[key];
                }
            });
        }

        // Add pagination parameters if provided (available for all GET requests)
        if (testConfig.verb === 'GET') {
            const paginationParams = ['page', 'per_page', 'limit', 'sort', 'order'];
            paginationParams.forEach(param => {
                if (inputValues[param] !== undefined && inputValues[param] !== '') {
                    result.queryParams[param] = inputValues[param];
                }
            });
        }

        // Handle path parameters
        if (testConfig.parameters.path) {
            Object.entries(testConfig.parameters.path).forEach(([key, config]) => {
                if (inputValues[key] !== undefined && inputValues[key] !== '') {
                    result.pathParams[key] = inputValues[key];
                }
            });
        }

        // Handle body parameters
        if (testConfig.parameters.body && canMethodHaveBody(testConfig.verb)) {
            // Check if body is an array configuration
            if (Array.isArray(testConfig.parameters.body)) {
                // Handle array of objects
                if (Array.isArray(inputValues.body)) {
                    // If the body parameter itself is an array (e.g. [{...}])
                    result.body = inputValues.body
                        .map(item => {
                            const bodyItem = {};
                            // Apply the object structure to each array item
                            testConfig.parameters.body[0] && Object.entries(testConfig.parameters.body[0]).forEach(([key, config]) => {
                                if (item[key] !== undefined && item[key] !== '' && item[key] !== null) {
                                    // Convert to number if the parameter type is number
                                    if (config.type === 'number') {
                                        bodyItem[key] = Number(item[key]);
                                    } else if (config.type === 'array') {
                                        // If the field itself is an array type
                                        bodyItem[key] = Array.isArray(item[key]) ? item[key] : [item[key]];
                                    } else {
                                        bodyItem[key] = item[key];
                                    }
                                }
                            });
                            return Object.keys(bodyItem).length > 0 ? bodyItem : null;
                        })
                        .filter(item => item !== null && Object.keys(item).length > 0); // Remove empty objects
                }
            } else {
                // Original object body handling
                const body = {};
                Object.entries(testConfig.parameters.body).forEach(([key, config]) => {
                    if (inputValues[key] !== undefined && inputValues[key] !== '' && inputValues[key] !== null) {
                        // Convert to number if the parameter type is number
                        if (config.type === 'number') {
                            body[key] = Number(inputValues[key]);
                        } else if (config.type === 'array') {
                            // If the field is an array type
                            body[key] = Array.isArray(inputValues[key]) ? inputValues[key] : [inputValues[key]];
                        } else {
                            body[key] = inputValues[key];
                        }
                    }
                });
                if (Object.keys(body).length > 0) {
                    result.body = body;
                }
            }
        }
    }

    // Build the final URL with query parameters
    let url = result.url.startsWith('/api') ? result.url : `/api${result.url}`;
    
    // Replace path parameters
    if (Object.keys(result.pathParams).length > 0) {
        Object.entries(result.pathParams).forEach(([key, value]) => {
            url = url.replace(`:${key}`, value);
        });
    }

    // Add query parameters
    if (Object.keys(result.queryParams).length > 0) {
        const searchParams = new URLSearchParams();
        Object.entries(result.queryParams).forEach(([key, value]) => {
            if (value !== undefined && value !== '' && value !== null) {
                searchParams.append(key, value);
            }
        });
        const queryString = searchParams.toString();
        if (queryString) {
            url = `${url}?${queryString}`;
        }
    }

    result.url = url;
    return result;
};

/**
 * Validates that all mandatory parameters are filled
 */
export const validateMandatoryParams = (mandatoryParams, queryParams, pathParams) => {
    // If there are no mandatory parameters, validation should pass
    if (!mandatoryParams || mandatoryParams.length === 0) {
        return true;
    }

    const allParams = { ...queryParams, ...pathParams };
    return mandatoryParams.every(param => 
        allParams[param] && allParams[param].toString().trim() !== ''
    );
};

/**
 * Checks if a parameter is mandatory
 */
export const isParamMandatory = (paramName, mandatoryParams) => {
    return mandatoryParams.includes(paramName);
};

/**
 * Constructs the full URL with query and path parameters
 */
export const constructUrl = (endpoint, queryParams, pathParams) => {
    let url = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;

    // Add path parameters if they exist
    if (pathParams) {
        Object.entries(pathParams).forEach(([key, value]) => {
            url = url.replace(`:${key}`, value);
        });
    }

    // Add query parameters if they exist
    if (queryParams && Object.keys(queryParams).length > 0) {
        const params = new URLSearchParams();
        Object.entries(queryParams).forEach(([key, value]) => {
            if (value) {
                params.append(key, value);
            }
        });
        const queryString = params.toString();
        if (queryString) {
            url += `?${queryString}`;
        }
    }

    return url;
};

/**
 * Checks if a test configuration has an array-based body
 * @param {Object} testConfig - The test configuration object
 * @returns {boolean} - Whether the test has an array-based body
 */
export const hasArrayBody = (testConfig) => {
    return testConfig?.parameters?.body && Array.isArray(testConfig.parameters.body);
};

/**
 * Gets the body item schema for array-based bodies
 * @param {Object} testConfig - The test configuration object
 * @returns {Object|null} - The schema for a single item in the array body
 */
export const getArrayBodyItemSchema = (testConfig) => {
    if (!hasArrayBody(testConfig)) return null;
    return testConfig.parameters.body[0] || null;
};