import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateSquareIcon() {
  const inputPath = path.join(__dirname, '../public/logo.webp');
  const outputPath192 = path.join(__dirname, '../public/icon-192.webp');
  const outputPath512 = path.join(__dirname, '../public/icon-512.webp');

  console.log('Generando iconos cuadrados...');

  try {
    // Generar 512x512
    await sharp(inputPath)
      .resize({
        width: 512,
        height: 512,
        fit: 'contain',
        background: { r: 18, g: 18, b: 18, alpha: 1 } // #121212
      })
      .toFile(outputPath512);

    // Generar 192x192
    await sharp(inputPath)
      .resize({
        width: 192,
        height: 192,
        fit: 'contain',
        background: { r: 18, g: 18, b: 18, alpha: 1 } // #121212
      })
      .toFile(outputPath192);

    console.log('Iconos generados exitosamente.');
  } catch (err) {
    console.error('Error generando iconos:', err);
  }
}

generateSquareIcon();
