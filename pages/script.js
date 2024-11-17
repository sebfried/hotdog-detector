document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const previewContainer = document.getElementById('preview-container');
    const previewImage = document.getElementById('preview-image');
    const analyzeBtn = document.getElementById('analyze-btn');
    const resultDiv = document.getElementById('result');
    const resultText = document.getElementById('result-text');
    const tryAgainBtn = document.getElementById('try-again-btn');
    const loadingDiv = document.getElementById('loading');
    const loadingText = document.getElementById('loading-text');

    const cameraBtn = document.getElementById('camera-btn');
    const cameraContainer = document.getElementById('camera-container');
    const cameraPreview = document.getElementById('camera-preview');
    const captureBtn = document.getElementById('capture-btn');
    const switchCameraBtn = document.getElementById('switch-camera-btn');
    const cancelCameraBtn = document.getElementById('cancel-camera-btn');

    const MAX_IMAGE_SIZE = 1024; // Maximum dimension in pixels
    const JPEG_QUALITY = 0.8;   // JPEG quality (0.0 to 1.0)

    let stream = null;
    let facingMode = 'environment'; // Start with back camera

    // Function to show loading with custom text
    function showLoading(text) {
        loadingText.textContent = text;
        loadingDiv.classList.remove('hidden');
    }

    // Function to scroll to bottom smoothly
    function scrollToBottom() {
        window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth'
        });
    }

    // Function to retry failed requests
    async function fetchWithRetry(url, options, maxRetries = 5, delay = 1000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(url, options);
                
                // If it's not a server error, return immediately
                if (response.status !== 500 && response.status !== 503 && response.status !== 504) {
                    return response;
                }
                
                // If it's the last attempt, throw the error
                if (attempt === maxRetries) {
                    throw new Error(`Server error after ${maxRetries} attempts`);
                }
                
                // Exponential backoff with jitter
                const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 1000, 10000);
                console.log(`Retrying request after ${Math.round(backoffDelay)}ms, attempt ${attempt + 1} of ${maxRetries}...`);
                await new Promise(resolve => setTimeout(resolve, backoffDelay));
                
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }
                const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 1000, 10000);
                console.log(`Retrying after error: ${error.message}, waiting ${Math.round(backoffDelay)}ms, attempt ${attempt + 1} of ${maxRetries}...`);
                await new Promise(resolve => setTimeout(resolve, backoffDelay));
            }
        }
    }

    // Wake up the API
    async function wakeUpAPI() {
        try {
            const response = await fetchWithRetry('/api/wake', {
                method: 'POST'
            });
            if (!response.ok) {
                console.log('API wake-up call failed, but continuing anyway');
            }
        } catch (error) {
            console.log('API wake-up call failed, but continuing anyway:', error);
        }
    }

    // Handle drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        dropZone.style.borderColor = '#ff4b4b';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = '#ccc';
    });

    dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#ccc';
        
        try {
            // Handle files dropped from desktop
            if (e.dataTransfer.files.length > 0) {
                handleFile(e.dataTransfer.files[0]);
                return;
            }

            // Handle images dragged from other tabs
            const items = Array.from(e.dataTransfer.items);
            for (const item of items) {
                // Handle direct image drops
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) {
                        handleFile(file);
                        return;
                    }
                }

                // Handle image URLs
                if (item.type === 'text/uri-list' || item.type === 'text/plain') {
                    const text = await new Promise((resolve) => {
                        item.getAsString((s) => resolve(s));
                    });

                    const url = text.split('\n')[0].trim();
                    if (url.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)) {
                        await handleImageUrl(url);
                        return;
                    }
                }
            }
        } catch (error) {
            console.error('Drop handling error:', error);
            alert('Could not process the dragged content. Please try dragging the image directly or downloading it first.');
        }
    });

    // Handle click to upload
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        handleFile(e.target.files[0]);
    });

    // Process image before upload
    async function processImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Create canvas for image processing
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Calculate new dimensions if image is too large
                    if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
                        if (width > height) {
                            height = Math.round(height * (MAX_IMAGE_SIZE / width));
                            width = MAX_IMAGE_SIZE;
                        } else {
                            width = Math.round(width * (MAX_IMAGE_SIZE / height));
                            height = MAX_IMAGE_SIZE;
                        }
                    }

                    // Set canvas dimensions and draw image
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to base64 first to ensure proper data format
                    const base64Data = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
                    
                    // Convert base64 to blob
                    fetch(base64Data)
                        .then(res => res.blob())
                        .then(blob => resolve(blob))
                        .catch(error => reject(error));
                };
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }

    // Handle file selection
    async function handleFile(file) {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file (JPEG, PNG, etc.)');
            return;
        }

        try {
            // Process the image
            const processedBlob = await processImage(file);
            
            // Update preview with processed image
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImage.src = e.target.result;
                dropZone.classList.add('hidden');
                previewContainer.classList.remove('hidden');
            };
            reader.readAsDataURL(processedBlob);
            
            // Store the processed blob for later use
            previewImage.processedBlob = processedBlob;
        } catch (error) {
            alert('Error processing image: ' + error.message);
        }
    }

    // Handle image URLs
    async function handleImageUrl(url) {
        try {
            showLoading('Loading...');
            
            // Clean and decode the URL
            const cleanUrl = decodeURIComponent(url.trim())
                .replace(/^https?:\/\/\/?/i, 'https://')
                .replace(/[\u200B-\u200D\uFEFF]/g, '');

            const response = await fetch(cleanUrl);
            if (!response.ok) throw new Error('Failed to fetch image');
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.startsWith('image/')) {
                throw new Error('URL does not point to an image');
            }

            const blob = await response.blob();
            const file = new File([blob], 'image.' + contentType.split('/')[1], { type: contentType });
            await handleFile(file);
        } catch (error) {
            console.error('Error loading image:', error);
            alert('Error loading image: ' + error.message);
        } finally {
            loadingDiv.classList.add('hidden');
        }
    }

    // Camera functionality
    cameraBtn.addEventListener('click', async () => {
        try {
            // Reset any previous results
            resultDiv.classList.add('hidden');
            previewContainer.classList.add('hidden');
            
            // Show loading while initializing camera
            showLoading('Loading...');
            
            // Keep camera container hidden until camera is ready
            cameraContainer.classList.add('hidden');
            const cameraControls = document.querySelector('.camera-controls');
            cameraControls.classList.add('hidden');

            // Check if mediaDevices API is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera API is not supported in your browser');
            }

            // Check for HTTPS (required for iOS)
            if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
                const warningMsg = 'Camera access requires HTTPS. Click OK to continue anyway, but it might not work on all devices.';
                if (!confirm(warningMsg)) {
                    throw new Error('Camera access cancelled due to HTTPS requirement');
                }
            }

            await startCamera();
            
            // Show camera container and controls once camera is ready
            cameraContainer.classList.remove('hidden');
            cameraControls.classList.remove('hidden');
            loadingDiv.classList.add('hidden');
            scrollToBottom();
        } catch (error) {
            console.error('Camera error:', error);
            alert('Error accessing camera: ' + error.message);
            loadingDiv.classList.add('hidden');
            cameraContainer.classList.add('hidden');
            dropZone.classList.remove('hidden');
        }
    });

    async function startCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        const constraints = {
            video: {
                facingMode: facingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        };

        try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            cameraPreview.srcObject = stream;
            await new Promise((resolve) => {
                cameraPreview.onloadedmetadata = () => {
                    cameraPreview.play().then(resolve);
                };
            });
        } catch (error) {
            throw new Error('Failed to start camera: ' + error.message);
        }
    }

    switchCameraBtn.addEventListener('click', async () => {
        try {
            const cameraControls = document.querySelector('.camera-controls');
            cameraControls.classList.add('hidden');
            cameraContainer.classList.add('hidden');
            showLoading('Switching camera...');
            
            facingMode = facingMode === 'environment' ? 'user' : 'environment';
            await startCamera();
            
            loadingDiv.classList.add('hidden');
            cameraContainer.classList.remove('hidden');
            cameraControls.classList.remove('hidden');
            scrollToBottom();
        } catch (error) {
            console.error('Camera switch error:', error);
            alert('Error switching camera: ' + error.message);
            loadingDiv.classList.add('hidden');
        }
    });

    cancelCameraBtn.addEventListener('click', () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        cameraContainer.classList.add('hidden');
        cameraPreview.classList.add('hidden');
        dropZone.classList.remove('hidden');
        loadingDiv.classList.add('hidden');
    });

    // Capture photo
    captureBtn.addEventListener('click', () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Get the actual video dimensions
        const videoWidth = cameraPreview.videoWidth;
        const videoHeight = cameraPreview.videoHeight;
        
        // Handle iOS orientation
        if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
            if (window.orientation === 90 || window.orientation === -90) {
                // For landscape, set canvas dimensions to match rotated video
                canvas.width = videoHeight;
                canvas.height = videoWidth;
                
                // Move to center and rotate around the center point
                context.translate(canvas.width/2, canvas.height/2);
                context.rotate(window.orientation === 90 ? -Math.PI/2 : Math.PI/2);
                context.translate(-videoWidth/2, -videoHeight/2);
            } else {
                // For portrait, use normal dimensions
                canvas.width = videoWidth;
                canvas.height = videoHeight;
            }
        } else {
            // Non-iOS devices: use normal dimensions
            canvas.width = videoWidth;
            canvas.height = videoHeight;
        }
        
        // Draw the video frame to the canvas
        context.drawImage(cameraPreview, 0, 0, videoWidth, videoHeight);
        
        // Convert to blob and handle like a regular file upload
        canvas.toBlob(async (blob) => {
            const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
            await handleFile(file);
            
            // Clean up camera
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                stream = null;
            }
            cameraContainer.classList.add('hidden');
            
            // Scroll to show the captured image
            setTimeout(scrollToBottom, 100); // Small delay to ensure elements are rendered
        }, 'image/jpeg', JPEG_QUALITY);
    });

    // Handle analysis
    analyzeBtn.addEventListener('click', async () => {
        if (!previewImage.src || !previewImage.processedBlob) return;

        try {
            showLoading('Analyzing...');
            previewContainer.classList.add('hidden');
            resultDiv.classList.add('hidden');

            // Create FormData with processed image
            const formData = new FormData();
            
            // Ensure proper filename and type
            const imageFile = new File([previewImage.processedBlob], 'image.jpg', {
                type: 'image/jpeg',
                lastModified: new Date().getTime()
            });
            
            formData.append('image', imageFile);

            // Send to our API with retries
            const result = await fetchWithRetry('/api/analyze', {
                method: 'POST',
                body: formData
            });

            if (!result.ok) {
                throw new Error(`API request failed: ${result.status} ${result.statusText}`);
            }

            const data = await result.json();

            if (data.error) {
                throw new Error(`${data.error}${data.details ? '\n\nDetails:\n' + data.details : ''}`);
            }

            // Display result
            resultText.innerHTML = data.isHotDog
                ? `<h2>🌭 It's a Hotdog! 🌭</h2>
                   <p>Confidence: ${Math.round(data.confidence * 100)}%</p>
                   ${data.debug ? `<details>
                       <summary>Debug Info</summary>
                       <p>Top 3 predictions:</p>
                       <ul>${data.debug.top3Predictions.map(p => `<li>${p}</li>`).join('')}</ul>
                       <p>Image size: ${(data.debug.imageSize / 1024).toFixed(2)} KB</p>
                   </details>` : ''}`
                : `<h2>❌ Not a Hotdog ❌</h2>
                   <p>I'm pretty sure this is not a Hotdog.</p>
                   ${data.debug ? `<details>
                       <summary>Debug Info</summary>
                       <p>Top 3 predictions:</p>
                       <ul>${data.debug.top3Predictions.map(p => `<li>${p}</li>`).join('')}</ul>
                       <p>Image size: ${(data.debug.imageSize / 1024).toFixed(2)} KB</p>
                   </details>` : ''}`;

            loadingDiv.classList.add('hidden');
            resultDiv.classList.remove('hidden');

        } catch (error) {
            console.error('Error:', error);
            alert('Error analyzing image: ' + error.message);
            loadingDiv.classList.add('hidden');
            previewContainer.classList.remove('hidden');
        }
    });

    // Handle try again
    tryAgainBtn.addEventListener('click', () => {
        previewImage.src = '';
        previewImage.processedBlob = null;
        resultDiv.classList.add('hidden');
        dropZone.classList.remove('hidden');
        
        // Ensure camera is stopped
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
    });

    // Wake up the API when the page loads
    wakeUpAPI();
});
