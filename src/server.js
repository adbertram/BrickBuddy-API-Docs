const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const yaml = require('js-yaml');
const fs = require('fs');
require('dotenv').config();

// Import the actual router
const pieceDestinationRoutes = require('./routes/pieceDestinationRoutes');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Add custom response handlers (simplified)
app.use((req, res, next) => {
    res.success = (data, code = 'SUCCESS', message = 'Operation successful') => {
        res.json({
            success: true,
            data: data,
            meta: {
                success: {
                    code: code,
                    message: message
                }
            }
        });
    };
    res.error = (message = 'An error occurred', statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details = null) => {
        res.status(statusCode).json({
            success: false,
            meta: {
                error: {
                    code: code,
                    message: message,
                    ...(details && { details: details }) // Include details if provided
                }
            }
        });
    };
    next();
});

// Mount the router
app.use('/api/piece-destinations', pieceDestinationRoutes); // Using kebab-case path

// Endpoint to serve OpenAPI test configurations
app.get('/api/openapi-tests', (req, res) => {
    try {
        const openapiDir = path.join(__dirname, '..', 'openapi');
        
        // Check if the openapi directory exists
        if (!fs.existsSync(openapiDir)) {
            return res.success({}, 'NO_OPENAPI_DIR', 'No OpenAPI directory found');
        }
        
        // Get all YAML files in the openapi directory
        const files = fs.readdirSync(openapiDir);
        const yamlFiles = files.filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));
        
        if (yamlFiles.length === 0) {
            return res.success({}, 'NO_YAML_FILES', 'No YAML files found in OpenAPI directory');
        }
        
        // Parse each YAML file and combine the results
        let combinedConfig = {};
        
        yamlFiles.forEach(file => {
            try {
                const filePath = path.join(openapiDir, file);
                const fileContent = fs.readFileSync(filePath, 'utf8');
                const openApiSpec = yaml.load(fileContent);
                
                // Extract the API name from the info section or filename
                const apiName = openApiSpec.info?.title?.replace(' API', '') || 
                    path.basename(file, path.extname(file));
                
                const testConfig = {};
                
                // Create an entry for this API in the test configuration
                testConfig[apiName] = {};
                
                // Process each path in the OpenAPI spec
                Object.entries(openApiSpec.paths || {}).forEach(([pathUrl, pathItem]) => {
                    // Process each HTTP method for this path
                    Object.entries(pathItem).forEach(([method, operation]) => {
                        // Skip non-HTTP methods like parameters, etc.
                        if (!['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
                            return;
                        }
                        
                        // Create configuration for this endpoint
                        const verbConfig = {
                            verb: method.toUpperCase(),
                            endpoint: pathUrl,
                            parameters: {}
                        };
                        
                        // Add description if available
                        if (operation.description) {
                            verbConfig.description = operation.description;
                        }
                        
                        // Process parameters
                        if (operation.parameters) {
                            // Group parameters by location (query, path, etc)
                            operation.parameters.forEach(param => {
                                const location = param.in; // 'query', 'path', etc.
                                
                                // Initialize the parameter group if it doesn't exist yet
                                if (!verbConfig.parameters[location]) {
                                    verbConfig.parameters[location] = {};
                                }
                                
                                // Create parameter configuration
                                const paramConfig = {
                                    type: mapOpenApiTypeToTestType(param.schema?.type || 'string'),
                                    required: !!param.required,
                                    description: param.description || ''
                                };
                                
                                // Add enum options if available
                                const options = extractEnumOptions(param.schema || {});
                                if (options) {
                                    paramConfig.options = options;
                                }
                                
                                // Add the parameter to its location group
                                verbConfig.parameters[location][param.name] = paramConfig;
                            });
                        }
                        
                        // Process request body if available
                        if (operation.requestBody) {
                            const contentType = operation.requestBody.content['application/json'];
                            
                            if (contentType && contentType.schema) {
                                verbConfig.parameters.body = {};
                                const schema = contentType.schema;
                                
                                // Handle properties in the schema
                                if (schema.properties) {
                                    Object.entries(schema.properties).forEach(([propName, propSchema]) => {
                                        const paramConfig = {
                                            type: mapOpenApiTypeToTestType(propSchema.type || 'string'),
                                            required: schema.required?.includes(propName) || false,
                                            description: propSchema.description || ''
                                        };
                                        
                                        // Add enum options if available
                                        const options = extractEnumOptions(propSchema);
                                        if (options) {
                                            paramConfig.options = options;
                                        }
                                        
                                        // For array properties with items that have an enum
                                        if (propSchema.type === 'array' && propSchema.items?.enum) {
                                            paramConfig.options = propSchema.items.enum;
                                            paramConfig.multiple_select = true;
                                        }
                                        
                                        verbConfig.parameters.body[propName] = paramConfig;
                                    });
                                }
                                
                                // Handle array type request bodies
                                if (schema.type === 'array' && schema.items) {
                                    verbConfig.parameters.body = [{}];
                                    if (schema.items.properties) {
                                        Object.entries(schema.items.properties).forEach(([propName, propSchema]) => {
                                            const paramConfig = {
                                                type: mapOpenApiTypeToTestType(propSchema.type || 'string'),
                                                required: schema.items.required?.includes(propName) || false,
                                                description: propSchema.description || ''
                                            };
                                            
                                            // Add enum options if available
                                            const options = extractEnumOptions(propSchema);
                                            if (options) {
                                                paramConfig.options = options;
                                            }
                                            
                                            verbConfig.parameters.body[0][propName] = paramConfig;
                                        });
                                    }
                                }
                            }
                        }
                        
                        // Add the endpoint configuration to the API
                        const httpMethod = method.toLowerCase();
                        testConfig[apiName][httpMethod] = verbConfig;
                    });
                });
                
                // Add this file's configuration to the combined configuration
                combinedConfig = { ...combinedConfig, ...testConfig };
            } catch (error) {
                console.error(`Error parsing OpenAPI spec ${file}:`, error);
            }
        });
        
        res.success(combinedConfig);
    } catch (error) {
        console.error('Error processing OpenAPI tests:', error);
        res.error('Error processing OpenAPI tests', 500);
    }
});

// Helper function to convert OpenAPI types to test config types
function mapOpenApiTypeToTestType(openApiType) {
    switch (openApiType) {
        case 'integer':
        case 'number':
            return 'number';
        case 'array':
            return 'array';
        case 'boolean':
            return 'boolean';
        case 'string':
        default:
            return 'string';
    }
}

// Helper function to extract enum values
function extractEnumOptions(schema) {
    if (schema.enum) {
        return schema.enum;
    }
    return null;
}

// Serve static assets
app.use(express.static(path.join(__dirname, '..', 'public')));

// A "catch-all" handler for any request that doesn't match the ones above
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Simplified Basic Error Handler
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err); // Log the error
    // Generic fallback using standard Error properties
    // Use err.statusCode if available (e.g., from http-errors), otherwise default to 500
    const statusCode = err.statusCode || 500;
    res.error(err.message || 'Internal Server Error', statusCode);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
