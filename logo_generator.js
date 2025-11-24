// generate-android-icons.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const sizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192
};

function generateIcons(sourceIconPath) {
  console.log('🎨 Generating Android icons...');
  
  for (const [folder, size] of Object.entries(sizes)) {
    const outputFile = `android/app/src/main/res/${folder}/ic_launcher.png`;
    const outputRoundFile = `android/app/src/main/res/${folder}/ic_launcher_round.png`;
    
    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(outputFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Generate square icon
      execSync(`convert "${sourceIconPath}" -resize ${size}x${size} "${outputFile}"`);
      console.log(`✅ Generated ${outputFile}`);
      
      // Generate round icon (optional)
      execSync(`convert "${sourceIconPath}" -resize ${size}x${size} -alpha set \\( +clone -threshold -1 -draw "circle %[fx:w/2],%[fx:h/2] %[fx:w/2],0" \\) -compose copy_opacity -composite "${outputRoundFile}"`);
      console.log(`✅ Generated ${outputRoundFile}`);
      
    } catch (error) {
      console.log(`⚠️  Could not generate ${folder} icons automatically`);
      console.log(`📋 Manual: Create ${size}x${size} PNG and save as ${outputFile}`);
    }
  }
}

// Usage: node generate-android-icons.js path/to/your/icon.png
const sourceIcon = process.argv[2] || './assets/icon.png';
generateIcons(sourceIcon);