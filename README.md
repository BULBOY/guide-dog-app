# AI Digital Guide Dog App

A real-time navigation assistance application for visually impaired users, built with Next.js and TensorFlow. The app uses device cameras to detect objects, provides audio feedback, and offers visual framing of detected objects.

## Features

- 🎯 **Real-time Object Detection** - Identifies obstacles, people, and objects using TensorFlow.js
- 🔊 **Audio Feedback** - Announces detected objects with distance and position information
- 📱 **Mobile Optimized** - Designed for smartphones with touch-friendly interface
- 🎨 **Visual Framing** - Colour-coded frames around detected objects on camera feed
- 📹 **OBS Virtual Camera Support** - Test with pre-recorded videos or screen capture
- ♿ **Accessibility Focused** - Screen reader compatible with high contrast mode

## Prerequisites

Before running this application, ensure you have:

- Node.js 18.0.0 or higher (23.0.0 recommended)
- npm or yarn package manager
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Device with camera (smartphone, laptop, or desktop with webcam)
- HTTPS connection (required for camera access - provided by Next.js dev server)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/BULBOY/guide-dog-app.git
cd guide-dog-app
```

### 2. Install Dependencies

Using npm:
```bash
npm install
```

Using yarn:
```bash
yarn install
```

### 3. Start the Development Server

Using npm:
```bash
npm run dev
```

Using yarn:
```bash
yarn dev
```

### 4. Open in Browser

Navigate to `http://localhost:3000` in your web browser.

For mobile testing, find your computer's IP address and visit:
`http://YOUR_IP_ADDRESS:3000`

## Granting Permissions

The app requires the following permissions:

- 📷 **Camera Access**: For object detection and navigation
- 🔊 **Audio Playback**: For text-to-speech feedback

## How to Use the Application

### First Time Setup

1. **Welcome Screen**: Tap anywhere to start
2. **Permissions**: Grant camera access when prompted

### Basic Navigation

1. **Start Navigation**: Press the "Start Navigation" button
2. **Object Detection**: Point camera at your environment
3. **Audio Feedback**: Listen for object announcements
4. **Manual Description**: Press "Describe All Objects" for immediate feedback

### Settings and Controls

**Verbosity Levels:**
- **Low**: Only critical alerts
- **Medium**: Important objects and updates
- **High**: Comprehensive environment information

**Announcement Modes:**
- **All Objects**: Announces all detected objects
- **Closest Only**: Only announces the nearest object

**Visual Modes:**
- **Normal View**: Camera feed with coloured object frames

### Object Framing

Objects detected in the camera feed are automatically framed with coloured borders:

- 🔴 **Red**: Very close objects (< 1.5 meters) - Immediate attention required
- 🟠 **Orange**: Close objects (< 3 meters) - Caution advised
- 🟡 **Yellow**: Medium distance (< 5 meters) - Be aware
- 🟢 **Green**: Farther objects (> 5 meters) - No immediate concern

## Using OBS Virtual Camera

### Setup OBS Studio

1. Download and install OBS Studio
2. Add a video source (camera, media file, or screen capture)
3. Click "Start Virtual Camera" in OBS

### Connect to App

1. In the AI Guide Dog app, click "Use OBS" button
2. If OBS Virtual Camera isn't detected, click "Refresh List"
3. Select "OBS Virtual Camera" from the dropdown

### Use Cases for OBS

- **Testing**: Use pre-recorded videos to test object detection
- **Demonstrations**: Show the app using screen capture
- **Training**: Create specific scenarios for testing
- **Accessibility**: Apply filters to improve visibility

## Troubleshooting

### Common Issues

**Camera Not Working**
- If needed, select the camera twice to activate it
- Ensure browser permissions are granted
- Try refreshing the page
- Check if another application is using the camera
- Verify HTTPS connection (required for camera access)

**No Audio Feedback**
- Check device volume
- Ensure browser audio permissions
- Try different browsers (Chrome works best)

**Poor Object Detection**
- Ensure good lighting
- Keep the camera steady
- Clean camera lens
- Point the camera at recognisable objects
- Wait for models to load fully

**Performance Issues**
- Close other browser tabs
- Restart the browser
- Check available RAM
- Try a lower camera resolution

### Browser Compatibility

- **Recommended**: Chrome on Android/Desktop, Safari on iOS
- **Supported**: Firefox, Edge
- **Limited**: Older browsers may have reduced functionality

### Mobile-Specific Issues

**iOS Safari:**
- Ensure "Camera" permission is enabled in Settings > Safari
- Try adding to the home screen for better performance

**Android Chrome:**
- Grant microphone and camera permissions
- Disable battery optimisation for the browser

## Privacy and Security

- **Local Processing**: All object detection happens on your device
- **No Data Collection**: Camera feeds are not stored or transmitted
- **Offline Capable**: Works without internet after initial setup
- **Open Source**: Code is transparent and auditable

## Contributing

We welcome contributions to improve the AI Digital Guide Dog App! Please feel free to submit issues, feature requests, or pull requests.

## License

This project is open source. Please see the LICENSE file for details.

## Acknowledgments

- **TensorFlow Team** - For the machine learning framework
- **COCO Dataset** - For the object detection training data
- **Next.js Team** - For the excellent React framework
- **Accessibility Community** - For guidance and feedback
- **Beta Testers** - For valuable real-world testing
