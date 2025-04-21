/**
 * Makes an API request and returns the response
 */
export const makeApiRequest = async (url, method = 'GET', body = null) => {
  try {
    const headers = {
      'Content-Type': 'application/json'
    };

    const options = {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) })
    };

    const response = await fetch(url);
    const data = await response.json();

    return {
      success: data.success,
      data: data.data || [],
      meta: data.meta || {},
      status: response.status,
      headers: Object.fromEntries([...response.headers.entries()])
    };
  } catch (err) {
    console.error('API Request Error:', err);
    return {
      success: false,
      data: [],
      meta: {
        error: {
          code: 'REQUEST_ERROR',
          message: err.message || 'An error occurred'
        }
      },
      status: 500
    };
  }
}; 