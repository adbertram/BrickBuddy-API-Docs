import React, { useState, useEffect } from 'react';
import TestGroupSection from './components/TestGroupSection';
import TestSection from './components/TestSection';
import { getTestConfig, makeApiRequest } from './testUtils';
import { FaLink, FaClock, FaBook, FaCode, FaTools } from 'react-icons/fa';
import { fetchOpenApiTests } from '../../utils/openApiParser';

const ApiTesting = () => {
    const [openSections, setOpenSections] = useState({});
    const [response, setResponse] = useState(null);
    const [responseHeaders, setResponseHeaders] = useState(null);
    const [requestUrl, setRequestUrl] = useState('');
    const [error, setError] = useState(null);
    const [lastRequestData, setLastRequestData] = useState(null);
    const [inputValues, setInputValues] = useState({});
    const [combinedTestsData, setCombinedTestsData] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    // Load both OpenAPI specs and legacy tests data on component mount
    useEffect(() => {
        const loadTests = async () => {
            try {
                setIsLoading(true);
                // Load OpenAPI specs using our utility function
                const openApiTests = await fetchOpenApiTests();
                
                console.log('Loaded OpenAPI tests:', openApiTests);
                
                setCombinedTestsData(openApiTests);
            } catch (error) {
                console.error('Error loading test configurations:', error);
            } finally {
                setIsLoading(false);
            }
        };
        
        loadTests();
    }, []);

    const handleToggle = (sectionId) => {
        setOpenSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    const handleInputChange = (key, value) => {
        setInputValues(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleTest = async (requestParams) => {
        const url = requestParams.url;
        const method = requestParams.method;
        const body = requestParams.body;

        // Always use mock data
        const response = await makeApiRequest(url, method, body, {
            setResponse,
            setResponseHeaders,
            setRequestUrl,
            setError,
            setLastRequestData
        }, {}, true); // Always use mock mode
        
        return response; // Return the response to TestSection
    };

    // Process the test data to create test groups
    const renderTestGroups = () => {
        // If still loading, show loading indicator
        if (isLoading) {
            return (
                <div className="p-6 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
                    <p className="text-gray-700">Loading test configurations...</p>
                </div>
            );
        }
        
        // If no test data is loaded, show message
        if (Object.keys(combinedTestsData).length === 0) {
            return (
                <div className="p-6 text-center bg-yellow-50 rounded-lg">
                    <p className="text-yellow-700">No test configurations found. Please check your API specifications.</p>
                </div>
            );
        }
        
        // Filter out parent_group entries and create a map of parent groups to child groups
        const parentToChildrenMap = {};
        
        // First pass: identify all parent groups and their children
        Object.entries(combinedTestsData).forEach(([groupName, groupConfig]) => {
            if (groupConfig.parent_group) {
                if (!parentToChildrenMap[groupConfig.parent_group]) {
                    parentToChildrenMap[groupConfig.parent_group] = [];
                }
                parentToChildrenMap[groupConfig.parent_group].push({
                    name: groupName,
                    config: groupConfig
                });
            }
        });
        
        // Second pass: create test groups
        return Object.entries(combinedTestsData)
            .filter(([groupName, groupConfig]) => !groupConfig.parent_group) // Only process top-level groups
            .map(([groupName, groupConfig], index) => {
                // Create a unique ID for this group
                const groupId = groupName.toLowerCase().replace(/\s+/g, '_');
                
                // Get all test actions for this group
                const testActions = Object.keys(groupConfig)
                    .filter(key => typeof groupConfig[key] === 'object' && !['parent_group'].includes(key));
                
                // Get child groups if any
                const childGroups = parentToChildrenMap[groupName] || [];
                
                // No test actions and no child groups, skip this group
                if (testActions.length === 0 && childGroups.length === 0) {
                    return null;
                }
                
                return (
                    <TestGroupSection
                        key={`group-${index}`}
                        title={groupName}
                        isOpen={openSections[groupId] || false}
                        onToggle={() => handleToggle(groupId)}
                    >
                        {/* Add resource description */}
                        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                            <h3 className="text-lg font-semibold text-blue-800 mb-2">About {groupName}</h3>
                            <p className="text-gray-700">
                                {getResourceDescription(groupName)}
                            </p>
                        </div>
                        
                        {/* Render test actions for this group */}
                        {testActions.map((action, actionIndex) => {
                            const actionId = `${groupId}_${action}`;
                            const tests = {
                                [groupId]: {
                                    [action]: getTestConfig(combinedTestsData, groupName, action)
                                }
                            };
                            
                            return (
                                <TestSection
                                    key={`action-${actionIndex}`}
                                    title={`${action.charAt(0).toUpperCase() + action.slice(1)} ${groupName}`}
                                    description={groupConfig[action].description || `${action} operation for ${groupName}`}
                                    resource={groupId}
                                    action={action}
                                    tests={tests}
                                    isOpen={openSections[actionId] || false}
                                    onToggle={() => handleToggle(actionId)}
                                    onTest={handleTest}
                                    onInputChange={handleInputChange}
                                    inputValues={inputValues}
                                    apiDocs={getActionDocs(groupName, action)}
                                />
                            );
                        })}
                        
                        {/* Render child groups */}
                        {childGroups.map((childGroup, childIndex) => {
                            const childGroupId = childGroup.name.toLowerCase().replace(/\s+/g, '_');
                            const childTestActions = Object.keys(childGroup.config)
                                .filter(key => typeof childGroup.config[key] === 'object' && !['parent_group'].includes(key));
                            
                            if (childTestActions.length === 0) {
                                return null;
                            }
                            
                            return childTestActions.map((action, actionIndex) => {
                                const actionId = `${childGroupId}_${action}`;
                                const tests = {
                                    [childGroupId]: {
                                        [action]: getTestConfig(combinedTestsData, childGroup.name, action)
                                    }
                                };
                                
                                return (
                                    <TestSection
                                        key={`child-action-${childIndex}-${actionIndex}`}
                                        title={`${action.charAt(0).toUpperCase() + action.slice(1)} ${childGroup.name}`}
                                        description={childGroup.config[action].description || `${action} operation for ${childGroup.name}`}
                                        resource={childGroupId}
                                        action={action}
                                        tests={tests}
                                        isOpen={openSections[actionId] || false}
                                        onToggle={() => handleToggle(actionId)}
                                        onTest={handleTest}
                                        onInputChange={handleInputChange}
                                        inputValues={inputValues}
                                        apiDocs={getActionDocs(childGroup.name, action)}
                                    />
                                );
                            });
                        })}
                    </TestGroupSection>
                );
            })
            .filter(Boolean); // Remove null entries
    };

    // Helper function to get resource descriptions
    const getResourceDescription = (resourceName) => {
        const descriptions = {
            "Item": "Items represent individual pieces in the BrickBuddy system. Each item has a unique number, type, and optional properties like name, weight, and category. Use these endpoints to manage  items in your inventory.",
            "Lot": "Lots are specific combinations of items and colors. They include pricing data for both new and used conditions. Use these endpoints to manage your lots and track their market values.",
            "Inventory": "Inventory represents the physical items you have in stock. Each inventory entry is linked to a lot and includes quantity and condition information. Use these endpoints to manage your inventory records.",
            "Set": "Sets are collections of items that make up a complete set. Each set has a unique number and includes information about its contents. Use these endpoints to manage  sets in your system.",
            "Order": "Orders represent customer purchases. They contain details about the items ordered, shipping information, and payment status. Use these endpoints to manage customer orders.",
            "Color": "Colors represent the different colors available for pieces. Each color has a unique ID and name. Use these endpoints to retrieve color information.",
            "Piece Destinations": "The Piece Destinations API allows you to find potential destinations for pieces in your inventory, including which sets they can be used in and which part storage locations they should be stored in."
        };
        
        return descriptions[resourceName] || `The ${resourceName} resource provides endpoints for managing ${resourceName.toLowerCase()} data.`;
    };

    // Helper function to get detailed documentation for each endpoint
    const getActionDocs = (resourceName, action) => {
        // Basic documentation structure
        const docs = {
            "Item": {
                "create": {
                    "title": "Creating Items",
                    "content": "The Create Item endpoint allows you to add new  pieces to the BrickBuddy system. Each item must have a unique number and type. Optional fields include name, weight, and category_id.",
                    "examples": [
                        {
                            "title": "Basic Item Creation",
                            "json": `{\n  "number": "3001",\n  "type": "PART",\n  "name": "Brick 2 x 4"\n}`
                        }
                    ],
                    "notes": "The number field should match the official  part number. Type can be 'PART', 'MINIFIG', 'SET', or other recognized  item types."
                },
                "get": {
                    "title": "Retrieving Items",
                    "content": "The Get Items endpoint allows you to retrieve  pieces from the BrickBuddy system. You can filter by ID, number, or name to find specific items.",
                    "examples": [
                        {
                            "title": "Get Items by Number",
                            "query": "?number=3001"
                        }
                    ],
                    "notes": "Returns a paginated list of items matching your criteria. Use pagination parameters to navigate through large result sets."
                },
                "update": {
                    "title": "Updating Items",
                    "content": "The Update Item endpoint allows you to modify existing  piece data. You can update any of the item properties including number, type, name, weight, and category.",
                    "examples": [
                        {
                            "title": "Update Item Name",
                            "json": `{\n  "name": "Brick 2 x 4 Updated"\n}`
                        }
                    ],
                    "notes": "Only include fields you want to update. Fields not included will remain unchanged."
                },
                "delete": {
                    "title": "Deleting Items",
                    "content": "The Delete Item endpoint allows you to remove  pieces from the BrickBuddy system. This operation is permanent and cannot be undone.",
                    "notes": "Be cautious when using this endpoint, as it will permanently remove the item and may affect related data."
                },
                "getDetails": {
                    "title": "Get Item Details",
                    "content": "The Get Item Details endpoint provides comprehensive information about a specific  piece, including its dimensions, weight, category, and related data.",
                    "examples": [
                        {
                            "title": "Get Details by Item Number",
                            "query": "?item_number=3001"
                        }
                    ],
                    "notes": "This endpoint returns more detailed information than the standard Get Items endpoint."
                }
            },
            "Lot": {
                "create": {
                    "title": "Creating Lots",
                    "content": "The Create Lot endpoint allows you to add new combinations of items and colors to the BrickBuddy system. Each lot represents a specific item in a specific color with market pricing data.",
                    "examples": [
                        {
                            "title": "Basic Lot Creation",
                            "json": `{\n  "item_number": "3001",\n  "color_id": 5,\n  "used_avg_sold_price_us": 0.15,\n  "new_avg_sold_price_us": 0.25\n}`
                        }
                    ],
                    "notes": "Both item_number and color_id are required. Pricing fields are optional but recommended for accurate valuation."
                },
                "update": {
                    "title": "Updating Lots",
                    "content": "The Update Lot endpoint allows you to modify pricing and other data for existing  piece and color combinations.",
                    "examples": [
                        {
                            "title": "Update Lot Pricing",
                            "json": `{\n  "used_avg_sold_price_us": 0.18,\n  "new_avg_sold_price_us": 0.28\n}`
                        }
                    ],
                    "notes": "Only include fields you want to update. Fields not included will remain unchanged."
                }
            }
        };
        
        // Default documentation when specific docs aren't available
        const defaultDocs = {
            "create": {
                "title": `Creating ${resourceName}`,
                "content": `The Create ${resourceName} endpoint allows you to add new ${resourceName.toLowerCase()} records to the BrickBuddy system.`,
                "notes": "Refer to the request parameters for required fields."
            },
            "get": {
                "title": `Retrieving ${resourceName}`,
                "content": `The Get ${resourceName} endpoint allows you to retrieve ${resourceName.toLowerCase()} records from the BrickBuddy system.`,
                "notes": "Returns a paginated list of results. Use pagination parameters to navigate through large result sets."
            },
            "update": {
                "title": `Updating ${resourceName}`,
                "content": `The Update ${resourceName} endpoint allows you to modify existing ${resourceName.toLowerCase()} records.`,
                "notes": "Only include fields you want to update. Fields not included will remain unchanged."
            },
            "delete": {
                "title": `Deleting ${resourceName}`,
                "content": `The Delete ${resourceName} endpoint allows you to remove ${resourceName.toLowerCase()} records from the BrickBuddy system.`,
                "notes": "This operation is permanent and cannot be undone."
            }
        };
        
        return docs[resourceName] && docs[resourceName][action] 
            ? docs[resourceName][action] 
            : defaultDocs[action] || null;
    };

    return (
        <div className="container mx-auto p-6 max-w-6xl">
            <div className="bg-white rounded-lg overflow-hidden shadow-lg border border-gray-200 mb-8">
                {/* Combined header and info section */}
                <div className="header-gradient p-8">
                    <h1 className="text-3xl font-bold text-white mb-2">BrickBuddy API Documentation</h1>
                    <p className="text-blue-100 mb-4">Complete reference and interactive playground for the BrickBuddy API</p>
                
                    {/* Getting Started section */}
                    <div className="bg-blue-700 bg-opacity-30 border border-blue-400 border-opacity-30 p-6 rounded-lg shadow-sm mt-6 mb-8">
                        <div className="flex items-start">
                            <div className="mr-4 mt-1 text-white">
                                <FaBook className="text-white text-2xl" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-white mb-2">Getting Started</h2>
                                <p className="text-white mb-3">
                                    The BrickBuddy API provides comprehensive endpoints for managing  inventories, including items, lots, colors, sets, and more.
                                    Browse the documentation below to learn about each endpoint, then try them out using the interactive interface.
                                </p>
                                <div className="bg-blue-600 bg-opacity-20 border border-blue-400 border-opacity-20 p-3 rounded-lg">
                                    <p className="text-white text-sm">
                                        <strong>Note:</strong> This interactive documentation uses mock data for all API responses.
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Info boxes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="bg-blue-600 bg-opacity-20 border border-blue-400 border-opacity-20 p-4 rounded-lg flex items-start">
                                <div className="mr-3 text-white">
                                    <FaCode className="text-xl" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-white">Examples & Guides</h3>
                                    <p className="text-white text-sm">
                                        Each endpoint includes detailed examples, parameter documentation, and usage tips.
                                    </p>
                                </div>
                            </div>
                            <div className="bg-blue-600 bg-opacity-20 border border-blue-400 border-opacity-20 p-4 rounded-lg flex items-start">
                                <div className="mr-3 text-white">
                                    <FaTools className="text-xl" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-white">Interactive Testing</h3>
                                    <p className="text-white text-sm">
                                        Test API endpoints directly in your browser with our interactive interface.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Info sections - moved from below into header gradient */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-blue-600 bg-opacity-30 border border-blue-400 border-opacity-30 p-6 rounded-lg">
                            <div className="flex items-start">
                                <div className="mr-4 text-white">
                                    <FaLink className="text-2xl" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-white mb-2">Base URL</h3>
                                    <p className="mb-2 text-blue-100">All API requests should be made to:</p>
                                    <div className="bg-blue-800 bg-opacity-50 text-green-300 p-3 rounded font-mono text-sm border border-blue-400 border-opacity-30">
                                        https://api.brickbuddy.com/v1
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-blue-600 bg-opacity-30 border border-blue-400 border-opacity-30 p-6 rounded-lg">
                            <div className="flex items-start">
                                <div className="mr-4 text-white">
                                    <FaClock className="text-2xl" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-white mb-2">Rate Limits</h3>
                                    <p className="text-blue-100">Standard accounts: 60 requests per minute</p>
                                    <p className="text-blue-100">Premium accounts: 300 requests per minute</p>
                                    <p className="mt-2 text-sm text-blue-100">Exceeded limits return 429 Too Many Requests</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* API Reference Sections */}
                <div className="p-6 bg-gray-50">
                    <div className="space-y-6">
                        {renderTestGroups()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApiTesting; 