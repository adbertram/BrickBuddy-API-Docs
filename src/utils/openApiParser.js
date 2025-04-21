/**
 * OpenAPI Parser
 * Utility functions to parse OpenAPI specifications and convert them to test configurations
 */

/**
 * Converts an OpenAPI parameter type to the test config parameter type
 * @param {string} openApiType - The OpenAPI type (string, integer, etc)
 * @returns {string} - The test config type (string, number, etc)
 */
const mapOpenApiTypeToTestType = (openApiType) => {
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
};

/**
 * Extract enum values from an OpenAPI schema property
 * @param {Object} schema - The schema object containing enum values
 * @returns {Array|null} - Array of options or null if no enum
 */
const extractEnumOptions = (schema) => {
  if (schema.enum) {
    return schema.enum;
  }
  return null;
};

/**
 * Parse an OpenAPI specification file and convert it to the test configuration format
 * This is just a reference for the server-side implementation
 * Client-side code should use the /api/openapi-tests endpoint
 */
export const parseOpenApiSpec = (openApiSpec) => {
  try {
    // Extract the API name from the info section
    const apiName = openApiSpec.info?.title?.replace(' API', '') || 'Unnamed API';
    
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
    
    return testConfig;
  } catch (error) {
    console.error('Error parsing OpenAPI specification:', error);
    return null;
  }
};

/**
 * Fetch OpenAPI test configurations from the server
 * @returns {Promise<Object>} - Promise that resolves to the test configurations
 */
export const fetchOpenApiTests = async () => {
  try {
    const response = await fetch('/api/openapi-tests');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.data || {};
  } catch (error) {
    console.error('Error fetching OpenAPI tests:', error);
    return {};
  }
}; 