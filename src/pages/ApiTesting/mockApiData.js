// src/pages/ApiTesting/mockApiData.js
// Mock API data store

// Helper function to generate standard success response structure
const createSuccessResponse = (data, status = 200, metaOverrides = {}) => ({
    data: data,
    success: true,
    meta: {
        http_status_code: status,
        success: { code: 'SUCCESS', message: 'Operation successful' },
        ...metaOverrides,
    },
    headers: { 'content-type': 'application/json' },
    status: status,
});

// Helper function to generate standard error response structure
const createErrorResponse = (status, code, message, data = [], metaOverrides = {}) => ({
    data: data,
    success: false,
    meta: {
        http_status_code: status,
        error: { code, message },
        ...metaOverrides,
    },
    headers: { 'content-type': 'application/json' },
    status: status,
});

// Mock data organized by endpoint pattern and method
const mockData = {
    '/api/items': {
        GET: (url) => {
            const urlObj = new URL(url, 'http://localhost'); // Base URL doesn't matter here
            const params = urlObj.searchParams;
            const id = params.get('id');
            const number = params.get('number');

            if (id === '999') { // Simulate not found for a specific ID
                return createErrorResponse(404, 'NOT_FOUND', 'Item with ID 999 not found');
            }

            if (id) { // Get specific item by ID
                return createSuccessResponse([{
                    id: parseInt(id, 10),
                    number: `TEST-${id}`,
                    type: 'PART',
                    name: `Test Item ${id}`,
                    weight: 1.5 * parseInt(id, 10),
                    category_id: 1,
                    bricklinkSyncedAt: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                }]);
            }

            if (number) { // Get specific item by number
                 return createSuccessResponse([{
                    id: 123,
                    number: number,
                    type: 'PART',
                    name: `Test Item ${number}`,
                    weight: 1.5,
                    category_id: 1,
                    bricklinkSyncedAt: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                }]);
            }

            // Default: Get list of items
            return createSuccessResponse([
                { id: 1, number: '3001', type: 'PART', name: 'Brick 2x4', weight: 2.5, category_id: 5, bricklinkSyncedAt: null, createdAt: "2023-01-01T10:00:00Z", updatedAt: "2023-01-01T10:00:00Z" },
                { id: 2, number: '3020', type: 'PART', name: 'Plate 2x4', weight: 1.8, category_id: 6, bricklinkSyncedAt: "2023-05-15T12:30:00Z", createdAt: "2023-01-05T11:00:00Z", updatedAt: "2023-05-15T12:30:00Z" },
                // Add more mock items if needed
            ]);
        },
        POST: (url, body) => {
            if (!body || !body.number || !body.type) {
                return createErrorResponse(400, 'VALIDATION_ERROR', 'Missing required fields: number, type');
            }
            const newItem = {
                id: Math.floor(Math.random() * 1000) + 100, // Generate random ID
                ...body,
                weight: body.weight || 0,
                category_id: body.category_id || null,
                bricklinkSyncedAt: body.bricklinkSyncedAt || null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            return createSuccessResponse([newItem], 201, { success: { code: 'ITEM_CREATED', message: 'Item created successfully'} });
        },
    },
    '/api/items/:id': { // Handles PUT and DELETE for specific items
        PUT: (url, body) => {
            const idMatch = url.match(/\/api\/items\/(\d+)/);
            if (!idMatch) return createErrorResponse(400, 'INVALID_URL', 'Invalid item URL');
            const id = parseInt(idMatch[1], 10);

             if (id === 999) { // Simulate not found
                return createErrorResponse(404, 'NOT_FOUND', `Item with ID ${id} not found`);
            }

            if (!body) {
                 return createErrorResponse(400, 'VALIDATION_ERROR', 'Missing request body');
            }

            const updatedItem = {
                id: id,
                number: body.number || `UPDATED-${id}`,
                type: body.type || 'PART',
                name: body.name || `Updated Item ${id}`,
                weight: body.weight || 2.0,
                category_id: body.category_id || 1,
                bricklinkSyncedAt: body.bricklinkSyncedAt || new Date().toISOString(),
                createdAt: "2023-01-01T10:00:00Z", // Keep original create date usually
                updatedAt: new Date().toISOString(),
            };
            return createSuccessResponse([updatedItem], 200, { success: { code: 'ITEM_UPDATED', message: 'Item updated successfully'} });
        },
        DELETE: (url) => {
             const idMatch = url.match(/\/api\/items\/(\d+)/);
            if (!idMatch) return createErrorResponse(400, 'INVALID_URL', 'Invalid item URL');
            const id = parseInt(idMatch[1], 10);

            if (id === 999) { // Simulate not found
                return createErrorResponse(404, 'NOT_FOUND', `Item with ID ${id} not found`);
            }

            return createSuccessResponse([], 200, { success: { code: 'ITEM_DELETED', message: 'Item deleted successfully'} });
        }
    },
    '/api/items/details': {
        GET: (url) => {
             const urlObj = new URL(url, 'http://localhost');
             const itemNumber = urlObj.searchParams.get('item_number');
             if (!itemNumber) {
                 return createErrorResponse(400, 'MISSING_PARAMETER', 'Missing required query parameter: item_number');
             }
             if (itemNumber === 'INVALID') {
                 return createErrorResponse(404, 'NOT_FOUND', `Details for item number ${itemNumber} not found`);
             }
             return createSuccessResponse([{
                 item_number: itemNumber,
                 description: `Detailed description for ${itemNumber}`,
                 dimensions: '2x4 studs',
                 release_year: 2022,
                 colors_available: [1, 4, 15] // Example color IDs
             }]);
        }
    },
    // Add mock data for Piece Destinations endpoint
    '/api/piece-destinations': {
        GET: (url) => {
            const urlObj = new URL(url, 'http://localhost');
            const lotId = urlObj.searchParams.get('lot_id');
            
            if (!lotId) {
                return createErrorResponse(400, 'MISSING_PARAMETER', 'Missing required query parameter: lot_id');
            }
            
            // Mock data for piece destinations, based on the implementation in pieceDestinationRoutes.js
            const mockDestinations = {
                set_destinations: [
                    {
                        name: "Demo Set 1",
                        number: "75300-1",
                        user_set_item_id: 101,
                        qty_have: 5,
                        user_inventory_item_location_name: "Set Bin A",
                        qty_to_allocate: 2
                    },
                    {
                        name: "Demo Set 2",
                        number: "10281-1",
                        user_set_item_id: 105,
                        qty_have: 1,
                        user_inventory_item_location_name: "Set Bin B",
                        qty_to_allocate: 1
                    }
                ],
                part_destinations: [
                    {
                        recommended: true,
                        qty_on_hand: 0,
                        user_inventory_item_location_id: 201,
                        user_inventory_item_location_name: "Parts Drawer 5",
                        container_available_weight: 50.5
                    },
                    {
                        recommended: false,
                        qty_on_hand: 10,
                        user_inventory_item_location_id: 210,
                        user_inventory_item_location_name: "Bulk Parts Tub",
                        container_available_weight: 1000.0
                    }
                ]
            };
            
            // Create response with appropriate success message
            return createSuccessResponse(mockDestinations, 200, { 
                success: { 
                    code: 'RETRIEVED', 
                    message: 'Piece destinations retrieved successfully (Demo)'
                }
            });
        }
    },
    // Add camelCase version of the same endpoint
    '/api/pieceDestinations': {
        GET: (url) => {
            const urlObj = new URL(url, 'http://localhost');
            const lotId = urlObj.searchParams.get('lot_id');
            
            if (!lotId) {
                return createErrorResponse(400, 'MISSING_PARAMETER', 'Missing required query parameter: lot_id');
            }
            
            // Mock data for piece destinations, based on the implementation in pieceDestinationRoutes.js
            const mockDestinations = {
                set_destinations: [
                    {
                        name: "Demo Set 1",
                        number: "75300-1",
                        user_set_item_id: 101,
                        qty_have: 5,
                        user_inventory_item_location_name: "Set Bin A",
                        qty_to_allocate: 2
                    },
                    {
                        name: "Demo Set 2",
                        number: "10281-1",
                        user_set_item_id: 105,
                        qty_have: 1,
                        user_inventory_item_location_name: "Set Bin B",
                        qty_to_allocate: 1
                    }
                ],
                part_destinations: [
                    {
                        recommended: true,
                        qty_on_hand: 0,
                        user_inventory_item_location_id: 201,
                        user_inventory_item_location_name: "Parts Drawer 5",
                        container_available_weight: 50.5
                    },
                    {
                        recommended: false,
                        qty_on_hand: 10,
                        user_inventory_item_location_id: 210,
                        user_inventory_item_location_name: "Bulk Parts Tub",
                        container_available_weight: 1000.0
                    }
                ]
            };
            
            // Create response with appropriate success message
            return createSuccessResponse(mockDestinations, 200, { 
                success: { 
                    code: 'RETRIEVED', 
                    message: 'Piece destinations retrieved successfully (Demo)'
                }
            });
        }
    },
    // Mock OpenAPI tests endpoint
    '/api/openapi-tests': {
        GET: () => {
            // Sample OpenAPI test configuration
            const openApiTests = {
                "Item": {
                    "get": {
                        "verb": "GET",
                        "endpoint": "/api/items",
                        "description": "Get a list of items",
                        "parameters": {
                            "query": {
                                "id": {
                                    "type": "number",
                                    "required": false,
                                    "description": "Filter by item ID"
                                },
                                "number": {
                                    "type": "string",
                                    "required": false,
                                    "description": "Filter by item number"
                                }
                            }
                        }
                    },
                    "create": {
                        "verb": "POST",
                        "endpoint": "/api/items",
                        "description": "Create a new item",
                        "parameters": {
                            "body": {
                                "number": {
                                    "type": "string",
                                    "required": true,
                                    "description": "The item number"
                                },
                                "type": {
                                    "type": "string",
                                    "required": true,
                                    "description": "The item type",
                                    "options": ["PART", "SET", "MINIFIG"]
                                },
                                "name": {
                                    "type": "string",
                                    "required": false,
                                    "description": "The item name"
                                },
                                "weight": {
                                    "type": "number",
                                    "required": false,
                                    "description": "The item weight in grams"
                                }
                            }
                        }
                    },
                    "update": {
                        "verb": "PUT",
                        "endpoint": "/api/items/{id}",
                        "description": "Update an existing item",
                        "parameters": {
                            "path": {
                                "id": {
                                    "type": "number",
                                    "required": true,
                                    "description": "The item ID"
                                }
                            },
                            "body": {
                                "number": {
                                    "type": "string",
                                    "required": false,
                                    "description": "The item number"
                                },
                                "type": {
                                    "type": "string",
                                    "required": false,
                                    "description": "The item type",
                                    "options": ["PART", "SET", "MINIFIG"]
                                },
                                "name": {
                                    "type": "string",
                                    "required": false,
                                    "description": "The item name"
                                },
                                "weight": {
                                    "type": "number",
                                    "required": false,
                                    "description": "The item weight in grams"
                                }
                            }
                        }
                    },
                    "delete": {
                        "verb": "DELETE",
                        "endpoint": "/api/items/{id}",
                        "description": "Delete an item",
                        "parameters": {
                            "path": {
                                "id": {
                                    "type": "number",
                                    "required": true,
                                    "description": "The item ID"
                                }
                            }
                        }
                    }
                },
                "Piece Destinations": {
                    "get": {
                        "verb": "GET",
                        "endpoint": "/api/pieceDestinations",
                        "description": "Get destinations for pieces",
                        "parameters": {
                            "query": {
                                "lot_id": {
                                    "type": "number",
                                    "required": true,
                                    "description": "The lot ID to find destinations for"
                                }
                            }
                        }
                    }
                }
                // Add more API resources as needed
            };
            
            return createSuccessResponse(openApiTests);
        }
    }
    // Add mock data for other endpoints (Lots, Users, Batches, etc.) here
    // following the same pattern: '/api/endpoint/path': { METHOD: (url, body) => { ... } }
};

// Function to find and execute the appropriate mock handler
export const getMockResponse = async (url, method, body) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));

    const urlPath = new URL(url, 'http://localhost').pathname; // Extract path without query params

    // Find a matching handler
    // Check for exact path matches first
    let handler = mockData[urlPath]?.[method.toUpperCase()];

    // If no exact match, check for patterns (like /api/items/:id)
    if (!handler) {
        const patternMatcher = Object.keys(mockData).find(pattern => {
            const regex = new RegExp(`^${pattern.replace(/(:[^/]+)/g, '([^/]+)')}$`);
            return regex.test(urlPath) && mockData[pattern]?.[method.toUpperCase()];
        });
        if (patternMatcher) {
            handler = mockData[patternMatcher]?.[method.toUpperCase()];
        }
    }

    if (handler) {
        try {
            // Need to parse body if it's a stringified JSON
            const parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
            return handler(url, parsedBody);
        } catch (e) {
             console.error("Error parsing body in mock handler:", e);
             return createErrorResponse(400, 'INVALID_BODY', 'Invalid JSON in request body');
        }
    }

    // If no handler is found, return a generic 404
    return createErrorResponse(404, 'MOCK_NOT_FOUND', `No mock handler found for ${method} ${urlPath}`);
};

// Example usage (for testing the mock data structure itself):
// getMockResponse('/api/items?id=123', 'GET').then(console.log);
// getMockResponse('/api/items', 'POST', JSON.stringify({ number: '9999', type: 'SET' })).then(console.log);
// getMockResponse('/api/items/50', 'PUT', JSON.stringify({ name: 'Updated 50' })).then(console.log);
// getMockResponse('/api/items/50', 'DELETE').then(console.log);
// getMockResponse('/api/items/details?item_number=3003', 'GET').then(console.log);
// getMockResponse('/api/nonexistent', 'GET').then(console.log); 