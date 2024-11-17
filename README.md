# 🌭 Hotdog Detector

A web application that uses AI to determine if an image contains a Hotdog. Built with Cloudflare Pages and Hugging Face's Vision Transformer API. 

Inspired by [Jian Yang from Silicon Valley](https://www.youtube.com/watch?v=tWwCK95X6go).

## 🚀 Features

- Upload images through drag-and-drop or file selection
- Take photos directly using your device's camera
- Real-time Hotdog detection using state-of-the-art AI
- Mobile-friendly interface
- Secure API key management
- Detailed classification results

## 🛠 Technology Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Cloudflare Pages Functions
- **AI Model**: Google's Vision Transformer (ViT) via Hugging Face
- **Development**: Wrangler CLI

## 📋 Prerequisites

- Node.js (v16 or higher)
- Wrangler CLI (`npm install -g wrangler`)
- Hugging Face API key

## 🔧 Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/hotdog-detector.git
   cd hotdog-detector
   ```

2. Create a `.dev.vars` file in the project root:
   ```
   HUGGINGFACE_API_KEY=your_api_key_here
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   wrangler pages dev ./pages --local --local-protocol https --port 8790 --ip 0.0.0.0
   ```

## 🌐 Deployment

1. Login to Cloudflare:
   ```bash
   wrangler login
   ```

2. Deploy to Cloudflare Pages:
   ```bash
   wrangler pages deploy ./pages
   ```

2. Set up your API key:
   ```bash
   wrangler pages project list # Note your project name
   wrangler pages secret put HUGGINGFACE_API_KEY --project-name hotdog-detector
   # When prompted, paste your Hugging Face API key
   ```

4. Deploy again:
   ```bash
   wrangler pages deploy ./pages
   ```

## 🔒 Security

- API keys are securely stored in environment variables
- HTTPS-only communication
- Input validation and sanitization
- Error message sanitization

## 📝 API Response Format

```json
{
  "isHotDog": true,
  "confidence": 0.9982,
  "debug": {
    "top3Predictions": [
      "hotdog, Hotdog, red hot: 99.8%",
      "French loaf: 0.1%",
      "cheeseburger: 0.1%"
    ],
    "imageSize": 36595
  }
}
```

## 🛠️ Helpful Wrangler Commands

Here are some useful commands for managing your Cloudflare Pages project:

### Development
```bash
# Start local development server
wrangler pages dev ./pages --local --local-protocol https --port 8790 --ip 0.0.0.0

# Kill all running wrangler processes
pkill -f wrangler

# View deployment logs
wrangler pages deployment tail
```

### Secrets Management
```bash
# List all secrets
wrangler pages secret list --project-name hotdog-detector

# Add a secret
wrangler pages secret put HUGGINGFACE_API_KEY --project-name hotdog-detector

# Delete a secret
wrangler pages secret delete HUGGINGFACE_API_KEY --project-name hotdog-detector
```

### Deployment
```bash
# Deploy to production
wrangler pages deploy ./pages

# List all deployments
wrangler pages deployment list --project-name hotdog-detector
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Hugging Face](https://huggingface.co/) for their amazing AI models
- [Cloudflare](https://www.cloudflare.com/) for their serverless platform
- [Google](https://github.com/google-research/vision_transformer) for the ViT model
- [Codeium Windsurf](https://codeium.com/windsurf) for the excellent development environment
- [Anthropic Claude](https://www.anthropic.com/) for assistance in development
- All the cool people who made this project possible!# hot-dog-detector
