export async function onRequest(context) {
    console.log('Wake endpoint called, attempting to wake up Hugging Face API...');
    try {
        // Just check if the model is loaded
        const response = await fetch("https://api-inference.huggingface.co/models/google/vit-base-patch16-224", {
            headers: {
                "Authorization": `Bearer ${context.env.HUGGINGFACE_API_KEY}`,
                "Content-Type": "application/json"
            },
            method: "GET"
        });

        console.log('Wake-up call response status:', response.status);
        const responseText = await response.text();
        console.log('Wake-up call response:', responseText);
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error('Failed to parse response:', e);
            data = { text: responseText };
        }
        
        return new Response(JSON.stringify({ status: 'API check completed', response: data }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Wake-up call failed:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
