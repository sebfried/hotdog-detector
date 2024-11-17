/**
 * Analyzes an image to detect if it contains a hot dog using the Hugging Face Vision API.
 * @param {Request} context.request - The incoming request containing the image
 * @param {Object} context.env - Environment variables including API keys
 * @returns {Response} JSON response with classification results
 */
export async function onRequest(context) {
    try {
        // Only allow POST requests
        if (context.request.method !== 'POST') {
            return new Response('Method not allowed', {
                status: 405,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Allow': 'POST'
                }
            });
        }

        // Log request headers for debugging
        console.log('Request headers:', Object.fromEntries([...context.request.headers]));

        // Verify API key is available
        if (!context.env.HUGGINGFACE_API_KEY) {
            console.log(context.env);
            console.error('API key not found in environment');
            throw new Error('API configuration error');
        }

        // Log API key info (safely)
        const keyLength = context.env.HUGGINGFACE_API_KEY?.length || 0;
        console.log('API Key present:', keyLength > 0);
        console.log('API Key length:', keyLength);

        const imageFile = await validateAndGetImage(context.request);
        const base64Image = await processImage(imageFile);
        const predictions = await classifyImage(base64Image, context.env.HUGGINGFACE_API_KEY);
        return createSuccessResponse(predictions, imageFile.size);
    } catch (error) {
        console.error('Server error:', error.message, error.stack);
        return createErrorResponse(error);
    }
}

async function validateAndGetImage(request) {
    try {
        const formData = await request.formData();
        const imageFile = formData.get('image');

        if (!imageFile) {
            throw new Error('No image file provided');
        }

        console.log('Image details:', {
            type: imageFile.type,
            size: imageFile.size,
            name: imageFile.name
        });

        return imageFile;
    } catch (error) {
        console.error('Error in validateAndGetImage:', error);
        throw error;
    }
}

async function processImage(imageFile) {
    try {
        const imageBuffer = await imageFile.arrayBuffer();
        console.log('Buffer size:', imageBuffer.byteLength);
        const base64 = arrayBufferToBase64(imageBuffer);
        console.log('Base64 length:', base64.length);
        return base64;
    } catch (error) {
        console.error('Error in processImage:', error);
        throw error;
    }
}

async function classifyImage(base64Image, apiKey) {
    console.log('Starting API request to Hugging Face...');
    
    try {
        const apiUrl = 'https://api-inference.huggingface.co/models/google/vit-base-patch16-224';
        console.log('API URL:', apiUrl);

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: {
                    image: base64Image
                }
            })
        });

        console.log('API Response status:', response.status);
        console.log('API Response headers:', Object.fromEntries([...response.headers]));

        const responseText = await response.text();
        console.log('API Response body:', responseText.substring(0, 200) + '...');

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} - ${responseText}`);
        }

        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch (e) {
            console.error('Failed to parse API response:', e);
            throw new Error(`Invalid API response format: ${responseText.substring(0, 100)}...`);
        }

        if (!Array.isArray(responseData)) {
            console.error('Unexpected response format:', typeof responseData);
            throw new Error('Unexpected API response format - expected array');
        }

        console.log('Parsed predictions:', responseData);
        return responseData;
    } catch (error) {
        console.error('Error in classifyImage:', error.message);
        throw error;
    }
}

function createSuccessResponse(predictions, imageSize) {
    const hotdogPrediction = predictions.find(p => 
        p.label.toLowerCase().includes('hot dog') || 
        p.label.toLowerCase().includes('hotdog')
    );

    const debugInfo = {
        top3Predictions: predictions.slice(0, 3).map(p => `${p.label}: ${(p.score * 100).toFixed(1)}%`),
        imageSize: imageSize,
        timestamp: new Date().toISOString()
    };

    const response = {
        isHotDog: !!hotdogPrediction,
        confidence: hotdogPrediction ? hotdogPrediction.score : 0,
        debug: debugInfo
    };

    console.log('Sending success response:', response);

    return new Response(JSON.stringify(response), {
        headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
}

function createErrorResponse(error) {
    let userMessage = 'Error processing image. Please try again.';
    let status = 500;
    let errorCode = 'UNKNOWN_ERROR';

    if (error.message.includes('API configuration error')) {
        userMessage = 'Server configuration error. Please try again later.';
        errorCode = 'CONFIG_ERROR';
    } else if (error.message.includes('No image file provided')) {
        userMessage = 'Please select an image to analyze.';
        status = 400;
        errorCode = 'NO_IMAGE';
    } else if (error.message.includes('API request failed')) {
        userMessage = 'Error connecting to AI service. Please try again.';
        errorCode = 'API_ERROR';
    } else if (error.message.includes('Invalid API response')) {
        userMessage = 'Received invalid response from AI service. Please try again.';
        errorCode = 'INVALID_RESPONSE';
    }

    const response = {
        error: userMessage,
        code: errorCode,
        details: error.message,
        timestamp: new Date().toISOString()
    };

    console.error('Sending error response:', response);

    return new Response(JSON.stringify(response), {
        status: status,
        headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
}

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
